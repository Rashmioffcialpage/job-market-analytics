import { useEffect, useState } from 'react'

type YearRow = {
  work_year: number
  records: number
  median_salary_usd: number
}

type Props = {
  query: string
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function YearChart({ query }: Props) {
  const [rows, setRows] = useState<YearRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadYears() {
      setLoading(true)
      setError('')

      try {
        const suffix = query ? `?${query}` : ''

        const response = await fetch(
          `http://127.0.0.1:8001/api/salaries/years${suffix}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }

        const data: YearRow[] = await response.json()

        if (!controller.signal.aborted) {
          setRows(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load yearly salary data',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadYears()

    return () => controller.abort()
  }, [query, retryKey])

  const maxMedian = Math.max(
    1,
    ...rows.map((row) => row.median_salary_usd),
  )

  return (
    <section className="panel" aria-labelledby="year-chart-heading">
      <h2 id="year-chart-heading">Median salary by year</h2>

      <p className="panel-description">
        Median salary in USD for the matching records in each work year.
        The number and mix of records differ between years.
      </p>

      {loading ? (
        <p role="status">Loading yearly salary data…</p>
      ) : error ? (
        <div>
          <p role="alert">Could not load yearly data: {error}</p>

          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p>No yearly salary data matches these filters.</p>
      ) : (
        <div className="experience-list">
          {rows.map((row) => (
            <article className="experience-row" key={row.work_year}>
              <div className="row-heading">
                <strong>{row.work_year}</strong>
                <span>{row.records.toLocaleString()} records</span>
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
  )
}