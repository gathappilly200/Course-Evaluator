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
| `EVALUATIONS_API_KEY` | Secret the external application must send. A random one was generated for you. |
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

`POST /api/evaluations`

Headers:

```
Content-Type: application/json
x-api-key: <EVALUATIONS_API_KEY>        (or: Authorization: Bearer <key>)
```

Body: all students' results in one request (a bare JSON array is also accepted):

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
- Other errors: `400` invalid JSON, `401` wrong/missing key, `413` body over 5 MB,
  `415` missing `Content-Type: application/json`, `503` no key configured on the server.
- Up to 10,000 evaluations per request.

The **API setup** page in the app shows the same information with copy buttons.

### Reaching the API from the external application

- Same computer: `http://localhost:5000/api/evaluations`
- Same network: `http://<this-computer's-IP>:5000/api/evaluations` (allow Node.js through
  the Windows firewall)
- A cloud service: deploy this app to a host with a public HTTPS address (for example
  Render or Railway) and set the same `.env` values there.

## Security note

Only the ingest API is protected (by the API key). The summary page has no login, so
anyone who can open the app's address can see the results. Add authentication before
putting it on the public internet.
