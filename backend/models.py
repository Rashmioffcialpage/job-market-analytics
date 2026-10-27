from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identifier from the first, unnamed CSV column.
    source_row_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    work_year: Mapped[int] = mapped_column(Integer, nullable=False)
    experience_level: Mapped[str] = mapped_column(String(10), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(10), nullable=False)
    job_title: Mapped[str] = mapped_column(String(200), nullable=False)
    salary: Mapped[int] = mapped_column(Integer, nullable=False)
    salary_currency: Mapped[str] = mapped_column(String(10), nullable=False)
    salary_in_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    employee_residence: Mapped[str] = mapped_column(String(10), nullable=False)
    remote_ratio: Mapped[int] = mapped_column(Integer, nullable=False)
    company_location: Mapped[str] = mapped_column(String(10), nullable=False)
    company_size: Mapped[str] = mapped_column(String(10), nullable=False)