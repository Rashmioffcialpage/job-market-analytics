# Job Market Analytics

A full-stack dashboard for exploring a historical sample of data science salaries. Users can filter records by work year, experience level, and company location, then compare salary distributions and browse individual records.

## Dashboard features

- Summary cards for salary records, median salary, job titles, and company locations
- Filters for work year, experience level, and company location
- Median salary breakdowns by experience and company location
- Most frequent job titles with record counts and median salaries
- Searchable, paginated salary records table
- API and database health checks
- Job-title chart showing the most frequent titles by record count
- Yearly chart comparing median salary and record counts
- Visual similarity bars for the AI Job Title Finder
## Tech stack

- **Frontend:** React, TypeScript, Vite, CSS
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL, Docker Compose
- **Testing:** pytest
- **Backend:** Python, FastAPI, SQLAlchemy, scikit-learn
## Dataset and limitations

The project uses a historical data science salary sample with **607 records from 2020–2022**. The dashboard displays the dataset's salary values converted to USD.

- These records are a sample and may not represent the entire job market.
- They are not live job postings or current salary estimates.
- Some groups contain only a few records, so comparisons should be interpreted carefully.
- The current dataset does not include job skills; skills analysis would require another dataset.

Dataset source: [Data Science Job Salaries](https://huggingface.co/datasets/hugginglearners/data-science-job-salaries)

## Getting started

### Prerequisites

- Python and Node.js
- Docker Desktop
- Git

### 1. Start the database

From the project root, start Docker Desktop and run:

```bash
docker compose up -d
```

### 2. Set up the backend

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

Create a `.env` file in the project root and add the local database URL:

```env
DATABASE_URL=postgresql+psycopg2://jobanalytics:local_job_dev@127.0.0.1:5434/job_market
```

Place the dataset at `data/job_salaries.csv`, then import it:

```bash
python -m backend.import_data
```

Start the API:

```bash
python -m uvicorn backend.main:app --reload --port 8001
```

The API documentation is available at [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs).

### 3. Start the frontend

Open a new terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown in the terminal, usually [http://localhost:5173/](http://localhost:5173/).

## Tests and checks

With the database and backend API running, execute these commands from the project root:

```bash
python -m pip install pytest
python -m pytest backend/tests -q
```

Check the frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

The API tests connect to the running local server and use the imported dataset.

## API endpoints

| Endpoint | Purpose |
| --- | --- |
| `/api/health` | API health |
| `/api/database/health` | Database connection health |
| `/api/salaries/filters` | Available filter options |
| `/api/salaries/summary` | Summary metrics |
| `/api/salaries/experience` | Salary breakdown by experience |
| `/api/salaries/job-titles` | Most frequent job titles |
| `/api/salaries/locations` | Salary breakdown by company location |
| `/api/salaries/records` | Searchable and paginated records |
| `/api/salaries/similar-titles` | Find similar job titles using text similarity |
## Future improvements

- Add a separate dataset containing job skills
- Expand automated tests and mobile usability checks
- Add more salary and location comparisons