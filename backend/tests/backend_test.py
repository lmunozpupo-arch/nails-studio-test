"""SalonApp backend API regression suite."""
import datetime as dt

import pytest
import requests

from conftest import API


def today_str():
    return dt.datetime.now(dt.timezone.utc).date().isoformat()


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_success(self, test_credentials):
        r = requests.post(f"{API}/auth/login", json=test_credentials, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 10
        assert data["user"]["email"] == test_credentials["email"]
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self, test_credentials):
        r = requests.post(f"{API}/auth/login",
                          json={"email": test_credentials["email"], "password": "WrongPass1!"}, timeout=30)
        assert r.status_code == 401, r.text
        assert "detail" in r.json()

    def test_login_unknown_email(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "nobody@example.com", "password": "x"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, client, test_credentials):
        r = client.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == test_credentials["email"]

    def test_me_unauthenticated(self, anon):
        r = anon.get(f"{API}/auth/me", timeout=30)
        assert r.status_code in (401, 403), r.text

    @pytest.mark.parametrize("path", ["clients", "services", "professionals",
                                      "appointments", "payments", "dashboard/stats", "settings"])
    def test_protected_endpoints_require_auth(self, anon, path):
        r = anon.get(f"{API}/{path}", timeout=30)
        assert r.status_code in (401, 403), f"{path} -> {r.status_code}"

    def test_invalid_token_rejected(self, anon):
        r = anon.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.xyz"}, timeout=30)
        assert r.status_code in (401, 403)


