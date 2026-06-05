import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pytest


SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

TEST_DB_PATH = Path(tempfile.gettempdir()) / "pumpai_pytest.sqlite"

os.environ["DATABASE_URI"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")

from app import app, calculate_age_from_birth_date  # noqa: E402
from config import db  # noqa: E402
from models import User  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    app.config.update(TESTING=True)

    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.engine.dispose()

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()
        db.engine.dispose()

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture
def client():
    return app.test_client()


def signup(
    test_client,
    username="alice",
    email="alice@example.com",
    password="password123",
):
    return test_client.post(
        "/signup",
        json={
            "username": username,
            "email": email,
            "password": password,
        },
    )


def create_food_log(test_client, name="Chicken bowl", calories=500):
    return test_client.post(
        "/food_logs",
        json={
            "food_name": name,
            "calories": calories,
            "servings": 1,
            "protein": 40,
            "carbs": 45,
            "fat": 12,
            "fiber": 5,
            "sodium": 750,
            "serving_size": "1 bowl",
            "logged_date": "2026-05-24",
        },
    )


def test_signup_hashes_password_and_starts_session(client):
    response = signup(client)

    assert response.status_code == 201
    data = response.get_json()
    assert data["username"] == "alice"
    assert "_password_hash" not in data

    with app.app_context():
        user = User.query.filter_by(username="alice").first()
        assert user is not None
        assert user._password_hash != "password123"
        assert user.authenticate("password123") is True

    session_response = client.get("/check_session")

    assert session_response.status_code == 200
    assert session_response.get_json()["username"] == "alice"


def test_protected_routes_require_login(client):
    assert client.get("/food_logs").status_code == 401
    assert client.post("/workout_logs", json={}).status_code == 401
    assert client.get("/history").status_code == 401


def test_profile_calculates_age_and_ignores_client_age(client):
    signup(client)

    birth_date = "2000-01-01"
    response = client.post(
        "/profile",
        json={
            "name": "Alice",
            "birth_date": birth_date,
            "age": 99,
            "height": "5'8\"",
            "current_weight": 150,
            "weight_unit": "lb",
            "fitness_goal": "Build muscle",
            "target_calories": 2200,
            "target_protein": 160,
            "target_carbs": 220,
            "target_fat": 70,
        },
    )

    assert response.status_code == 201
    assert response.get_json()["age"] == calculate_age_from_birth_date(birth_date)

    updated_birth_date = "2001-01-01"
    patch_response = client.patch(
        "/profile",
        json={
            "age": 99,
            "birth_date": updated_birth_date,
        },
    )

    assert patch_response.status_code == 200
    assert patch_response.get_json()["age"] == calculate_age_from_birth_date(
        updated_birth_date
    )


def test_food_logs_support_crud_pagination_and_owner_scope():
    alice = app.test_client()
    bob = app.test_client()

    signup(alice)
    created_logs = [
        create_food_log(alice, name=f"Food {index}", calories=100 + index)
        for index in range(1, 4)
    ]

    assert all(response.status_code == 201 for response in created_logs)

    list_response = alice.get("/food_logs?page=1&per_page=2")
    list_data = list_response.get_json()

    assert list_response.status_code == 200
    assert list_data["total"] == 3
    assert list_data["pages"] == 2
    assert len(list_data["food_logs"]) == 2

    first_food_id = created_logs[0].get_json()["id"]

    signup(bob, username="bob", email="bob@example.com")
    blocked_patch = bob.patch(
        f"/food_logs/{first_food_id}",
        json={"food_name": "Bob should not edit this"},
    )

    assert blocked_patch.status_code == 404

    patch_response = alice.patch(
        f"/food_logs/{first_food_id}",
        json={"food_name": "Updated chicken bowl"},
    )

    assert patch_response.status_code == 200
    assert patch_response.get_json()["food_name"] == "Updated chicken bowl"

    assert bob.delete(f"/food_logs/{first_food_id}").status_code == 404
    assert alice.delete(f"/food_logs/{first_food_id}").status_code == 204
    assert alice.get("/food_logs").get_json()["total"] == 2


def test_workout_logs_support_crud_and_owner_scope():
    alice = app.test_client()
    bob = app.test_client()

    signup(alice)

    create_response = alice.post(
        "/workout_logs",
        json={
            "workout_type": "weighted",
            "exercise_name": "Bench press",
            "weight": 135,
            "sets": 3,
            "reps": 8,
            "notes": "Felt strong",
            "logged_date": "2026-05-24",
        },
    )

    assert create_response.status_code == 201
    workout_id = create_response.get_json()["id"]

    signup(bob, username="bob", email="bob@example.com")
    blocked_delete = bob.delete(f"/workout_logs/{workout_id}")

    assert blocked_delete.status_code == 404

    patch_response = alice.patch(
        f"/workout_logs/{workout_id}",
        json={
            "weight": 145,
            "reps": 6,
        },
    )

    assert patch_response.status_code == 200
    assert patch_response.get_json()["weight"] == 145
    assert patch_response.get_json()["reps"] == 6

    assert alice.delete(f"/workout_logs/{workout_id}").status_code == 204


def test_session_timeout_clears_stale_session(client):
    signup(client)

    with client.session_transaction() as session:
        session["last_active"] = (
            datetime.utcnow() - timedelta(minutes=16)
        ).isoformat()

    response = client.get("/check_session")

    assert response.status_code == 401

    with client.session_transaction() as session:
        assert "user_id" not in session
        assert "last_active" not in session
