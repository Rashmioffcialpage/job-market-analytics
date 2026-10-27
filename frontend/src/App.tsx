import { useEffect, useState } from 'react'
import SalaryRecords from './SalaryRecords'
import './App.css'
import LocationChart from './LocationChart'
import JobTitleFinder from './JobTitleFinder'
type SalarySummary = {
  records: number
  job_titles: number
  company_locations: number
  first_year: number | null
  last_year: number | null
  median_salary_usd: number | null
}

type ExperienceRow = {
  experience_level: string
  records: number
  median_salary_usd: number
}

type JobTitleRow = {
  job_title: string
  records: number
  median_salary_usd: number
}

type FilterOptions = {
  years: number[]
  experience_levels: string[]
  company_locations: string[]
}

type Filters = {
  year: string
  experience: string
  location: string
}

type DashboardData = {
  summary: SalarySummary
  experience: ExperienceRow[]
  jobTitles: JobTitleRow[]
}

const API_URL = 'http://127.0.0.1:8001'

const emptyFilters: Filters = {
  year: '',
  experience: '',
  location: '',
}

const experienceLabels: Record<string, string> = {
  EN: 'Entry',
  MI: 'Intermediate',
  SE: 'Senior',
  EX: 'Executive',
}

const experienceOrder = ['EN', 'MI', 'SE', 'EX']

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

async function getJson<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

