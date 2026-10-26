import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatPercent } from '../api.js';
import TrendChart, { CHART_MARGIN } from '../components/TrendChart.jsx';

const REFRESH_MS = 30_000;

const SORTS = {
  name: { label: 'Name (A–Z)', compare: (a, b) => a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' }) },
  latest: { label: 'Latest score (high–low)', compare: (a, b) => b.latest - a.latest },
  average: { label: 'Average score (high–low)', compare: (a, b) => b.average - a.average },
  change: { label: 'Most improved', compare: (a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity) },
};

function Change({ value }) {
  if (value === null) return <span className="muted">–</span>;
  if (value === 0) return <span className="muted">0</span>;
  const up = value > 0;
  return (
    <span className={up ? 'delta-up' : 'delta-down'}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {up ? '+' : '−'}{Math.abs(value).toFixed(1)}
      <span className="sr-only">{up ? ' points up' : ' points down'} from the previous test</span>
    </span>
  );
}

function ScoreList({ tests }) {
  return (
    <table className="score-list">
      <thead>
        <tr><th>Date</th><th>Test</th><th className="num">Score</th></tr>
      </thead>
      <tbody>
        {[...tests].reverse().map((t) => (
          <tr key={`${t.testDate}|${t.testName}`}>
            <td>{formatDate(t.testDate)}</td>
            <td>{t.testName || '–'}</td>
            <td className="num">{formatPercent(t.percentage)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SummaryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.getStudents());
      setUpdatedAt(new Date());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // New evaluations can arrive from the external app at any time.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.students
      .filter((s) => !q || s.studentName.toLowerCase().includes(q))
      .sort(SORTS[sort].compare);
  }, [data, query, sort]);

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (!data) {
    return error
      ? <div className="alert alert-error">Could not load evaluations: {error}</div>
      : <p className="muted">Loading...</p>;
  }

  const { students, totalEvaluations, dateRange } = data;
  const classAverage = students.length
    ? students.reduce((sum, s) => sum + s.latest, 0) / students.length
    : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Evaluation summary</h1>
          <p className="muted small">
            {dateRange
              ? `Tests from ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`
              : 'Waiting for the first evaluations'}
          </p>
        </div>
        <div className="refresh">
          {updatedAt && <span className="muted small">Updated {updatedAt.toLocaleTimeString()}</span>}
          <button className="btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">Refresh failed: {error}</div>}

      {students.length === 0 ? (
        <section className="card empty">
          <h2>No evaluations received yet</h2>
          <p className="muted">
            Results appear here as soon as your external application sends them to the API.
          </p>
          <Link className="btn btn-primary" to="/api-setup">See how to connect the API</Link>
        </section>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span className="stat-label">Students</span><span className="stat-value">{students.length}</span></div>
            <div className="stat"><span className="stat-label">Evaluations received</span><span className="stat-value">{totalEvaluations}</span></div>
            <div className="stat"><span className="stat-label">Class average (latest test)</span><span className="stat-value">{formatPercent(Math.round(classAverage * 10) / 10)}</span></div>
          </div>

          <div className="filters">
            <input
              type="search"
              placeholder="Search student"
              aria-label="Search student"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
          </div>

          <section className={`card table-card${loading ? ' is-refreshing' : ''}`}>
            <div className="table-wrap">
              <table className="table summary-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="num">Tests</th>
                    <th className="num">Latest</th>
                    <th className="num">Change</th>
                    <th className="num">Average</th>
                    <th className="num">Best</th>
                    <th className="trend-col">
                      Score trend (%)
                      <div
                        className="trend-axis"
                        style={{ paddingLeft: CHART_MARGIN.left, paddingRight: CHART_MARGIN.right }}
                      >
                        <span>{formatDate(dateRange.from, { day: 'numeric', month: 'short' })}</span>
                        <span>{formatDate(dateRange.to, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="muted">No student matches “{query}”.</td></tr>
                  )}
                  {rows.map((s) => {
                    const open = expanded.has(s.key);
                    return (
                      <Fragment key={s.key}>
                        <tr className="student-row">
                          <td className="name-cell">
                            <button
                              className="disclosure"
                              aria-expanded={open}
                              onClick={() => toggle(s.key)}
                              title={open ? 'Hide scores' : 'Show all scores'}
                            >
                              <span className="chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
                              {s.studentName}
                            </button>
                          </td>
                          <td className="num" data-label="Tests">{s.count}</td>
                          <td className="num strong" data-label="Latest">{formatPercent(s.latest)}</td>
                          <td className="num" data-label="Change"><Change value={s.change} /></td>
                          <td className="num" data-label="Average">{formatPercent(s.average)}</td>
                          <td className="num" data-label="Best">{formatPercent(s.best)}</td>
                          <td className="trend-col">
                            <TrendChart tests={s.tests} domain={dateRange} studentName={s.studentName} />
                          </td>
                        </tr>
                        {open && (
                          <tr className="detail-row">
                            <td colSpan={7}><ScoreList tests={s.tests} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <p className="muted small">
            All graphs share one timeline ({formatDate(dateRange.from)} to {formatDate(dateRange.to)}) and
            a 0–100% scale. Hover or tap a graph to read each score, or open a student to see all
            of them. The page refreshes every 30 seconds.
          </p>
        </>
      )}
    </>
  );
}