# ---------------- SEED DATA ----------------
class TestSeedData:
    def test_seed_clients(self, client):
        r = client.get(f"{API}/clients", timeout=30)
        assert r.status_code == 200
        ids = {c["id"] for c in r.json()}
        for cid in ["cli_beatriz", "cli_camila", "cli_fernanda", "cli_patricia"]:
            assert cid in ids

    def test_seed_services_and_professionals(self, client):
        s = client.get(f"{API}/services", timeout=30)
        p = client.get(f"{API}/professionals", timeout=30)
        assert s.status_code == 200 and p.status_code == 200
        sids = {x["id"] for x in s.json()}
        pids = {x["id"] for x in p.json()}
        assert {"svc_manicure", "svc_pedicure", "svc_nailart"} <= sids
        assert {"pro_ana", "pro_maria", "pro_julia"} <= pids

    def test_no_mongo_object_id_leak(self, client):
        for path in ["clients", "services", "professionals", "appointments", "payments"]:
            r = client.get(f"{API}/{path}", timeout=30)
            assert r.status_code == 200
            for doc in r.json():
                assert "_id" not in doc, f"_id leaked in {path}"

    def test_dashboard_stats(self, client):
        r = client.get(f"{API}/dashboard/stats", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ["total_clients", "active_professionals", "total_services",
                    "today_appointments_count", "pending_count", "confirmed_today",
                    "revenue_today", "revenue_week", "revenue_month", "today_appointments"]:
            assert key in d, key
        assert isinstance(d["today_appointments"], list)
        assert d["total_clients"] >= 4

    def test_settings_get(self, client):
        r = client.get(f"{API}/settings", timeout=30)
        assert r.status_code == 200, r.text
        assert "salon_name" in r.json()


# ---------------- CLIENTS CRUD ----------------
class TestClientsCRUD:
    created = []

    def test_client_full_crud(self, client):
        payload = {"first_name": "TEST_Ana", "last_name": "Tester", "phone": "11999990000",
                   "email": "test_qa@example.com", "notes": "qa", "active": True}
        r = client.post(f"{API}/clients", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        cid = r.json()["id"]
        TestClientsCRUD.created.append(cid)
        assert r.json()["first_name"] == "TEST_Ana"

        g = client.get(f"{API}/clients/{cid}", timeout=30)
        assert g.status_code == 200 and g.json()["last_name"] == "Tester"

        upd = {**payload, "last_name": "Updated"}
        u = client.put(f"{API}/clients/{cid}", json=upd, timeout=30)
        assert u.status_code == 200, u.text
        assert u.json()["last_name"] == "Updated"
        assert client.get(f"{API}/clients/{cid}", timeout=30).json()["last_name"] == "Updated"

        # search filter
        s = client.get(f"{API}/clients", params={"search": "TEST_Ana"}, timeout=30)
        assert s.status_code == 200
        assert any(c["id"] == cid for c in s.json())

        d = client.delete(f"{API}/clients/{cid}", timeout=30)
        assert d.status_code in (200, 204)
        TestClientsCRUD.created.remove(cid)
        assert client.get(f"{API}/clients/{cid}", timeout=30).status_code == 404

    def test_client_validation_missing_name(self, client):
        r = client.post(f"{API}/clients", json={"first_name": "", "last_name": ""}, timeout=30)
        assert r.status_code == 422, r.text

    def test_client_update_not_found(self, client):
        r = client.put(f"{API}/clients/nope", json={"first_name": "a", "last_name": "b"}, timeout=30)
        assert r.status_code == 404

    def test_client_delete_not_found(self, client):
        assert client.delete(f"{API}/clients/nope", timeout=30).status_code == 404


# ---------------- SERVICES CRUD ----------------
class TestServicesCRUD:
    def test_service_full_crud(self, client):
        payload = {"name": "TEST_Service", "description": "qa", "price": 120,
                   "duration_minutes": 45, "active": True}
        r = client.post(f"{API}/services", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        sid = r.json()["id"]
        assert r.json()["price"] == 120 and r.json()["duration_minutes"] == 45

        u = client.put(f"{API}/services/{sid}", json={**payload, "price": 150}, timeout=30)
        assert u.status_code == 200 and u.json()["price"] == 150
        assert client.get(f"{API}/services/{sid}", timeout=30).json()["price"] == 150

        assert client.delete(f"{API}/services/{sid}", timeout=30).status_code in (200, 204)
        assert client.get(f"{API}/services/{sid}", timeout=30).status_code == 404

    @pytest.mark.parametrize("bad", [
        {"name": "", "price": 100, "duration_minutes": 30},
        {"name": "TEST_x", "price": 0, "duration_minutes": 30},
        {"name": "TEST_x", "price": -5, "duration_minutes": 30},
        {"name": "TEST_x", "price": 100, "duration_minutes": 0},
    ])
    def test_service_validation(self, client, bad):
        r = client.post(f"{API}/services", json=bad, timeout=30)
        assert r.status_code == 422, f"{bad} -> {r.status_code}"


# ---------------- PROFESSIONALS CRUD ----------------
class TestProfessionalsCRUD:
    def test_professional_full_crud(self, client):
        payload = {"first_name": "TEST_Pro", "last_name": "QA", "phone": "1188887777",
                   "email": "pro_qa@example.com", "specialty": "Nail Art", "active": True}
        r = client.post(f"{API}/professionals", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        assert r.json()["active"] is True

        u = client.put(f"{API}/professionals/{pid}", json={**payload, "active": False}, timeout=30)
        assert u.status_code == 200 and u.json()["active"] is False
        assert client.get(f"{API}/professionals/{pid}", timeout=30).json()["active"] is False

        # active filter excludes inactive
        lst = client.get(f"{API}/professionals", params={"active": "true"}, timeout=30).json()
        assert all(p["id"] != pid for p in lst)

        assert client.delete(f"{API}/professionals/{pid}", timeout=30).status_code in (200, 204)
        assert client.get(f"{API}/professionals/{pid}", timeout=30).status_code == 404


# ---------------- APPOINTMENTS ----------------
class TestAppointments:
    def test_create_status_transitions_and_delete(self, client):
        payload = {"client_id": "cli_beatriz", "service_id": "svc_manicure",
                   "professional_id": "pro_julia", "date": today_str(),
                   "start_time": "20:00", "notes": "TEST_appt"}
        r = client.post(f"{API}/appointments", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        appt = r.json()
        aid = appt["id"]
        assert appt["status"] == "pending"
        assert appt["client_name"] and appt["service_name"] and appt["professional_name"]
        assert appt["end_time"] > appt["start_time"]
        assert appt["price"] > 0

        for status in ["confirmed", "completed", "cancelled"]:
            s = client.patch(f"{API}/appointments/{aid}/status", json={"status": status}, timeout=30)
            assert s.status_code == 200, s.text
            assert s.json()["status"] == status
            assert client.get(f"{API}/appointments/{aid}", timeout=30).json()["status"] == status

        bad = client.patch(f"{API}/appointments/{aid}/status", json={"status": "nonsense"}, timeout=30)
        assert bad.status_code == 400

        assert client.delete(f"{API}/appointments/{aid}", timeout=30).status_code in (200, 204)
        assert client.get(f"{API}/appointments/{aid}", timeout=30).status_code == 404

    def test_schedule_conflict_409_and_no_record(self, client):
        base = {"client_id": "cli_camila", "service_id": "svc_manicure",
                "professional_id": "pro_ana", "date": today_str(), "start_time": "21:00"}
        first = client.post(f"{API}/appointments", json=base, timeout=30)
        assert first.status_code == 201, first.text
        aid = first.json()["id"]
        try:
            before = len(client.get(f"{API}/appointments", timeout=30).json())
            conflict = client.post(f"{API}/appointments",
                                   json={**base, "start_time": "21:15",
                                         "client_id": "cli_fernanda"}, timeout=30)
            assert conflict.status_code == 409, conflict.text
            assert conflict.json()["detail"] == "schedule_conflict"
            after = len(client.get(f"{API}/appointments", timeout=30).json())
            assert after == before, "conflicting appointment was persisted"
            # different professional at same time is allowed
            ok = client.post(f"{API}/appointments",
                             json={**base, "start_time": "21:15", "professional_id": "pro_maria"},
                             timeout=30)
            assert ok.status_code == 201, ok.text
            client.delete(f"{API}/appointments/{ok.json()['id']}", timeout=30)
        finally:
            client.delete(f"{API}/appointments/{aid}", timeout=30)

    def test_cancelled_appointment_frees_slot(self, client):
        base = {"client_id": "cli_camila", "service_id": "svc_manicure",
                "professional_id": "pro_julia", "date": today_str(), "start_time": "22:00"}
        a = client.post(f"{API}/appointments", json=base, timeout=30)
        assert a.status_code == 201
        aid = a.json()["id"]
        client.patch(f"{API}/appointments/{aid}/status", json={"status": "cancelled"}, timeout=30)
        b = client.post(f"{API}/appointments", json=base, timeout=30)
        assert b.status_code == 201, b.text
        client.delete(f"{API}/appointments/{aid}", timeout=30)
        client.delete(f"{API}/appointments/{b.json()['id']}", timeout=30)

    @pytest.mark.parametrize("bad,expected", [
        ({"date": "2026-13-45"}, 400),
        ({"start_time": "99:99"}, 400),
        ({"client_id": "missing_client"}, 400),
        ({"service_id": "missing_service"}, 400),
        ({"professional_id": "missing_pro"}, 400),
    ])
    def test_appointment_validation(self, client, bad, expected):
        payload = {"client_id": "cli_beatriz", "service_id": "svc_manicure",
                   "professional_id": "pro_julia", "date": today_str(), "start_time": "23:30"}
        payload.update(bad)
        r = client.post(f"{API}/appointments", json=payload, timeout=30)
        assert r.status_code == expected, f"{bad} -> {r.status_code} {r.text[:200]}"

    def test_filters(self, client):
        t = today_str()
        r = client.get(f"{API}/appointments", params={"date_from": t, "date_to": t}, timeout=30)
        assert r.status_code == 200
        assert all(a["date"] == t for a in r.json())
        r2 = client.get(f"{API}/appointments", params={"professional_id": "pro_ana"}, timeout=30)
        assert all(a["professional_id"] == "pro_ana" for a in r2.json())
        r3 = client.get(f"{API}/appointments", params={"status": "pending"}, timeout=30)
        assert all(a["status"] == "pending" for a in r3.json())


# ---------------- PAYMENTS ----------------
class TestPayments:
    def test_payment_full_crud(self, client):
        payload = {"client_id": "cli_beatriz", "amount": 100.5, "method": "pix",
                   "date": today_str(), "status": "paid", "notes": "TEST_payment"}
        r = client.post(f"{API}/payments", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        assert r.json()["client_name"]
        assert r.json()["amount"] == 100.5

        u = client.put(f"{API}/payments/{pid}", json={**payload, "amount": 200, "method": "cash"}, timeout=30)
        assert u.status_code == 200 and u.json()["amount"] == 200 and u.json()["method"] == "cash"
        assert client.get(f"{API}/payments/{pid}", timeout=30).json()["amount"] == 200

        assert client.delete(f"{API}/payments/{pid}", timeout=30).status_code in (200, 204)
        assert client.get(f"{API}/payments/{pid}", timeout=30).status_code == 404

    def test_payment_linked_to_appointment(self, client):
        appt = client.post(f"{API}/appointments", json={
            "client_id": "cli_patricia", "service_id": "svc_pedicure",
            "professional_id": "pro_julia", "date": today_str(), "start_time": "23:00"}, timeout=30)
        assert appt.status_code == 201, appt.text
        aid = appt.json()["id"]
        pay = client.post(f"{API}/payments", json={
            "client_id": "cli_patricia", "appointment_id": aid,
            "amount": appt.json()["price"], "method": "credit_card",
            "date": today_str(), "status": "paid"}, timeout=30)
        assert pay.status_code == 201, pay.text
        assert pay.json()["appointment_id"] == aid
        client.delete(f"{API}/payments/{pay.json()['id']}", timeout=30)
        client.delete(f"{API}/appointments/{aid}", timeout=30)

    @pytest.mark.parametrize("bad,expected", [
        ({"method": "bitcoin"}, 400),
        ({"status": "weird"}, 400),
        ({"client_id": "missing"}, 400),
        ({"appointment_id": "missing"}, 400),
        ({"amount": 0}, 422),
        ({"amount": -10}, 422),
    ])
    def test_payment_validation(self, client, bad, expected):
        payload = {"client_id": "cli_beatriz", "amount": 50, "method": "cash",
                   "date": today_str(), "status": "paid"}
        payload.update(bad)
        r = client.post(f"{API}/payments", json=payload, timeout=30)
        assert r.status_code == expected, f"{bad} -> {r.status_code} {r.text[:200]}"

    def test_payment_method_filter(self, client):
        r = client.get(f"{API}/payments", params={"method": "pix"}, timeout=30)
        assert r.status_code == 200
        assert all(p["method"] == "pix" for p in r.json())


# ---------------- SETTINGS ----------------
class TestSettings:
    def test_settings_update_and_restore(self, client):
        original = client.get(f"{API}/settings", timeout=30).json()
        payload = {k: v for k, v in original.items() if k != "key"}
        payload["phone"] = "11 91234-5678"
        u = client.put(f"{API}/settings", json=payload, timeout=30)
        assert u.status_code == 200, u.text
        assert u.json()["phone"] == "11 91234-5678"
        assert client.get(f"{API}/settings", timeout=30).json()["phone"] == "11 91234-5678"
        restore = {k: v for k, v in original.items() if k != "key"}
        assert client.put(f"{API}/settings", json=restore, timeout=30).status_code == 200
