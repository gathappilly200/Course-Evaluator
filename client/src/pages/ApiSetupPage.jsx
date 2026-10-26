import { useState } from 'react';

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

// Vercel rejects URLs whose path + query exceed 32,768 characters (measured).
const URL_LIMIT_NOTE =
  'URLs are limited to about 32,000 characters, which is roughly 200 evaluations per request. ' +
  'For more, split them across several requests, or send the JSON in the request body instead.';

const STATUS_CODES = [
  ['200', 'Saved. The response counts new, updated and unchanged results.'],
  ['400', 'No evaluations received, or the data is not valid JSON (check it is URL-encoded).'],
  ['413', 'The request body is larger than 4 MB. Split the evaluations across several requests.'],
  ['414', 'The URL is too long (over about 32,000 characters). Split the evaluations across several requests.'],
  ['422', 'One or more evaluations are invalid. Nothing was saved; details lists every problem by position (index starts at 0).'],
  ['503', 'Server setup problem: the database connection is not configured or unreachable.'],
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
  const apiBase = (import.meta.env.VITE_PUBLIC_API_URL || window.location.origin).replace(/\/+$/, '');
  const endpoint = `${apiBase}/api/evaluations`;
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiBase);
  const compactJson = JSON.stringify(JSON.parse(EXAMPLE_BODY));
  const exampleUrl = `${endpoint}?data=${encodeURIComponent(compactJson)}`;
  const jsSnippet = `const payload = {
  evaluations: [
    { studentName: "Aarav Sharma", testDate: "2026-10-05", percentage: 82.5, testName: "Unit Test 4" },
  ],
};
const url = "${endpoint}?data=" + encodeURIComponent(JSON.stringify(payload));
const result = await fetch(url).then((res) => res.json());`;
  const curlQuery = `curl -G "${endpoint}" \\
  --data-urlencode 'data=${compactJson}'`;
  const curlBody = `curl -X GET "${endpoint}" \\
  -d '${compactJson}'`;

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
          <dd><code>GET</code></dd>
          <dt>URL</dt>
          <dd><CopyBlock text={endpoint} /></dd>
          <dt>Query parameter</dt>
          <dd>
            <code>data</code>: the evaluations JSON (below), URL-encoded, e.g. with{' '}
            <code>encodeURIComponent(JSON.stringify(payload))</code>
          </dd>
          <dt>Headers</dt>
          <dd>None needed</dd>
        </dl>
        <h3>Example request URL</h3>
        <CopyBlock text={exampleUrl} />
        <p className="muted small">{URL_LIMIT_NOTE}</p>
        {isLocal && (
          <p className="hint small">
            This is a local address. An external application on another machine can’t reach it;
            use the deployed back end’s URL instead.
          </p>
        )}
      </section>

      <section className="card">
        <h2>The evaluations JSON</h2>
        <p className="muted small">
          A JSON object with an <code>evaluations</code> array (a bare JSON array also works). This is
          the value of the <code>data</code> parameter, before URL-encoding.
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
          <li><strong>No key.</strong> Anyone who knows this URL can send results, so share it only with the external application.</li>
          <li>The summary page picks up new results within 30 seconds.</li>
        </ul>
        <h3>Calling it from JavaScript</h3>
        <CopyBlock text={jsSnippet} />
        <h3>Test from a terminal</h3>
        <CopyBlock text={curlQuery} />
      </section>

      <section className="card">
        <h2>Alternative: JSON in the request body</h2>
        <p className="muted small">
          For large batches, leave out <code>data</code> and send the same JSON as the body of a GET
          or POST request to the same URL. Bodies can be up to 4 MB (about 10,000 evaluations).
        </p>
        <CopyBlock text={curlBody} />
      </section>
    </>
  );
}
