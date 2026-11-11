# Regression tests for Shared Deadline List API (auth, tasks, backup/restore, users, guards)
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "wcollard@yahoo.com", "password": "Deadlines2026!"}


def login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return s, r


@pytest.fixture(scope="module")
def admin():
    s, r = login(**ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids


@pytest.fixture(scope="module", autouse=True)
def cleanup(created_ids):
    yield
    s, _ = login(**ADMIN)
    for kind, _id in created_ids:
        s.delete(f"{BASE_URL}/api/{kind}/{_id}")


# --- auth ---
class TestAuth:
    def test_login_sets_httponly_cookies(self):
        s, r = login(**ADMIN)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN["email"] and d["role"] == "admin"
        assert "password_hash" not in d and "_id" not in d
        sc = r.headers.get("set-cookie", "").lower()
        assert "access_token" in sc and "httponly" in sc and "refresh_token" in sc

    def test_wrong_password(self):
        _, r = login(ADMIN["email"], "wrongpass!!")
        assert r.status_code == 401

    def test_me_and_refresh(self, admin):
        r = admin.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200 and r.json()["name"] == "W. Collard"
        r = admin.post(f"{BASE_URL}/api/auth/refresh")
        assert r.status_code == 200

    def test_tasks_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/tasks").status_code == 401
        assert requests.get(f"{BASE_URL}/api/backup").status_code == 401

    def test_origin_guard(self, admin):
        r = admin.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_origin"}, headers={"Origin": "https://evil.com"})
        assert r.status_code == 403

    def test_cors_credentials(self):
        r = requests.options(f"{BASE_URL}/api/tasks", headers={
            "Origin": BASE_URL, "Access-Control-Request-Method": "POST"})
        assert r.headers.get("access-control-allow-origin") == BASE_URL
        assert r.headers.get("access-control-allow-credentials") == "true"

    def test_brute_force_lockout(self):
        email = f"test_bf_{uuid.uuid4().hex[:8]}@example.com"
        codes = [login(email, "badpass123")[1].status_code for _ in range(6)]
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes


# --- tasks CRUD ---
class TestTasks:
    def test_create_get_update_color_delete(self, admin, created_ids):
        r = admin.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_  api  task", "assignee": "TEST_bob", "matter_no": "M-1",
            "deadline": "2026-02-01", "color": "yellow", "hyperlink": "example.com", "notes": "n"})
        assert r.status_code == 200, r.text
        t = r.json()
        created_ids.append(("tasks", t["id"]))
        assert t["title"] == "TEST_ api task"
        assert t["hyperlink"] == "https://example.com"
        assert t["updated_by"] == "W. Collard"
        assert any(x["id"] == t["id"] for x in admin.get(f"{BASE_URL}/api/tasks").json())

        r = admin.put(f"{BASE_URL}/api/tasks/{t['id']}", json={"title": "TEST_updated", "color": "blue"})
        assert r.status_code == 200 and r.json()["title"] == "TEST_updated" and r.json()["color"] == "blue"

        r = admin.patch(f"{BASE_URL}/api/tasks/{t['id']}/color", json={"color": "red"})
        assert r.status_code == 200 and r.json()["color"] == "red"
        assert admin.patch(f"{BASE_URL}/api/tasks/{t['id']}/color", json={"color": "pink"}).status_code == 400

        assert admin.delete(f"{BASE_URL}/api/tasks/{t['id']}").status_code == 200
        assert admin.delete(f"{BASE_URL}/api/tasks/{t['id']}").status_code == 404

    @pytest.mark.parametrize("payload,msg", [
        ({"title": "   "}, "title"),
        ({"title": "TEST_d", "deadline": "2026-13-40"}, "YYYY-MM-DD"),
        ({"title": "TEST_l", "hyperlink": "javascript:alert(1)"}, "Hyperlink"),
        ({"title": "TEST_l", "hyperlink": "data:text/html,x"}, "Hyperlink"),
    ])
    def test_validation(self, admin, payload, msg):
        r = admin.post(f"{BASE_URL}/api/tasks", json=payload)
        assert r.status_code == 400 and msg in r.json()["detail"]

    def test_bad_ids(self, admin):
        assert admin.put(f"{BASE_URL}/api/tasks/bad", json={"title": "x"}).status_code == 404
        assert admin.delete(f"{BASE_URL}/api/tasks/000000000000000000000000").status_code == 404


# --- backup / restore + users / roles ---
class TestBackupUsers:
    def test_backup(self, admin):
        r = admin.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 200
        d = r.json()
        assert d["app"] == "shared-deadline-list" and isinstance(d["tasks"], list)
        assert all("id" not in t and "_id" not in t for t in d["tasks"])

    def test_restore_validation_does_not_wipe(self, admin):
        before = len(admin.get(f"{BASE_URL}/api/tasks").json())
        r = admin.post(f"{BASE_URL}/api/restore", json={"tasks": [{"title": "TEST_ok"}, {"title": ""}]})
        assert r.status_code == 400 and "Row 2" in r.json()["detail"]
        assert len(admin.get(f"{BASE_URL}/api/tasks").json()) == before

    def test_restore_roundtrip(self, admin):
        original = admin.get(f"{BASE_URL}/api/backup").json()["tasks"]
        r = admin.post(f"{BASE_URL}/api/restore", json={"tasks": original + [{"title": "TEST_restored"}]})
        assert r.status_code == 200 and r.json()["restored"] == len(original) + 1
        titles = [t["title"] for t in admin.get(f"{BASE_URL}/api/tasks").json()]
        assert "TEST_restored" in titles
        r = admin.post(f"{BASE_URL}/api/restore", json={"tasks": original})
        assert r.status_code == 200 and r.json()["restored"] == len(original)
        assert len(admin.get(f"{BASE_URL}/api/tasks").json()) == len(original)

    def test_user_lifecycle_and_member_permissions(self, admin, created_ids):
        email = f"test_member_{uuid.uuid4().hex[:6]}@example.com"
        r = admin.post(f"{BASE_URL}/api/users", json={"email": email, "name": "TEST_Member", "password": "memberpass1"})
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        created_ids.append(("users", uid))
        assert admin.post(f"{BASE_URL}/api/users", json={"email": email, "name": "x", "password": "memberpass1"}).status_code == 400
        assert admin.post(f"{BASE_URL}/api/users", json={"email": "t@e.com", "name": "x", "password": "short"}).status_code == 422

        m, r = login(email, "memberpass1")
        assert r.status_code == 200 and r.json()["role"] == "member"
        assert m.get(f"{BASE_URL}/api/users").status_code == 403
        assert m.post(f"{BASE_URL}/api/restore", json={"tasks": []}).status_code == 403
        assert m.get(f"{BASE_URL}/api/tasks").status_code == 200
        t = m.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_member_task"}).json()
        created_ids.append(("tasks", t["id"]))
        assert t["updated_by"] == "TEST_Member"

        assert admin.put(f"{BASE_URL}/api/users/{uid}/password", json={"password": "newpass123"}).status_code == 200
        assert login(email, "newpass123")[1].status_code == 200

        me_id = admin.get(f"{BASE_URL}/api/auth/me").json()["id"]
        assert admin.delete(f"{BASE_URL}/api/users/{me_id}").status_code == 400
        assert admin.delete(f"{BASE_URL}/api/users/{uid}").status_code == 200
        assert login(email, "newpass123")[1].status_code == 401
        # deleted user's existing session should be rejected
        assert m.get(f"{BASE_URL}/api/tasks").status_code == 401
