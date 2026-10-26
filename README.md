# Answer Sheet Checker (MERN)

Upload photos of students' answer sheets from your phone. The app stores them in
Google Drive, uses Claude to read each sheet (student name, roll number, date,
questions and answers), grades every answer, and shows a summary table with
marks, correct/incorrect counts and accuracy for each student.

- **client/**: React + Vite (mobile-friendly)
- **server/**: Express + Mongoose (MongoDB), Google Drive API, Claude API

## 1. Settings (`.env` in this folder)

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string (already set) |
| `ANTHROPIC_API_KEY` | Claude API key from https://platform.claude.com/settings/keys |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client (see below) |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5173/api/google/callback` for `npm run dev` |

## 2. Create the Google OAuth client (one time, about 5 minutes)

1. Open https://console.cloud.google.com/ and create a project (or pick one).
2. **APIs & Services → Library**: enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform): choose
   *External*, fill in the app name and your email. Under **Audience / Test users**,
   add your own Google account.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add both
     - `http://localhost:5173/api/google/callback`
     - `http://localhost:5000/api/google/callback`
5. Copy the client ID and secret into `.env`.

The app only asks for the `drive.file` permission: it can see the files and
folders it creates, nothing else in your Drive.

## 3. Run

```bash
npm install
npm run dev
```

- On the computer, open http://localhost:5173 and click **Allow Google Drive access**
  the first time you upload. Google sign-in only works on `localhost`, so do this once
  on the computer; the permission is saved on the server.
- On your phone (same Wi-Fi), open `http://<computer-ip>:5173`. Vite prints the
  "Network" address when it starts. Windows may ask to allow Node.js through the firewall.

Production-style (one server on port 5000):

```bash
npm run build
npm start          # set GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
```

## How it works

1. **Create an exam** with a title, an optional answer key, and default marks per question.
2. **Upload photos**: each image is uploaded to Google Drive under
   `Answer Sheet Checker/<exam title>`.
3. **Start checking**: sheets are checked one by one in the background. The server
   downloads each image from Drive and sends it to Claude, which returns structured
   results. Totals are recomputed on the server. Checking continues even if you close
   the page, and resumes after a server restart.
4. **Results**: one row per student. Pages with the same roll number are combined.
   Tap a student to see each question, their answer, the correct answer and marks.
   Download as CSV.

Accuracy = correct answers ÷ questions found on the student's pages × 100.
An answer counts as correct when it is fully correct or earns at least half its marks.