function App() {
  const [draft, setDraft] = useState<Filters>({ ...emptyFilters })
  const [applied, setApplied] = useState<Filters>({ ...emptyFilters })

  const [options, setOptions] = useState<FilterOptions>({
    years: [],
    experience_levels: [],
    company_locations: [],
  })

  const [optionsError, setOptionsError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOptions() {
      setOptionsError('')

      try {
        const result = await getJson<FilterOptions>(
          '/api/salaries/filters',
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setOptions(result)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setOptionsError(
            err instanceof Error
              ? err.message
              : 'Unable to load filter options',
          )
        }
      }
    }

    loadOptions()

    return () => controller.abort()
  }, [retryKey])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      Object.entries(applied).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        }
      })

      const query = params.toString()
      const suffix = query ? `?${query}` : ''

      try {
        const [summary, experience, jobTitles] = await Promise.all([
          getJson<SalarySummary>(
            `/api/salaries/summary${suffix}`,
            controller.signal,
          ),
          getJson<ExperienceRow[]>(
            `/api/salaries/experience${suffix}`,
            controller.signal,
          ),
          getJson<JobTitleRow[]>(
            `/api/salaries/job-titles${suffix}`,
            controller.signal,
          ),
        ])

        if (!controller.signal.aborted) {
          setData({ summary, experience, jobTitles })
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [applied, retryKey])

  function updateDraft(field: keyof Filters, value: string) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function resetFilters() {
    setDraft({ ...emptyFilters })
    setApplied({ ...emptyFilters })
  }

  const filterParams = new URLSearchParams()

  Object.entries(applied).forEach(([key, value]) => {
    if (value) {
      filterParams.set(key, value)
    }
  })

  const filterQuery = filterParams.toString()

  const experienceRows = [...(data?.experience ?? [])].sort(
    (a, b) => {
      const aIndex = experienceOrder.indexOf(a.experience_level)
      const bIndex = experienceOrder.indexOf(b.experience_level)

      return (
        (aIndex === -1 ? experienceOrder.length : aIndex) -
        (bIndex === -1 ? experienceOrder.length : bIndex)
      )
    },
  )

  const maxMedian = Math.max(
    1,
    ...experienceRows.map((row) => row.median_salary_usd),
  )

  return (
    <main className="dashboard">
      <header className="hero">
        <p className="eyebrow">DATA SCIENCE SALARY SAMPLE</p>
        <h1>Job Market Analytics</h1>
        <p className="subtitle">
          Explore historical salaries by role, company location,
          and experience.
        </p>
      </header>

      <p className="data-note">
        Historical sample · Source salary values converted to USD ·
        Not current job openings
      </p>

      <section className="panel" aria-labelledby="filters-heading">
        <h2 id="filters-heading">Filter records</h2>

        {optionsError && (
          <p role="alert">
            Could not load filter options: {optionsError}
          </p>
        )}

        <form
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault()
            setApplied({ ...draft })
          }}
        >
          <label>
            Work year
            <select
              value={draft.year}
              onChange={(event) =>
                updateDraft('year', event.target.value)
              }
            >
              <option value="">All years</option>

              {options.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label>
            Experience
            <select
              value={draft.experience}
              onChange={(event) =>
                updateDraft('experience', event.target.value)
              }
            >
              <option value="">All levels</option>

              {options.experience_levels.map((level) => (
                <option key={level} value={level}>
                  {experienceLabels[level] ?? level}
                </option>
              ))}
            </select>
          </label>

          <label>
            Company location
            <select
              value={draft.location}
              onChange={(event) =>
                updateDraft('location', event.target.value)
              }
            >
              <option value="">All locations</option>

              {options.company_locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <div className="filter-actions">
            <button type="submit">Apply filters</button>

            <button
              type="button"
              className="secondary-button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </form>

        <p className="data-note">
          Results reflect the last applied filters. Locations are
          company country codes from the dataset.
        </p>
      </section>

      {loading ? (
        <p className="message" role="status">
          Loading salary data…
        </p>
      ) : error ? (
        <section className="panel" role="alert">
          <h2>Could not load the dashboard</h2>
          <p>{error}</p>
          <p>Check that the backend is running on port 8001.</p>

          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry
          </button>
        </section>
      ) : data ? (
        <>
          {data.summary.records === 0 && (
            <p className="message" role="status">
              No salary records match these filters.
            </p>
          )}

          <section className="metrics" aria-label="Dataset summary">
            <article className="metric-card">
              <h2>Salary records</h2>
              <p>{data.summary.records.toLocaleString()}</p>
            </article>

            <article className="metric-card">
              <h2>Median salary</h2>
              <p>
                {data.summary.median_salary_usd === null
                  ? 'N/A'
                  : money.format(data.summary.median_salary_usd)}
              </p>
            </article>

            <article className="metric-card">
              <h2>Job titles</h2>
              <p>{data.summary.job_titles.toLocaleString()}</p>
            </article>

            <article className="metric-card">
              <h2>Company locations</h2>
              <p>{data.summary.company_locations.toLocaleString()}</p>
            </article>
          </section>

          <section className="panel" aria-labelledby="experience-heading">
            <h2 id="experience-heading">Salary by experience</h2>

            <p className="panel-description">
              Median salary in USD for matching records.
            </p>

            {experienceRows.length === 0 ? (
              <p>No matching experience data.</p>
            ) : (
              <div className="experience-list">
                {experienceRows.map((row) => (
                  <article
                    className="experience-row"
                    key={row.experience_level}
                  >
                    <div className="row-heading">
                      <strong>
                        {experienceLabels[row.experience_level] ??
                          row.experience_level}
                      </strong>

                      <span>
                        {row.records.toLocaleString()} records
                      </span>
                    </div>

                    <div className="bar-track" aria-hidden="true">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            (row.median_salary_usd / maxMedian) * 100
                          }%`,
                        }}
                      />
                    </div>

                    <p>{money.format(row.median_salary_usd)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="titles-heading">
            <h2 id="titles-heading">Most frequent job titles</h2>

            <p className="panel-description">
              Up to 10 titles ranked by matching record count.
              Small groups should be interpreted carefully.
            </p>

            {data.jobTitles.length === 0 ? (
              <p>No matching job-title data.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Job title</th>
                      <th scope="col">Records</th>
                      <th scope="col">Median salary</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.jobTitles.map((row) => (
                      <tr key={row.job_title}>
                        <th scope="row">{row.job_title}</th>
                        <td>{row.records.toLocaleString()}</td>
                        <td>{money.format(row.median_salary_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
             </section>
<JobTitleFinder />

<LocationChart
  key={filterQuery}
  query={filterQuery}
/>
<LocationChart
  key={filterQuery}
  query={filterQuery}
/>

<SalaryRecords
  key={filterQuery}
  query={filterQuery}
/>
          <SalaryRecords
            key={filterQuery}
            query={filterQuery}
          />

          <p className="footer-note">
            Matching records: {data.summary.first_year ?? 'N/A'}–
            {data.summary.last_year ?? 'N/A'}. This sample may not
            represent the whole job market.
          </p>
        </>
      ) : null}
    </main>
  )
}

export default App