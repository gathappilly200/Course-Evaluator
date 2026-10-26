// Posts made-up evaluations to the API, the same way the external application will.
// Usage: npm run sample            (server must be running)
//        npm run sample -- http://localhost:5000
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

const res = await fetch(`${baseUrl}/api/evaluations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
  body: JSON.stringify({ evaluations }),
});
console.log(res.status, await res.json());
