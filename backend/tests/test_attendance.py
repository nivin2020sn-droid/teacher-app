"""Backend tests for the new Attendance feature.

Covers: settings GET/PATCH, daily bootstrap, status set with auto-late, time
stamps for early_leave/absent/present, mark-all-present, RBAC (admin 403,
unauthenticated 401), empty-students edge case, student_order persistence."""
import os
import uuid
from datetime import date as date_cls

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://class-hub-112.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "bsn.1988"
ADMIN_PASS = "12abAB!?"


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _login(s, u, p):
    return s.post(f"{API}/auth/login", json={"username": u, "password": p})


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = _login(s, ADMIN_USER, ADMIN_PASS)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def teacher(s, admin_token):
    """Create a fresh test teacher; yield (teacher_doc, token, username).
    Cleanup cascades subjects/students/attendance on delete."""
    uname = f"TEST_att_{uuid.uuid4().hex[:6]}"
    r = s.post(
        f"{API}/teachers",
        json={"name": "TEST_att", "username": uname, "password": "pass1234", "active": True},
        headers=_h(admin_token),
    )
    assert r.status_code == 201
    t_doc = r.json()
    tok = _login(s, uname, "pass1234").json()["token"]
    yield t_doc, tok, uname
    s.delete(f"{API}/teachers/{t_doc['id']}", headers=_h(admin_token))


@pytest.fixture(scope="module")
def students(s, teacher):
    """Seed 5 students under the test teacher."""
    _t, tt, _u = teacher
    created = []
    for i in range(5):
        r = s.post(
            f"{API}/students",
            json={"name": f"TEST_طالب_{i}", "parents": []},
            headers=_h(tt),
        )
        assert r.status_code == 201
        created.append(r.json())
    return created


TODAY = date_cls.today().isoformat()


# ---------- auth / RBAC ----------
class TestAttendanceAuth:
    def test_unauthenticated_401(self, s):
        r = requests.get(f"{API}/attendance/settings")
        assert r.status_code == 401

    def test_admin_forbidden(self, s, admin_token):
        r = s.get(f"{API}/attendance/settings", headers=_h(admin_token))
        assert r.status_code == 403

    def test_admin_forbidden_get_day(self, s, admin_token):
        r = s.get(f"{API}/attendance?date={TODAY}", headers=_h(admin_token))
        assert r.status_code == 403


