import csv
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert

from backend.database import Base, SessionLocal, engine
from backend.models import SalaryRecord

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "data" / "job_salaries.csv"

REQUIRED_COLUMNS = {
    "",
    "work_year",
    "experience_level",
    "employment_type",
    "job_title",
    "salary",
    "salary_currency",
    "salary_in_usd",
    "employee_residence",
    "remote_ratio",
    "company_location",
    "company_size",
}


def load_rows():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV file not found: {CSV_PATH}")

    records = []

    with CSV_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        if reader.fieldnames is None:
            raise ValueError("CSV file has no header.")

        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames)

        if missing_columns:
            raise ValueError(f"Missing CSV columns: {missing_columns}")

        for line_number, row in enumerate(reader, start=2):
            try:
                record = {
                    "source_row_id": int(row[""]),
                    "work_year": int(row["work_year"]),
                    "experience_level": row["experience_level"].strip(),
                    "employment_type": row["employment_type"].strip(),
                    "job_title": row["job_title"].strip(),
                    "salary": int(row["salary"]),
                    "salary_currency": row["salary_currency"].strip(),
                    "salary_in_usd": int(row["salary_in_usd"]),
                    "employee_residence": row["employee_residence"].strip(),
                    "remote_ratio": int(row["remote_ratio"]),
                    "company_location": row["company_location"].strip(),
                    "company_size": row["company_size"].strip(),
                }

                if not all(
                    record[field]
                    for field in (
                        "experience_level",
                        "employment_type",
                        "job_title",
                        "salary_currency",
                        "employee_residence",
                        "company_location",
                        "company_size",
                    )
                ):
                    raise ValueError("A required text field is empty.")

                if record["remote_ratio"] not in (0, 50, 100):
                    raise ValueError("Unexpected remote_ratio.")

            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(
                    f"Invalid CSV data on line {line_number}: {exc}"
                ) from exc

            records.append(record)

    if not records:
        raise ValueError("CSV file contains no data rows.")

    return records


def main():
    # Read and validate the whole file before changing the database.
    records = load_rows()

    source_ids = [record["source_row_id"] for record in records]

    if len(source_ids) != len(set(source_ids)):
        raise ValueError("CSV contains duplicate source row IDs.")

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        statement = (
            insert(SalaryRecord)
            .values(records)
            .on_conflict_do_nothing(
                index_elements=["source_row_id"]
            )
            .returning(SalaryRecord.id)
        )

        inserted_ids = db.execute(statement).scalars().all()
        db.commit()

    print(f"CSV rows read: {len(records)}")
    print(f"Rows inserted: {len(inserted_ids)}")
    print(f"Existing rows skipped: {len(records) - len(inserted_ids)}")


if __name__ == "__main__":
    main()