"""Shared pytest fixtures.

Each test gets a fresh, isolated in-memory store so order never matters.
"""

import pytest
from fastapi.testclient import TestClient

import main as main_module
import store as store_module
from main import app


@pytest.fixture(autouse=True)
def fresh_store():
    """Reset the singleton store before every test."""
    store_module._store = None
    yield store_module.get_store()
    store_module._store = None


@pytest.fixture(autouse=True)
def fresh_rate_limiters():
    """Clear the per-client rate limiters so test order never trips them."""
    for limiter in main_module._RATE_LIMITERS:
        limiter.reset()


@pytest.fixture
def client():
    return TestClient(app)


# Jaipur centre — a convenient default emergency location.
JAIPUR = {"lat": 26.9124, "lng": 75.7873}
