export const MAX_RECORDS_PER_REQUEST = 10000;

export function studentKeyOf(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// YYYY-MM-DD, optionally followed by an ISO time ("2026-03-14T09:30:00Z").
// Only the calendar date is kept, as written, so time zones can't shift the day.
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function parseTestDate(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(DATE_RE);
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Rejects impossible dates such as 2026-02-30.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

function parsePercentage(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*%?\s*$/.test(value)) {
    return Number(value.replace('%', ''));
  }
  return NaN;
}

/**
 * Validates the request body. Accepts `{ "evaluations": [...] }` or a bare array.
 * Returns `{ records }` when every item is valid, otherwise `{ errors }`.
 */
export function validateEvaluations(body) {
  const items = Array.isArray(body) ? body : body?.evaluations;
  if (!Array.isArray(items)) {
    return { errors: [{ message: 'Body must be a JSON object with an "evaluations" array (or a JSON array).' }] };
  }
  if (items.length === 0) return { errors: [{ message: '"evaluations" is empty.' }] };
  if (items.length > MAX_RECORDS_PER_REQUEST) {
    return { errors: [{ message: `Too many evaluations (max ${MAX_RECORDS_PER_REQUEST} per request).` }] };
  }

  const errors = [];
  const records = [];

  items.forEach((item, index) => {
    const fail = (field, message) => errors.push({ index, field, message });
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      fail(null, 'Each evaluation must be an object.');
      return;
    }

    const studentName = typeof item.studentName === 'string' ? item.studentName.trim().replace(/\s+/g, ' ') : '';
    if (!studentName) fail('studentName', 'Required, non-empty string.');
    else if (studentName.length > 200) fail('studentName', 'Must be at most 200 characters.');

    const testDate = parseTestDate(item.testDate);
    if (!testDate) fail('testDate', 'Required, a valid date in YYYY-MM-DD format.');

    const percentage = parsePercentage(item.percentage);
    if (!Number.isFinite(percentage)) fail('percentage', 'Required, a number from 0 to 100.');
    else if (percentage < 0 || percentage > 100) fail('percentage', 'Must be between 0 and 100.');

    let testName = '';
    if (item.testName !== undefined && item.testName !== null) {
      if (typeof item.testName !== 'string') fail('testName', 'Must be a string when provided.');
      else if (item.testName.trim().length > 200) fail('testName', 'Must be at most 200 characters.');
      else testName = item.testName.trim();
    }

    records.push({
      studentName,
      studentKey: studentName ? studentKeyOf(studentName) : '',
      testDate,
      testName,
      percentage: Math.round(percentage * 100) / 100,
    });
  });

  return errors.length ? { errors } : { records };
}
