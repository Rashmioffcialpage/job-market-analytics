from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.database import get_db


app = FastAPI(
    title="Job Market Analytics API",
    description="Explore a historical data science salary sample.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def salary_filters(
    year: int | None = None,
    experience: str | None = None,
    location: str | None = None,
):
    """Build filter clauses using fixed SQL columns and bound values."""
    clauses = []
    params = {}

    if year is not None:
        clauses.append("work_year = :year")
        params["year"] = year

    if experience:
        clauses.append("experience_level = :experience")
        params["experience"] = experience

    if location:
        clauses.append("company_location = :location")
        params["location"] = location

    where = " WHERE " + " AND ".join(clauses) if clauses else ""

    return where, params


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "Job Market Analytics API",
    }


@app.get("/api/database/health")
def database_health(db: Session = Depends(get_db)):
    try:
        database_name = db.execute(
            text("SELECT current_database()")
        ).scalar_one()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection unavailable",
        ) from None

    return {
        "status": "ok",
        "database": database_name,
    }


@app.get("/api/salaries/filters")
def salary_filter_options(db: Session = Depends(get_db)):
    try:
        years = db.execute(
            text("""
                SELECT DISTINCT work_year
                FROM salary_records
                ORDER BY work_year DESC
            """)
        ).scalars().all()

        experience_levels = db.execute(
            text("""
                SELECT DISTINCT experience_level
                FROM salary_records
                ORDER BY experience_level
            """)
        ).scalars().all()

        company_locations = db.execute(
            text("""
                SELECT DISTINCT company_location
                FROM salary_records
                ORDER BY company_location
            """)
        ).scalars().all()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load filter options",
        ) from None

    return {
        "years": years,
        "experience_levels": experience_levels,
        "company_locations": company_locations,
    }


@app.get("/api/salaries/summary")
def salary_summary(
    filters: tuple = Depends(salary_filters),
    db: Session = Depends(get_db),
):
    where, params = filters

    try:
        result = db.execute(
            text(f"""
                SELECT
                    COUNT(*) AS records,
                    COUNT(DISTINCT job_title) AS job_titles,
                    COUNT(DISTINCT company_location) AS company_locations,
                    MIN(work_year) AS first_year,
                    MAX(work_year) AS last_year,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY salary_in_usd
                    ) AS median_salary_usd
                FROM salary_records
                {where}
            """),
            params,
        ).mappings().one()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load salary summary",
        ) from None

    return {
        "records": result["records"],
        "job_titles": result["job_titles"],
        "company_locations": result["company_locations"],
        "first_year": result["first_year"],
        "last_year": result["last_year"],
        "median_salary_usd": (
            float(result["median_salary_usd"])
            if result["median_salary_usd"] is not None
            else None
        ),
    }


@app.get("/api/salaries/experience")
def salaries_by_experience(
    filters: tuple = Depends(salary_filters),
    db: Session = Depends(get_db),
):
    where, params = filters

    try:
        rows = db.execute(
            text(f"""
                SELECT
                    experience_level,
                    COUNT(*) AS records,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY salary_in_usd
                    ) AS median_salary_usd
                FROM salary_records
                {where}
                GROUP BY experience_level
                ORDER BY experience_level
            """),
            params,
        ).mappings().all()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load experience breakdown",
        ) from None

    return [
        {
            "experience_level": row["experience_level"],
            "records": row["records"],
            "median_salary_usd": float(row["median_salary_usd"]),
        }
        for row in rows
    ]


@app.get("/api/salaries/job-titles")
def salary_by_job_title(
    filters: tuple = Depends(salary_filters),
    db: Session = Depends(get_db),
):
    where, params = filters

    try:
        rows = db.execute(
            text(f"""
                SELECT
                    job_title,
                    COUNT(*) AS records,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY salary_in_usd
                    ) AS median_salary_usd
                FROM salary_records
                {where}
                GROUP BY job_title
                ORDER BY records DESC, job_title ASC
                LIMIT 10
            """),
            params,
        ).mappings().all()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load job-title breakdown",
        ) from None

    return [
        {
            "job_title": row["job_title"],
            "records": row["records"],
            "median_salary_usd": float(row["median_salary_usd"]),
        }
        for row in rows
    ]


@app.get("/api/salaries/records")
def salary_records(
    year: int | None = None,
    experience: str | None = None,
    location: str | None = None,
    search: str = "",
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be at least 1.",
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=400,
            detail="Page size must be between 1 and 100.",
        )

    conditions = []
    params = {}

    if year is not None:
        conditions.append("work_year = :year")
        params["year"] = year

    if experience:
        conditions.append("experience_level = :experience")
        params["experience"] = experience

    if location:
        conditions.append("company_location = :location")
        params["location"] = location

    # Search job titles without requiring an exact match.
    if search.strip():
        conditions.append("job_title ILIKE :search")
        params["search"] = f"%{search.strip()}%"

    where_clause = (
        "WHERE " + " AND ".join(conditions)
        if conditions
        else ""
    )

    try:
        total = db.execute(
            text(
                f"""
                SELECT COUNT(*)
                FROM salary_records
                {where_clause}
                """
            ),
            params,
        ).scalar_one()

        rows = db.execute(
            text(
                f"""
                SELECT
                    id,
                    work_year,
                    job_title,
                    experience_level,
                    company_location,
                    salary_in_usd
                FROM salary_records
                {where_clause}
                ORDER BY id
                LIMIT :limit OFFSET :offset
                """
            ),
            {
                **params,
                "limit": page_size,
                "offset": (page - 1) * page_size,
            },
        ).mappings().all()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load salary records",
        ) from None

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

@app.get("/api/salaries/locations")
def salaries_by_location(
    filters: tuple = Depends(salary_filters),
    db: Session = Depends(get_db),
):
    where, params = filters

    try:
        rows = db.execute(
            text(f"""
                SELECT
                    company_location,
                    COUNT(*) AS records,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY salary_in_usd
                    ) AS median_salary_usd
                FROM salary_records
                {where}
                GROUP BY company_location
                ORDER BY records DESC, company_location ASC
                LIMIT 10
            """),
            params,
        ).mappings().all()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Unable to load location breakdown",
        ) from None

    return [
        {
            "company_location": row["company_location"],
            "records": row["records"],
            "median_salary_usd": float(row["median_salary_usd"]),
        }
        for row in rows
    ]