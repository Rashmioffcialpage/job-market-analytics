import { useState } from 'react'

type JobMatch = {
  job_title: string
  similarity: number
  records: number
  median_salary_usd: number
}

type SearchResult = {
  query: string
  matches: JobMatch[]
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function JobTitleFinder() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function findTitles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = input.trim()

    if (!title) {
      setError('Please enter a job title.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const params = new URLSearchParams({ title })

      const response = await fetch(
        `http://127.0.0.1:8001/api/salaries/similar-titles?${params}`,
      )

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }

      const data: SearchResult = await response.json()
      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to find similar job titles',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="title-finder-heading">
      <h2 id="title-finder-heading">AI Job Title Finder</h2>

      <p className="panel-description">
        Find titles in the historical dataset with similar words.
        Results use TF-IDF and cosine similarity.
      </p>

      <form className="filter-grid" onSubmit={findTitles}>
        <label>
          Enter a job title
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="For example: machine learning engineer"
          />
        </label>

        <div className="filter-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Finding titles…' : 'Find similar titles'}
          </button>
        </div>
      </form>

      {loading && <p role="status">Searching job titles…</p>}

      {error && <p role="alert">{error}</p>}

      {result && (
        <>
          <p>
            Results for <strong>{result.query}</strong>
          </p>

          {result.matches.length === 0 ? (
            <p>
              No titles with matching words were found. Try different
              words from a job title.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Job title</th>
                    <th scope="col">Text similarity</th>
                    <th scope="col">Records</th>
                    <th scope="col">Median salary</th>
                  </tr>
                </thead>

                <tbody>
                  {result.matches.map((match) => (
                    <tr key={match.job_title}>
                      <th scope="row">{match.job_title}</th>
                      <td>{(match.similarity * 100).toFixed(1)}%</td>
                      <td>{match.records.toLocaleString()}</td>
                      <td>{money.format(match.median_salary_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="data-note">
        Similarity compares title text; it is not a measure of skills
        or job suitability. These results use all records in the
        historical dataset, regardless of dashboard filters.
      </p>
    </section>
  )
}