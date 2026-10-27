import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen


BASE_URL = "http://127.0.0.1:8001"


def get_json(path, params=None):
    query = f"?{urlencode(params)}" if params else ""

    with urlopen(f"{BASE_URL}{path}{query}", timeout=10) as response:
        return json.load(response)


def test_api_health():
    data = get_json("/api/health")

    assert data["status"] == "ok"


def test_database_health():
    data = get_json("/api/database/health")

    assert data["status"] == "ok"
    assert data["database"] == "job_market"


def test_summary_has_records():
    data = get_json("/api/salaries/summary")

    assert data["records"] > 0
    assert data["job_titles"] > 0
    assert data["median_salary_usd"] is not None


def test_filtered_summary_and_locations_agree():
    filters = {
        "year": 2022,
        "experience": "EN",
        "location": "US",
    }

    summary = get_json("/api/salaries/summary", filters)
    locations = get_json("/api/salaries/locations", filters)

    assert summary["records"] == 5
    assert summary["median_salary_usd"] == 120000
    assert len(locations) == 1
    assert locations[0]["company_location"] == "US"
    assert locations[0]["records"] == summary["records"]


def test_search_returns_matching_job_titles():
    data = get_json(
        "/api/salaries/records",
        {"search": "engineer", "page_size": 10},
    )

    assert data["total"] > 0
    assert len(data["items"]) > 0

    for record in data["items"]:
        assert "engineer" in record["job_title"].lower()


def test_pagination_returns_different_records():
    first_page = get_json(
        "/api/salaries/records",
        {"page": 1, "page_size": 2},
    )

    second_page = get_json(
        "/api/salaries/records",
        {"page": 2, "page_size": 2},
    )

    assert first_page["total"] == second_page["total"]
    assert first_page["page"] == 1
    assert second_page["page"] == 2

    first_ids = {record["id"] for record in first_page["items"]}
    second_ids = {record["id"] for record in second_page["items"]}

    assert len(first_ids) == 2
    assert len(second_ids) == 2
    assert first_ids.isdisjoint(second_ids)


def test_invalid_page_is_rejected():
    try:
        get_json("/api/salaries/records", {"page": 0})
    except HTTPError as error:
        assert error.code == 400
    else:
        raise AssertionError("Expected an HTTP 400 response for page 0")
def test_similar_job_titles():
    data = get_json(
        "/api/salaries/similar-titles",
        {"title": "machine learning engineer"},
    )

    assert data["query"] == "machine learning engineer"
    assert len(data["matches"]) > 0

    first_match = data["matches"][0]

    assert first_match["job_title"] == "Machine Learning Engineer"
    assert first_match["similarity"] == 1.0
    assert first_match["records"] > 0