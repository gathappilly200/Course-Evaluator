// Sends made-up evaluations to the API, the same way the external application will:
// a GET request with a JSON body and no headers.
// Usage: npm run sample                                  (local server must be running)
//        npm run sample -- https://course-evaluator-back-end.vercel.app
import http from 'node:http';
import https from 'node:https';
import { config } from '../src/config.js';

const baseUrl = process.argv[2] || `http://localhost:${config.port}`;

const students = ['Aarav Sharma', 'Diya Patel', 'Ishaan Nair', 'Meera Iyer', 'Rohan Gupta', 'Sara Thomas'];
const tests = [
  ['2026-06-15', 'Unit Test 1'],
  ['2026-07-13', 'Unit Test 2'],
  ['2026-08-10', 'Mid Term'],
  ['2026-09-07', 'Unit Test 3'],
  ['2026-10-05', 'Unit Test 4'],
];

const evaluations = [];
students.forEach((studentName, s) => {
  let score = 55 + s * 6;
  tests.forEach(([testDate, testName], t) => {
    // Deterministic wobble so every student gets a different shape.
    score = Math.max(20, Math.min(100, score + ((s * 7 + t * 13) % 21) - 9));
    // Not every student sits every test.
    if ((s + t) % 7 === 6) return;
    evaluations.push({ studentName, testDate, testName, percentage: score });
  });
});

// fetch() refuses a body on GET, so use the http module directly. Node doesn't
// frame a GET body on its own, so give the length that other HTTP clients add automatically.
const url = new URL('/api/evaluations', baseUrl);
const body = JSON.stringify({ evaluations });
const options = { method: 'GET', headers: { 'Content-Length': Buffer.byteLength(body) } };
const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => console.log(res.statusCode, data));
});
req.on('error', (err) => console.error('Request failed:', err.message));
req.end(body);
