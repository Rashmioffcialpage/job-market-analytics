import { useState } from 'react'
import type { FormEvent } from 'react'

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

  async function findTitles(event: FormEvent<HTMLFormElement>) {
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
        Enter a title to find similar titles in the historical dataset.
        The bars show how closely their words match your search.
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
          <h3>
            Results for “{result.query}”
          </h3>

          {result.matches.length === 0 ? (
            <p>
              No titles with matching words were found. Try different
              words from a job title.
            </p>
          ) : (
            <div className="experience-list">
              {result.matches.map((match) => {
                const percentage = Math.max(
                  0,
                  Math.min(100, match.similarity * 100),
                )

                return (
                  <article
                    className="experience-row"
                    key={match.job_title}
                  >
                    <div className="row-heading">
                      <strong>{match.job_title}</strong>
                      <span>{percentage.toFixed(1)}% text similarity</span>
                    </div>

                    <div className="bar-track" aria-hidden="true">
                      <div
                        className="bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p>
                      {match.records.toLocaleString()} matching dataset
                      {' '}
                      {match.records === 1 ? 'record' : 'records'}
                      {' · '}
                      Median salary: {money.format(match.median_salary_usd)}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      <p className="data-note">
        This feature uses TF-IDF and cosine similarity to compare title
        text. It does not measure skills or job suitability. Results use
        all records in the historical dataset, regardless of the dashboard
        filters.
      </p>
    </section>
  )
}