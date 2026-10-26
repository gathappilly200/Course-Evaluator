import { useEffect, useState } from 'react';
import { api } from '../api.js';

const EXAMPLE_BODY = `{
  "evaluations": [
    { "studentName": "Aarav Sharma", "testDate": "2026-10-05", "percentage": 82.5, "testName": "Unit Test 4" },
    { "studentName": "Diya Patel",   "testDate": "2026-10-05", "percentage": 91,   "testName": "Unit Test 4" }
  ]
}`;

const SUCCESS_RESPONSE = `HTTP 200
{ "received": 2, "created": 2, "updated": 0, "unchanged": 0 }`;

const ERROR_RESPONSE = `HTTP 422
{
  "error": "Validation failed. Nothing was saved.",
  "details": [
    { "index": 1, "field": "percentage", "message": "Must be between 0 and 100." }
  ]
}`;

const FIELDS = [
  ['studentName', 'string', 'Yes', 'Student’s full name. Results are grouped by name (case and extra spaces are ignored).'],
  ['testDate', 'string', 'Yes', 'Date of the test as YYYY-MM-DD, e.g. 2026-10-05. A full ISO date-time also works; only the date is kept.'],
  ['percentage', 'number', 'Yes', 'Percentage scored, 0 to 100. Decimals allowed. "82.5" or "82.5%" as text is also accepted.'],
  ['testName', 'string', 'No', 'Name of the test, e.g. "Unit Test 4". Needed if a student can take two tests on the same day.'],
];

const STATUS_CODES = [
  ['200', 'Saved. The response counts new, updated and unchanged results.'],
  ['400', 'The body is not valid JSON.'],
  ['401', 'The API key is missing or wrong.'],
  ['413', 'The body is larger than 5 MB.'],
  ['415', 'The Content-Type header is not application/json.'],
  ['422', 'One or more evaluations are invalid. Nothing was saved; details lists every problem by position (index starts at 0).'],
  ['503', 'The server has no API key configured.'],
];

function CopyBlock({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <button
        className="btn btn-small copy-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard can be unavailable on plain-http LAN addresses; the text is still selectable.
          }
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre><code>{text}</code></pre>
    </div>
  );
}

export default function ApiSetupPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.getApiStatus().then(setStatus).catch(() => setStatus({ error: true }));
  }, []);

  const endpoint = `${window.location.origin}/api/evaluations`;
  const curl = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '${EXAMPLE_BODY.replace(/\s*\n\s*/g, ' ')}'`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>API setup</h1>
          <p className="muted small">
            Configure your external application to send each student’s evaluation results here.
          </p>
        </div>
      </div>

      <section className="card">
        <h2>Endpoint</h2>
        <dl className="kv">
          <dt>Method</dt>
          <dd><code>POST</code></dd>
          <dt>URL</dt>
          <dd><CopyBlock text={endpoint} /></dd>
          <dt>Headers</dt>
          <dd>
            <code>Content-Type: application/json</code><br />
            <code>x-api-key: YOUR_API_KEY</code>
            <span className="muted small"> (or <code>Authorization: Bearer YOUR_API_KEY</code>)</span>
          </dd>
          <dt>API key</dt>
          <dd>
            {status === null && <span className="muted">Checking...</span>}
            {status?.apiKeyConfigured && (
              <span><span className="badge badge-ok">Configured</span> Copy the value of <code>EVALUATIONS_API_KEY</code> from the server’s <code>.env</code> file. It is never shown in the browser.</span>
            )}
            {status && !status.apiKeyConfigured && !status.error && (
              <span className="badge badge-bad">Not configured: set EVALUATIONS_API_KEY in .env and restart the server</span>
            )}
            {status?.error && <span className="badge badge-bad">Could not reach the server</span>}
          </dd>
        </dl>
        <p className="hint small">
          The URL above is how this browser reaches the app. Your external application needs an
          address it can reach: the same computer can use <code>http://localhost:5000/api/evaluations</code>;
          a cloud service needs this app deployed to a public HTTPS address.
        </p>
      </section>

      <section className="card">
        <h2>Request body</h2>
        <p className="muted small">
          Send all students’ results in one request: a JSON object with an <code>evaluations</code> array
          (a bare JSON array also works). Up to 10,000 evaluations per request.
        </p>
        <CopyBlock text={EXAMPLE_BODY} />
        <div className="table-wrap">
          <table className="table table-compact">
            <thead>
              <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
            </thead>
            <tbody>
              {FIELDS.map(([name, type, required, desc]) => (
                <tr key={name}><td><code>{name}</code></td><td>{type}</td><td>{required}</td><td>{desc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Responses</h2>
        <div className="two-col">
          <div><h3>Success</h3><CopyBlock text={SUCCESS_RESPONSE} /></div>
          <div><h3>Validation error</h3><CopyBlock text={ERROR_RESPONSE} /></div>
        </div>
        <div className="table-wrap">
          <table className="table table-compact">
            <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
            <tbody>
              {STATUS_CODES.map(([code, meaning]) => (
                <tr key={code}><td><code>{code}</code></td><td>{meaning}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Good to know</h2>
        <ul className="notes">
          <li><strong>Safe to resend.</strong> A result is identified by student name + test date + test name. Sending it again updates the percentage instead of creating a duplicate.</li>
          <li><strong>All or nothing.</strong> If any evaluation in a request is invalid, none are saved, so fix the listed problems and send the whole request again.</li>
          <li>The summary page picks up new results within 30 seconds.</li>
        </ul>
        <h3>Test from a terminal</h3>
        <CopyBlock text={curl} />
      </section>
    </>
  );
}
