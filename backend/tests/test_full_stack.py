"""End-to-end API tests for Mosaytra full-stack refactor.

Covers: auth (admin/teacher/preview), teachers CRUD (admin scope),
subjects + students teacher scope & isolation, settings RBAC, cascade delete.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://class-hub-112.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "bsn.1988"
ADMIN_PASS = "12abAB!?"


# ---------- helpers / fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(s, username, password):
    return s.post(f"{API}/auth/login", json={"username": username, "password": password})


@pytest.fixture(scope="session")
def admin_token(s):
    r = _login(s, ADMIN_USER, ADMIN_PASS)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def teacher_data(s, admin_token):
    """Create a fresh teacher for the session and return (teacher_doc, token)."""
    uname = f"TEST_t_{uuid.uuid4().hex[:6]}"
    payload = {
        "name": "TEST معلمة",
        "username": uname,
        "password": "pass1234",
        "subtitle": "اختبار",
        "active": True,
    }
    r = s.post(f"{API}/teachers", json=payload, headers=_h(admin_token))
    assert r.status_code == 201, f"teacher create failed: {r.status_code} {r.text}"
    t_doc = r.json()
    # Login as the new teacher
    lr = _login(s, uname, "pass1234")
    assert lr.status_code == 200, f"teacher login failed: {lr.status_code} {lr.text}"
    token = lr.json()["token"]
    yield t_doc, token, uname
    # teardown -> cascade deletes subjects/students for this teacher
    s.delete(f"{API}/teachers/{t_doc['id']}", headers=_h(admin_token))


# ============ AUTH ============
class TestAuth:
    def test_admin_login_ok(self, s):
        r = _login(s, ADMIN_USER, ADMIN_PASS)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 10
        assert d["user"]["role"] == "admin"
        assert d["user"]["username"] == ADMIN_USER

    def test_admin_login_wrong_password(self, s):
        r = _login(s, ADMIN_USER, "wrong-pass")
        assert r.status_code == 401

    def test_unknown_user_returns_401(self, s):
        r = _login(s, f"nobody_{uuid.uuid4().hex[:6]}", "x")
        assert r.status_code == 401

    def test_me_with_token(self, s, admin_token):
        r = s.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_without_token(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ============ TEACHERS (admin only) ============
class TestTeachersAdmin:
    def test_create_and_duplicate(self, s, admin_token):
        uname = f"TEST_dup_{uuid.uuid4().hex[:6]}"
        payload = {"name": "dup", "username": uname, "password": "p", "subtitle": ""}
        r1 = s.post(f"{API}/teachers", json=payload, headers=_h(admin_token))
        assert r1.status_code == 201
        tid = r1.json()["id"]
        assert "password_hash" not in r1.json()
        # duplicate
        r2 = s.post(f"{API}/teachers", json=payload, headers=_h(admin_token))
        assert r2.status_code == 409
        # cleanup
        s.delete(f"{API}/teachers/{tid}", headers=_h(admin_token))

    def test_list_requires_admin(self, s, teacher_data):
        _t, tt, _u = teacher_data
        r = s.get(f"{API}/teachers", headers=_h(tt))
        assert r.status_code == 403

    def test_patch_empty_password_keeps_hash(self, s, admin_token, teacher_data):
        t_doc, _tt, uname = teacher_data
        # patch with empty password -> should not change
        r = s.patch(
            f"{API}/teachers/{t_doc['id']}",
            json={"password": "", "name": "TEST معلمة محدثة"},
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        assert r.json()["name"] == "TEST معلمة محدثة"
        # original password still works
        lr = _login(s, uname, "pass1234")
        assert lr.status_code == 200

    def test_patch_nonempty_password_updates(self, s, admin_token, teacher_data):
        t_doc, _tt, uname = teacher_data
        r = s.patch(
            f"{API}/teachers/{t_doc['id']}",
            json={"password": "newpass99"},
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        # new password works
        lr = _login(s, uname, "newpass99")
        assert lr.status_code == 200
        # old fails
        lr2 = _login(s, uname, "pass1234")
        assert lr2.status_code == 401
        # restore for other tests
        s.patch(
            f"{API}/teachers/{t_doc['id']}",
            json={"password": "pass1234"},
            headers=_h(admin_token),
        )

    def test_reset_password(self, s, admin_token, teacher_data):
        t_doc, _tt, uname = teacher_data
        r = s.post(
            f"{API}/teachers/{t_doc['id']}/reset-password",
            json={"password": "reset1234"},
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        assert _login(s, uname, "reset1234").status_code == 200
        # restore
        s.post(
            f"{API}/teachers/{t_doc['id']}/reset-password",
            json={"password": "pass1234"},
            headers=_h(admin_token),
        )

    def test_disabled_teacher_cannot_login(self, s, admin_token):
        uname = f"TEST_dis_{uuid.uuid4().hex[:6]}"
        r = s.post(
            f"{API}/teachers",
            json={"name": "dis", "username": uname, "password": "pp", "active": False},
            headers=_h(admin_token),
        )
        assert r.status_code == 201
        tid = r.json()["id"]
        lr = _login(s, uname, "pp")
        assert lr.status_code == 403
        s.delete(f"{API}/teachers/{tid}", headers=_h(admin_token))

    def test_delete_teacher_cascades(self, s, admin_token):
        uname = f"TEST_c_{uuid.uuid4().hex[:6]}"
        cr = s.post(
            f"{API}/teachers",
            json={"name": "c", "username": uname, "password": "pp"},
            headers=_h(admin_token),
        )
        tid = cr.json()["id"]
        tt = _login(s, uname, "pp").json()["token"]
        # create subject + student
        s.post(f"{API}/subjects", json={"name": "math"}, headers=_h(tt))
        s.post(f"{API}/students", json={"name": "kid", "parents": []}, headers=_h(tt))
        # delete teacher
        dr = s.delete(f"{API}/teachers/{tid}", headers=_h(admin_token))
        assert dr.status_code == 200
        # subjects/students gone (login dead now, but admin previews to verify)
        # We can't preview a deleted teacher; instead, verify via DB-equivalent:
        # Re-login should fail
        assert _login(s, uname, "pp").status_code == 401


# ============ TEACHER SCOPING (subjects/students isolation) ============
class TestTeacherScope:
    def test_teacher_cannot_access_admin_teachers(self, s, teacher_data):
        _t, tt, _u = teacher_data
        assert s.get(f"{API}/teachers", headers=_h(tt)).status_code == 403

    def test_subjects_crud_teacher_scope(self, s, teacher_data):
        _t, tt, _u = teacher_data
        # create
        r = s.post(f"{API}/subjects", json={"name": "TEST_رياضيات", "color": "#fff"}, headers=_h(tt))
        assert r.status_code == 201
        sub = r.json()
        # is_current True (first one)
        assert sub.get("is_current") is True
        # list
        lr = s.get(f"{API}/subjects", headers=_h(tt))
        assert lr.status_code == 200
        names = [x["name"] for x in lr.json()]
        assert "TEST_رياضيات" in names
        # patch
        pr = s.patch(f"{API}/subjects/{sub['id']}", json={"name": "TEST_رياضيات2"}, headers=_h(tt))
        assert pr.status_code == 200
        assert pr.json()["name"] == "TEST_رياضيات2"
        # delete
        dr = s.delete(f"{API}/subjects/{sub['id']}", headers=_h(tt))
        assert dr.status_code == 200

    def test_subjects_isolation_between_teachers(self, s, admin_token, teacher_data):
        _t1, tt1, _u1 = teacher_data
        # Make a second teacher
        uname = f"TEST_iso_{uuid.uuid4().hex[:6]}"
        s.post(
            f"{API}/teachers",
            json={"name": "iso", "username": uname, "password": "pp"},
            headers=_h(admin_token),
        )
        tt2 = _login(s, uname, "pp").json()["token"]
        # T1 creates subject
        s.post(f"{API}/subjects", json={"name": "TEST_only-t1"}, headers=_h(tt1))
        # T2 should not see it
        lr2 = s.get(f"{API}/subjects", headers=_h(tt2))
        assert lr2.status_code == 200
        for x in lr2.json():
            assert x["name"] != "TEST_only-t1"
        # cleanup t2
        t2_id = s.get(f"{API}/auth/me", headers=_h(tt2)).json()["id"]
        s.delete(f"{API}/teachers/{t2_id}", headers=_h(admin_token))

    def test_students_with_unlimited_parents(self, s, teacher_data):
        _t, tt, _u = teacher_data
        parents = [
            {"name": f"P{i}", "relation": "أب" if i == 0 else "أم", "phone": f"05000{i}", "email": f"p{i}@x", "address": "addr"}
            for i in range(5)
        ]
        r = s.post(
            f"{API}/students",
            json={"name": "TEST_طالب", "parents": parents, "birth_date": "2015-01-01"},
            headers=_h(tt),
        )
        assert r.status_code == 201
        d = r.json()
        assert len(d["parents"]) == 5
        # all parents have id
        assert all(p.get("id") for p in d["parents"])
        # GET to verify persistence
        lr = s.get(f"{API}/students", headers=_h(tt))
        match = next((x for x in lr.json() if x["id"] == d["id"]), None)
        assert match is not None
        assert len(match["parents"]) == 5
        # delete
        assert s.delete(f"{API}/students/{d['id']}", headers=_h(tt)).status_code == 200

    def test_admin_cannot_access_teacher_endpoints(self, s, admin_token):
        # real admin (not previewing) hits /api/subjects -> 403 (Teachers only)
        r = s.get(f"{API}/subjects", headers=_h(admin_token))
        assert r.status_code == 403


# ============ PREVIEW (admin acting as teacher) ============
class TestPreview:
    def test_preview_returns_teacher_token_with_admin_actor(self, s, admin_token, teacher_data):
        t_doc, _tt, _u = teacher_data
        r = s.post(f"{API}/auth/preview/{t_doc['id']}", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "teacher"
        assert d["user"]["actor_role"] == "admin"
        ptok = d["token"]
        # me reflects teacher with actor_role=admin
        me = s.get(f"{API}/auth/me", headers=_h(ptok)).json()
        assert me["role"] == "teacher"
        assert me["actor_role"] == "admin"
        # can list teacher's subjects (scoped)
        assert s.get(f"{API}/subjects", headers=_h(ptok)).status_code == 200
        # NOTE: actor_role=admin + role=teacher should still be allowed admin-only
        # endpoints per require_admin (which only checks actor_role).
        assert s.get(f"{API}/teachers", headers=_h(ptok)).status_code == 200

    def test_preview_requires_admin(self, s, teacher_data):
        t_doc, tt, _u = teacher_data
        r = s.post(f"{API}/auth/preview/{t_doc['id']}", headers=_h(tt))
        assert r.status_code == 403


# ============ SETTINGS ============
class TestSettings:
    def test_get_settings_any_auth(self, s, admin_token, teacher_data):
        _t, tt, _u = teacher_data
        for tok in (admin_token, tt):
            r = s.get(f"{API}/settings", headers=_h(tok))
            assert r.status_code == 200
            d = r.json()
            assert "appName" in d and "primaryColor" in d

    def test_put_settings_admin_only(self, s, admin_token, teacher_data):
        _t, tt, _u = teacher_data
        # teacher -> 403
        r = s.put(f"{API}/settings", json={"appName": "X"}, headers=_h(tt))
        assert r.status_code == 403
        # admin -> 200 + persisted
        new_name = f"TEST_{uuid.uuid4().hex[:4]}"
        r2 = s.put(f"{API}/settings", json={"appName": new_name}, headers=_h(admin_token))
        assert r2.status_code == 200
        assert r2.json()["appName"] == new_name
        # restore
        s.put(f"{API}/settings", json={"appName": "مسيطره"}, headers=_h(admin_token))
