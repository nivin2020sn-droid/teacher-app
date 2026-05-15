"""Tests for /api/reports/* — student profile, student attendance, class attendance.

Validates:
- Auth/RBAC (401 unauth, 403 admin, 200 teacher).
- 404 for unknown student id under teacher scope.
- Profile payload shape: student, attendance_30d (counts/smart_status/records), empty arrays for grades/assignments/behavior/activities.
- Date range filtering on /attendance.
- Class report shape: from/to (ISO strings, NOT null), totals, rows, needs_followup_count.
- Smart status thresholds: absent>=5 urgent, late>=5 watch, early_leave>=3 watch, else stable.
"""
import os
import uuid
import datetime as dt
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://class-hub-112.preview.emergentagent.com").rstrip("/")
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
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def teacher(s, admin_token):
    """Fresh teacher + 1 student. Tear down after module."""
    uname = f"TEST_rep_{uuid.uuid4().hex[:6]}"
    r = s.post(
        f"{API}/teachers",
        json={"name": "TEST_rep", "username": uname, "password": "pp1234"},
        headers=_h(admin_token),
    )
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    tok = _login(s, uname, "pp1234").json()["token"]
    # 1 student
    sr = s.post(
        f"{API}/students",
        json={"name": "TEST_طالب_تقرير", "parents": [{"name": "أب", "relation": "أب", "phone": "0500", "email": "", "address": ""}]},
        headers=_h(tok),
    )
    assert sr.status_code == 201, sr.text
    student = sr.json()
    yield {"tid": tid, "token": tok, "student": student}
    # cascade
    s.delete(f"{API}/teachers/{tid}", headers=_h(admin_token))


def _set_attendance(s, tok, sid, date_str, status, excused=False):
    """Use the attendance upsert endpoint (PUT /api/attendance/{student_id}?date=...)."""
    body = {"status": status, "excused": excused}
    r = s.put(f"{API}/attendance/{sid}", params={"date": date_str}, json=body, headers=_h(tok))
    assert r.status_code in (200, 201), f"attendance set failed: {r.status_code} {r.text}"


# ============ AUTH / RBAC ============
class TestReportsAuth:
    def test_unauth_profile_401(self, s, teacher):
        r = requests.get(f"{API}/reports/student/{teacher['student']['id']}/profile")
        assert r.status_code == 401

    def test_admin_profile_403(self, s, admin_token, teacher):
        r = s.get(f"{API}/reports/student/{teacher['student']['id']}/profile", headers=_h(admin_token))
        assert r.status_code == 403

    def test_unknown_student_404(self, s, teacher):
        r = s.get(f"{API}/reports/student/nope-id-xxx/profile", headers=_h(teacher["token"]))
        assert r.status_code == 404

    def test_class_attendance_admin_403(self, s, admin_token):
        r = s.get(f"{API}/reports/class/attendance", headers=_h(admin_token))
        assert r.status_code == 403


