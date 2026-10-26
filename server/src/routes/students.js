import { Router } from 'express';
import Evaluation from '../models/Evaluation.js';

const router = Router();

const isoDay = (date) => date.toISOString().slice(0, 10);
const round = (n) => Math.round(n * 10) / 10;

/** Dashboard data: one entry per student with their results in date order. */
router.get('/', async (req, res) => {
  const evaluations = await Evaluation.find()
    .sort({ testDate: 1, testName: 1 })
    .lean();

  const byStudent = new Map();
  for (const e of evaluations) {
    let s = byStudent.get(e.studentKey);
    if (!s) {
      s = { key: e.studentKey, studentName: e.studentName, nameUpdatedAt: e.updatedAt, tests: [] };
      byStudent.set(e.studentKey, s);
    }
    // Show the most recently received spelling of the name.
    if (e.updatedAt > s.nameUpdatedAt) {
      s.studentName = e.studentName;
      s.nameUpdatedAt = e.updatedAt;
    }
    s.tests.push({ testDate: isoDay(e.testDate), testName: e.testName, percentage: e.percentage });
  }

  const students = [...byStudent.values()]
    .map(({ nameUpdatedAt, ...s }) => {
      const scores = s.tests.map((t) => t.percentage);
      const latest = scores.at(-1);
      const previous = scores.at(-2);
      return {
        ...s,
        count: scores.length,
        latest,
        change: previous === undefined ? null : round(latest - previous),
        average: round(scores.reduce((a, b) => a + b, 0) / scores.length),
        best: Math.max(...scores),
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' }));

  res.json({
    students,
    totalEvaluations: evaluations.length,
    dateRange: evaluations.length
      ? { from: isoDay(evaluations[0].testDate), to: isoDay(evaluations.at(-1).testDate) }
      : null,
  });
});

export default router;
