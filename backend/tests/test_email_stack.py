"""Tests for the /stacks/email-me endpoint."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from server import app, db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    for name in db.list_collection_names():
        db.drop_collection(name)
    yield


def test_email_stack_success():
    """Valid email + stack should be saved and return 200."""
    body = {
        "email": "founder@example.com",
        "idea": "CRM for bakeries",
        "tools": [
            {"name": "NocoDB", "githubUrl": "https://github.com/nocodb/nocodb"},
        ],
    }
    response = client.post("/api/stacks/email-me", json=body)
    assert response.status_code == 200
    data = response.json()
    assert "Saved" in data["message"]
    assert "inbox" in data["message"]

    # Verify DB state
    doc = db.email_stacks.find_one({"email": "founder@example.com"})
    assert doc is not None
    assert doc["idea"] == "CRM for bakeries"
    assert doc["status"] == "pending"


def test_email_stack_invalid_email():
    """Missing @ should return 400."""
    body = {
        "email": "not-an-email",
        "idea": "CRM",
        "tools": [],
    }
    response = client.post("/api/stacks/email-me", json=body)
    assert response.status_code == 400
    assert "Valid email required" in response.json()["detail"]


def test_email_stack_empty_email():
    """Empty email should return 400."""
    body = {
        "email": "",
        "idea": "CRM",
        "tools": [],
    }
    response = client.post("/api/stacks/email-me", json=body)
    assert response.status_code == 400


def test_email_stack_case_insensitive():
    """Email should be stored in lowercase."""
    body = {
        "email": "Founder@EXAMPLE.COM",
        "idea": "Invoice app",
        "tools": [],
    }
    response = client.post("/api/stacks/email-me", json=body)
    assert response.status_code == 200

    doc = db.email_stacks.find_one({"email": "founder@example.com"})
    assert doc is not None