# ============ STUDENT PROFILE (aggregate) ============
class TestStudentProfile:
    def test_profile_payload_shape(self, s, teacher):
        r = s.get(f"{API}/reports/student/{teacher['student']['id']}/profile", headers=_h(teacher["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["student"]["id"] == teacher["student"]["id"]
        assert d["student"]["name"] == "TEST_طالب_تقرير"
        # attendance_30d block
        att = d["attendance_30d"]
        for k in ("from", "to", "counts", "smart_status", "records", "total_days", "attendance_rate"):
            assert k in att, f"missing key {k} in attendance_30d"
        for k in ("present", "absent", "late", "early_leave"):
            assert k in att["counts"]
        for k in ("key", "label", "color"):
            assert k in att["smart_status"]
        assert isinstance(att["records"], list)
        # empty modules
        assert d["grades"] == []
        assert d["assignments"] == []
        assert d["behavior"] == []
        assert d["activities"] == []


# ============ STUDENT ATTENDANCE REPORT (date-ranged) ============
class TestStudentAttendanceReport:
    def test_default_range_returns_iso_strings(self, s, teacher):
        r = s.get(f"{API}/reports/student/{teacher['student']['id']}/attendance", headers=_h(teacher["token"]))
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["from"], str) and len(d["from"]) == 10
        assert isinstance(d["to"], str) and len(d["to"]) == 10

    def test_custom_range_filters_records(self, s, teacher):
        sid = teacher["student"]["id"]
        tok = teacher["token"]
        # set 2 records, one in range and one out
        today = dt.date.today()
        in_range = (today - dt.timedelta(days=1)).isoformat()
        out_range = (today - dt.timedelta(days=60)).isoformat()
        _set_attendance(s, tok, sid, in_range, "absent")
        _set_attendance(s, tok, sid, out_range, "absent")
        frm = (today - dt.timedelta(days=7)).isoformat()
        to = today.isoformat()
        r = s.get(
            f"{API}/reports/student/{sid}/attendance",
            params={"from": frm, "to": to},
            headers=_h(tok),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["from"] == frm and d["to"] == to
        dates = [rec["date"] for rec in d["records"]]
        assert in_range in dates
        assert out_range not in dates
        # cleanup these test records by setting present? Not necessary — module teardown drops teacher.


# ============ SMART STATUS THRESHOLDS ============
class TestSmartStatus:
    def _mk_student(self, s, tok, name):
        r = s.post(f"{API}/students", json={"name": name, "parents": []}, headers=_h(tok))
        assert r.status_code == 201
        return r.json()["id"]

    def test_urgent_when_5_absences(self, s, teacher):
        sid = self._mk_student(s, teacher["token"], f"TEST_urgent_{uuid.uuid4().hex[:4]}")
        today = dt.date.today()
        for i in range(5):
            _set_attendance(s, teacher["token"], sid, (today - dt.timedelta(days=i + 1)).isoformat(), "absent")
        r = s.get(f"{API}/reports/student/{sid}/attendance", headers=_h(teacher["token"]))
        assert r.json()["smart_status"]["key"] == "urgent"

    def test_watch_when_5_lates(self, s, teacher):
        sid = self._mk_student(s, teacher["token"], f"TEST_watch_{uuid.uuid4().hex[:4]}")
        today = dt.date.today()
        for i in range(5):
            _set_attendance(s, teacher["token"], sid, (today - dt.timedelta(days=i + 1)).isoformat(), "late")
        r = s.get(f"{API}/reports/student/{sid}/attendance", headers=_h(teacher["token"]))
        assert r.json()["smart_status"]["key"] == "watch"

    def test_watch_when_3_early_leaves(self, s, teacher):
        sid = self._mk_student(s, teacher["token"], f"TEST_early_{uuid.uuid4().hex[:4]}")
        today = dt.date.today()
        for i in range(3):
            _set_attendance(s, teacher["token"], sid, (today - dt.timedelta(days=i + 1)).isoformat(), "early_leave")
        r = s.get(f"{API}/reports/student/{sid}/attendance", headers=_h(teacher["token"]))
        assert r.json()["smart_status"]["key"] == "watch"

    def test_stable_default(self, s, teacher):
        sid = self._mk_student(s, teacher["token"], f"TEST_stable_{uuid.uuid4().hex[:4]}")
        r = s.get(f"{API}/reports/student/{sid}/attendance", headers=_h(teacher["token"]))
        assert r.json()["smart_status"]["key"] == "stable"


# ============ CLASS ATTENDANCE REPORT ============
class TestClassAttendance:
    def test_shape_and_iso_dates(self, s, teacher):
        r = s.get(f"{API}/reports/class/attendance", headers=_h(teacher["token"]))
        assert r.status_code == 200
        d = r.json()
        # Critical: from/to must be ISO date strings, NOT null
        assert isinstance(d["from"], str) and len(d["from"]) == 10
        assert isinstance(d["to"], str) and len(d["to"]) == 10
        for k in ("total_students", "totals", "rows", "needs_followup_count"):
            assert k in d
        for k in ("present", "absent", "late", "early_leave"):
            assert k in d["totals"]
        # Each row carries smart_status with key/label/color
        if d["rows"]:
            row = d["rows"][0]
            for k in ("student_id", "student_name", "counts", "smart_status", "attendance_rate"):
                assert k in row
            for k in ("key", "label", "color"):
                assert k in row["smart_status"]

    def test_custom_date_range(self, s, teacher):
        frm = "2025-01-01"
        to = "2025-12-31"
        r = s.get(f"{API}/reports/class/attendance", params={"from": frm, "to": to}, headers=_h(teacher["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["from"] == frm and d["to"] == to
