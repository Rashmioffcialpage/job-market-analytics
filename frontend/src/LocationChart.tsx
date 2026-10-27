import { useEffect, useState } from 'react'

type LocationRow = {
  company_location: string
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

export default function LocationChart({ query }: Props) {
  const [rows, setRows] = useState<LocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadLocations() {
      setLoading(true)
      setError('')

      try {
        const suffix = query ? `?${query}` : ''

        const response = await fetch(
          `http://127.0.0.1:8001/api/salaries/locations${suffix}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }

        const result: LocationRow[] = await response.json()

        if (!controller.signal.aborted) {
          setRows(result)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load location data',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadLocations()

    return () => controller.abort()
  }, [query, retryKey])

  const maxMedian = Math.max(
    1,
    ...rows.map((row) => row.median_salary_usd),
  )

  return (
    <section className="panel" aria-labelledby="locations-heading">
      <h2 id="locations-heading">Salary by company location</h2>

      <p className="panel-description">
        Median salary in USD for up to 10 locations, ranked by the
        number of matching records. Locations are company country
        codes; small groups should be interpreted carefully.
      </p>

      {loading ? (
        <p role="status">Loading location data…</p>
      ) : error ? (
        <div>
          <p role="alert">Could not load location data: {error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p>No location data matches these filters.</p>
      ) : (
        <div className="experience-list">
          {rows.map((row) => (
            <article
              className="experience-row"
              key={row.company_location}
            >
              <div className="row-heading">
                <strong>{row.company_location}</strong>
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