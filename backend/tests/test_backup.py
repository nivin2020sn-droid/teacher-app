"""Backend tests for admin backup & restore endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://class-hub-112.preview.emergentagent.com").rstrip("/")
ADMIN = {"username": "bsn.1988", "password": "12abAB!?"}
TEACHER = {"username": "nivin", "password": "123456"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    if r.status_code != 200:
        return None
    return r.json().get("token")


@pytest.fixture(scope="module")
def admin_token():
    t = _login(ADMIN)
    assert t, "admin login failed"
    return t


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def teacher_token():
    return _login(TEACHER)


@pytest.fixture(scope="module")
def created_state(admin_headers):
    """Holds created backup ids across tests so we can verify ordering & delete."""
    return {"ids": []}


# ------- Auth guard -------
class TestAuthGuard:
    def test_unauth_list(self):
        r = requests.get(f"{BASE_URL}/api/admin/backups", timeout=20)
        assert r.status_code in (401, 403)

    def test_teacher_forbidden(self, teacher_token):
        if not teacher_token:
            pytest.skip("teacher login failed")
        h = {"Authorization": f"Bearer {teacher_token}"}
        r = requests.get(f"{BASE_URL}/api/admin/backups", headers=h, timeout=20)
        assert r.status_code == 403


# ------- Settings -------
class TestSettings:
    def test_get_default(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/backups/settings", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "backup_hour" in data
        # default 02:00 if unset; otherwise whatever has been persisted
        assert isinstance(data["backup_hour"], str)

    def test_patch_valid(self, admin_headers):
        r = requests.patch(f"{BASE_URL}/api/admin/backups/settings",
                           json={"backup_hour": "03:30"},
                           headers=admin_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["backup_hour"] == "03:30"

        # verify persistence
        g = requests.get(f"{BASE_URL}/api/admin/backups/settings", headers=admin_headers, timeout=20)
        assert g.json()["backup_hour"] == "03:30"

        # reset to default for cleanliness
        requests.patch(f"{BASE_URL}/api/admin/backups/settings",
                       json={"backup_hour": "02:00"},
                       headers=admin_headers, timeout=20)

    def test_patch_invalid(self, admin_headers):
        r = requests.patch(f"{BASE_URL}/api/admin/backups/settings",
                           json={"backup_hour": "bogus"},
                           headers=admin_headers, timeout=20)
        assert r.status_code in (400, 422)


# ------- Create / List -------
class TestCreateList:
    def test_create_manual(self, admin_headers, created_state):
        r = requests.post(f"{BASE_URL}/api/admin/backups", json={}, headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["type"] == "manual"
        assert "id" in m and "name" in m and "size_bytes" in m and "counts" in m
        assert "data" not in m, "response must NOT contain raw .data payload"
        created_state["ids"].append(m["id"])

    def test_list_excludes_data(self, admin_headers, created_state):
        r = requests.get(f"{BASE_URL}/api/admin/backups", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["max_auto"] == 365
        assert body["total"] >= 1
        assert body["last_backup_at"]
        for item in body["items"]:
            assert "data" not in item

    def test_download_includes_data_and_header(self, admin_headers, created_state):
        bid = created_state["ids"][0]
        r = requests.get(f"{BASE_URL}/api/admin/backups/{bid}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        doc = r.json()
        assert "data" in doc and isinstance(doc["data"], dict)
        # at least one well-known collection key is present
        assert any(k in doc["data"] for k in ("students", "teachers", "subjects"))


# ------- Restore -------
class TestRestore:
    def test_restore_requires_confirm(self, admin_headers, created_state):
        bid = created_state["ids"][0]
        r = requests.post(f"{BASE_URL}/api/admin/backups/{bid}/restore",
                          json={"confirm": False}, headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_restore_invalid_id(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/admin/backups/does_not_exist/restore",
                          json={"confirm": True}, headers=admin_headers, timeout=30)
        assert r.status_code == 400
        # Arabic detail present
        body = r.json()
        assert any(ord(ch) > 127 for ch in str(body.get("detail", "")))

    def test_restore_creates_safety(self, admin_headers, created_state):
        bid = created_state["ids"][0]
        r = requests.post(f"{BASE_URL}/api/admin/backups/{bid}/restore",
                          json={"confirm": True}, headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        sb = body.get("safety_backup")
        assert sb and sb["name"].startswith("before_restore_")
        created_state["ids"].append(sb["id"])


# ------- Import -------
class TestImport:
    def test_import_full_snapshot(self, admin_headers, created_state):
        # Pull a real snapshot doc then re-import it.
        bid = created_state["ids"][0]
        full = requests.get(f"{BASE_URL}/api/admin/backups/{bid}", headers=admin_headers, timeout=30).json()
        r = requests.post(f"{BASE_URL}/api/admin/backups/import",
                          json={"name": "TEST_import_full", "data": full},
                          headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["type"] == "import"
        created_state["ids"].append(m["id"])

    def test_import_malformed(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/admin/backups/import",
                          json={"name": "bad", "data": {"foo": "bar"}},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 400


# ------- Log -------
class TestLog:
    def test_log_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/backups/log", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json().get("items", [])
        assert isinstance(items, list)
        if items:
            e = items[0]
            for k in ("op", "status", "created_at"):
                assert k in e
            assert e["op"] in ("backup", "restore", "delete", "import")


# ------- Delete (must run last) -------
class TestDelete:
    def test_cannot_delete_last(self, admin_headers, created_state):
        # Wipe down to a single backup, then attempt delete.
        list_resp = requests.get(f"{BASE_URL}/api/admin/backups", headers=admin_headers, timeout=30).json()
        ids = [i["id"] for i in list_resp["items"]]
        # delete all but one
        for bid in ids[:-1]:
            requests.delete(f"{BASE_URL}/api/admin/backups/{bid}", headers=admin_headers, timeout=30)
        remaining = requests.get(f"{BASE_URL}/api/admin/backups", headers=admin_headers, timeout=30).json()
        assert remaining["total"] == 1
        last_id = remaining["items"][0]["id"]
        r = requests.delete(f"{BASE_URL}/api/admin/backups/{last_id}", headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_delete_when_multiple(self, admin_headers):
        # Create a second backup so we have 2.
        c = requests.post(f"{BASE_URL}/api/admin/backups", json={"name": "TEST_for_delete"},
                          headers=admin_headers, timeout=60)
        assert c.status_code == 200
        new_id = c.json()["id"]
        r = requests.delete(f"{BASE_URL}/api/admin/backups/{new_id}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