# ---------- settings ----------
class TestSettings:
    def test_defaults_for_new_teacher(self, s, teacher):
        _t, tt, _u = teacher
        r = s.get(f"{API}/attendance/settings", headers=_h(tt))
        assert r.status_code == 200
        d = r.json()
        assert d["day_start"] == "07:00"
        assert d["day_end"] == "13:00"
        assert d["student_order"] == []

    def test_patch_valid_hhmm(self, s, teacher):
        _t, tt, _u = teacher
        r = s.patch(
            f"{API}/attendance/settings",
            json={"day_start": "08:30", "day_end": "14:45"},
            headers=_h(tt),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["day_start"] == "08:30"
        assert d["day_end"] == "14:45"
        # GET reflects persistence
        g = s.get(f"{API}/attendance/settings", headers=_h(tt)).json()
        assert g["day_start"] == "08:30" and g["day_end"] == "14:45"

    def test_patch_invalid_format_rejected(self, s, teacher):
        _t, tt, _u = teacher
        r = s.patch(
            f"{API}/attendance/settings",
            json={"day_start": "8:30"},
            headers=_h(tt),
        )
        assert r.status_code == 422

    def test_student_order_persisted(self, s, teacher, students):
        _t, tt, _u = teacher
        order = [st["id"] for st in students][::-1]
        r = s.patch(
            f"{API}/attendance/settings",
            json={"student_order": order},
            headers=_h(tt),
        )
        assert r.status_code == 200
        assert r.json()["student_order"] == order
        # GET attendance for today also returns settings with the order
        g = s.get(f"{API}/attendance?date={TODAY}", headers=_h(tt)).json()
        assert g["settings"]["student_order"] == order


# ---------- bootstrap / get day ----------
class TestBootstrap:
    def test_empty_students_no_crash(self, s, admin_token):
        """A fresh teacher with no students returns settings + records:[]."""
        uname = f"TEST_emp_{uuid.uuid4().hex[:6]}"
        cr = s.post(
            f"{API}/teachers",
            json={"name": "emp", "username": uname, "password": "pp"},
            headers=_h(admin_token),
        )
        tid = cr.json()["id"]
        tt = _login(s, uname, "pp").json()["token"]
        try:
            r = s.get(f"{API}/attendance?date={TODAY}", headers=_h(tt))
            assert r.status_code == 200
            d = r.json()
            assert d["records"] == []
            assert "settings" in d
        finally:
            s.delete(f"{API}/teachers/{tid}", headers=_h(admin_token))

    def test_first_open_bootstraps_present(self, s, teacher, students):
        """We widen work hours to ensure 'within work hours' is true."""
        _t, tt, _u = teacher
        # ensure permissive work hours so bootstrap is allowed
        s.patch(
            f"{API}/attendance/settings",
            json={"day_start": "00:00", "day_end": "23:59"},
            headers=_h(tt),
        )
        # use a fresh historical date to guarantee no records exist
        d = f"2026-01-{(hash('boot') % 27)+1:02d}"
        r = s.get(f"{API}/attendance?date={d}", headers=_h(tt))
        assert r.status_code == 200
        recs = r.json()["records"]
        assert len(recs) == len(students)
        assert all(x["status"] == "present" for x in recs)
        assert all("_id" not in x for x in recs)
        # idempotent re-call
        r2 = s.get(f"{API}/attendance?date={d}", headers=_h(tt))
        assert len(r2.json()["records"]) == len(students)


# ---------- status mutations ----------
class TestStatusMutations:
    @pytest.fixture(autouse=True)
    def _permissive_hours(self, s, teacher):
        """Force within-work-hours so auto-late logic kicks in."""
        _t, tt, _u = teacher
        s.patch(
            f"{API}/attendance/settings",
            json={"day_start": "00:00", "day_end": "23:59"},
            headers=_h(tt),
        )

    def test_set_absent_clears_arrival(self, s, teacher, students):
        _t, tt, _u = teacher
        sid = students[0]["id"]
        r = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "absent"},
            headers=_h(tt),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "absent"
        assert d["arrival_time"] is None

    def test_absent_to_present_auto_promotes_to_late(self, s, teacher, students):
        _t, tt, _u = teacher
        sid = students[1]["id"]
        # First mark absent
        r1 = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "absent"},
            headers=_h(tt),
        )
        assert r1.json()["status"] == "absent"
        # Now flip to present — within work hours, server should make it late
        r2 = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "present"},
            headers=_h(tt),
        )
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "late", f"expected late, got {d['status']}"
        assert d["arrival_time"] is not None
        # HH:MM format
        assert len(d["arrival_time"]) == 5 and d["arrival_time"][2] == ":"

    def test_early_leave_stamps_departure(self, s, teacher, students):
        _t, tt, _u = teacher
        sid = students[2]["id"]
        r = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "early_leave"},
            headers=_h(tt),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "early_leave"
        assert d["departure_time"] is not None
        assert len(d["departure_time"]) == 5

    def test_present_pure_clears_stamps(self, s, teacher, students):
        _t, tt, _u = teacher
        sid = students[3]["id"]
        # Bootstrap baseline (present) exists from earlier GETs; set to late first
        s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "late", "arrival_time": "08:15"},
            headers=_h(tt),
        )
        # Now pure present — should wipe stamps. Note that absent->present
        # would auto-flip to late; here previous is late so flip rule
        # doesn't apply (rule only fires when prev=absent).
        r = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "present"},
            headers=_h(tt),
        )
        d = r.json()
        assert d["status"] == "present"
        assert d["arrival_time"] is None
        assert d["departure_time"] is None

    def test_preserves_excused_and_note(self, s, teacher, students):
        _t, tt, _u = teacher
        sid = students[4]["id"]
        r = s.put(
            f"{API}/attendance/{sid}?date={TODAY}",
            json={"status": "absent", "excused": True, "note": "TEST_عذر طبي"},
            headers=_h(tt),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["excused"] is True
        assert d["note"] == "TEST_عذر طبي"
        # GET round-trip preserves
        g = s.get(f"{API}/attendance?date={TODAY}", headers=_h(tt)).json()
        rec = next(x for x in g["records"] if x["student_id"] == sid)
        assert rec["excused"] is True
        assert rec["note"] == "TEST_عذر طبي"

    def test_unknown_student_404(self, s, teacher):
        _t, tt, _u = teacher
        r = s.put(
            f"{API}/attendance/nope_xxx?date={TODAY}",
            json={"status": "present"},
            headers=_h(tt),
        )
        assert r.status_code == 404

    def test_bad_date_format_422(self, s, teacher, students):
        _t, tt, _u = teacher
        r = s.put(
            f"{API}/attendance/{students[0]['id']}?date=2026/01/01",
            json={"status": "present"},
            headers=_h(tt),
        )
        assert r.status_code == 422


# ---------- mark-all-present ----------
class TestMarkAllPresent:
    def test_resets_everyone(self, s, teacher, students):
        _t, tt, _u = teacher
        # Make some non-present states first
        s.put(
            f"{API}/attendance/{students[0]['id']}?date={TODAY}",
            json={"status": "absent"},
            headers=_h(tt),
        )
        s.put(
            f"{API}/attendance/{students[1]['id']}?date={TODAY}",
            json={"status": "early_leave"},
            headers=_h(tt),
        )
        r = s.post(f"{API}/attendance/mark-all-present?date={TODAY}", headers=_h(tt))
        assert r.status_code == 200
        recs = r.json()["records"]
        assert len(recs) >= len(students)
        for rec in recs:
            assert rec["status"] == "present"
            assert rec["arrival_time"] is None
            assert rec["departure_time"] is None
