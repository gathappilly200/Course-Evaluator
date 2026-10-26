# Student Evaluations (MERN)

An external application sends students' evaluation results (student name, test date,
percentage scored) to this app's API. The summary page lists every student with their
latest, average and best score, plus a line graph of their scores across tests.

- **server/**: Express + Mongoose (MongoDB): the ingest API and the dashboard data
- **client/**: React + Vite: the summary page and an API setup page

## Settings (`.env` in this folder)

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB connection string. Data goes in the `student_evaluations` database (override with `MONGODB_DB`). |
| `PORT` | API server port (default 5000). |

## Run

```bash
npm install
npm run dev        # API on :5000, web app on http://localhost:5173
npm run sample     # (optional, in a second terminal) sends demo data for 6 students
```

Production-style, one server on port 5000:

```bash
npm run build
npm start          # open http://localhost:5000
```

## The API

`GET https://course-evaluator-back-end.vercel.app/api/evaluations?data=<URL-encoded JSON>`

No headers needed. Put the evaluations JSON in the `data` query parameter, URL-encoded:

```js
const url = 'https://course-evaluator-back-end.vercel.app/api/evaluations?data=' +
  encodeURIComponent(JSON.stringify(payload));
const result = await fetch(url).then((res) => res.json());
```

Vercel limits URLs to 32,768 characters, which is roughly 200 evaluations per request.
For bigger batches, split them, or leave out `data` and send the same JSON as the body of
a GET or POST request to the same URL (up to 4 MB, about 10,000 evaluations).

The JSON (a bare JSON array is also accepted):

```json
{
  "evaluations": [
    { "studentName": "Aarav Sharma", "testDate": "2026-10-05", "percentage": 82.5, "testName": "Unit Test 4" },
    { "studentName": "Diya Patel",   "testDate": "2026-10-05", "percentage": 91,   "testName": "Unit Test 4" }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `studentName` | yes | Results are grouped by name; case and extra spaces are ignored. |
| `testDate` | yes | `YYYY-MM-DD` (a full ISO date-time also works; only the date is kept). |
| `percentage` | yes | 0–100, decimals allowed. |
| `testName` | no | Distinguishes two tests on the same day. |

Response `200`:

```json
{ "received": 2, "created": 2, "updated": 0, "unchanged": 0 }
```

- **Safe to resend.** A result is identified by student + test date + test name;
  sending it again updates the percentage instead of duplicating it.
- **All or nothing.** If any record is invalid the API returns `422`, saves nothing,
  and lists every problem with its position (`index`, from 0) and field.
- Other errors: `400` no data or invalid JSON (check it is URL-encoded), `413` body over
  4 MB, `414` URL too long, `503` database not configured or unreachable.
- There is no key, so anyone who knows the URL can send results.

Try it from a terminal:

```bash
curl -G "https://course-evaluator-back-end.vercel.app/api/evaluations" \
  --data-urlencode 'data={"evaluations":[{"studentName":"Aarav Sharma","testDate":"2026-10-05","percentage":82.5}]}'
```

The **API setup** page in the app shows the same information with copy buttons.

## Deployment (Vercel)

Two Vercel projects from this repository:

| Project | Root Directory | URL |
|---|---|---|
| Back end | `server` | https://course-evaluator-back-end.vercel.app |
| Front end | `client` | its own Vercel URL |

**Back end**: set `MONGODB_URI` (same value as in your local `.env`) in Vercel → Project →
Settings → Environment Variables, then redeploy.

In MongoDB Atlas → Network Access, allow `0.0.0.0/0`, because Vercel's IP addresses change.
Check the deployment at `https://course-evaluator-back-end.vercel.app/api/health`. It returns
`{"ok":true,"database":"connected"}` when the database is reachable.

**Front end**: `client/vercel.json` forwards `/api/*` to the back end, so no extra settings
are needed. `client/.env.production` holds the back-end URL shown on the API setup page.

The external application calls `https://course-evaluator-back-end.vercel.app/api/evaluations`.

## Security note

Nothing is password-protected. Anyone who knows the API URL can send or overwrite results,
and anyone who can open the summary page can see them. Add a key or login if that becomes
a concern.
