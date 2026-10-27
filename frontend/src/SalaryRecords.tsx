import { useEffect, useState } from 'react'

type SalaryRecord = {
  id: number
  work_year: number
  job_title: string
  experience_level: string
  company_location: string
  salary_in_usd: number
}

type SalaryRecordPage = {
  items: SalaryRecord[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

type Props = {
  query: string
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const experienceLabels: Record<string, string> = {
  EN: 'Entry',
  MI: 'Intermediate',
  SE: 'Senior',
  EX: 'Executive',
}

export default function SalaryRecords({ query }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState<SalaryRecordPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRecords() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams(query)

      if (search) {
        params.set('search', search)
      }

      params.set('page', String(page))
      params.set('page_size', String(pageSize))

      try {
        const response = await fetch(
          `http://127.0.0.1:8001/api/salaries/records?${params}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }

        const result: SalaryRecordPage = await response.json()

        if (!controller.signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load salary records',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadRecords()

    return () => controller.abort()
  }, [query, search, page, pageSize, retryKey])

  function clearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  return (
    <section className="trend-panel">
      <h2>Salary records</h2>

      <p className="data-note">
        Individual records matching the applied dashboard filters.
        Search applies only to this table. Salaries are in USD.
      </p>

      <form
        className="filter-grid"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput.trim())
          setPage(1)
        }}
      >
        <label>
          Search job title
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="For example: engineer"
          />
        </label>

        <div className="filter-actions">
          <button type="submit">
            Search
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={clearSearch}
          >
            Clear search
          </button>
        </div>

        <label>
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </form>

      {loading ? (
        <p role="status">Loading salary records…</p>
      ) : error ? (
        <div>
          <p role="alert">Could not load records: {error}</p>

          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          <p role="status">
            {data.total.toLocaleString()} matching records
            {search ? ` for “${search}”` : ''}
          </p>

          {data.items.length === 0 ? (
            <p>No salary records match this search and these filters.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Job title</th>
                    <th scope="col">Experience</th>
                    <th scope="col">Company location</th>
                    <th scope="col">Salary in USD</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((record) => (
                    <tr key={record.id}>
                      <td>{record.work_year}</td>
                      <td>{record.job_title}</td>

                      <td>
                        {experienceLabels[record.experience_level] ??
                          record.experience_level}
                      </td>

                      <td>{record.company_location}</td>
                      <td>{money.format(record.salary_in_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav
            className="filter-actions"
            aria-label="Salary record pages"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>

            <span>
              Page {data.total_pages === 0 ? 0 : data.page} of{' '}
              {data.total_pages}
            </span>

            <button
              type="button"
              disabled={page >= data.total_pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
    </section>
  )
}