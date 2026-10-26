import express, { Router } from 'express';
import { requireDb } from '../db.js';
import Evaluation from '../models/Evaluation.js';
import { validateEvaluations } from '../validation.js';

const router = Router();

// The external app sends no headers, so read the body as JSON whatever its
// Content-Type (or lack of one).
const readJsonBody = express.json({ type: () => true, limit: '4mb' });

const EXAMPLE = {
  evaluations: [
    { studentName: 'Aarav Sharma', testDate: '2026-10-05', percentage: 82.5, testName: 'Unit Test 4' },
  ],
};

/**
 * Called by the external application: GET (or POST) with a JSON body
 * { "evaluations": [ { "studentName", "testDate", "percentage", "testName"? } ] }.
 * No headers or query parameters. All-or-nothing: if any record is invalid,
 * nothing is saved and every problem is listed.
 */
async function saveEvaluations(req, res) {
  if (req.body === undefined) {
    return res.status(400).json({
      error: 'No JSON body received. Send the evaluations as JSON in the request body.',
      example: EXAMPLE,
    });
  }
  const { records, errors } = validateEvaluations(req.body);
  if (errors) {
    return res.status(422).json({ error: 'Validation failed. Nothing was saved.', details: errors });
  }

  // Native pipeline update so updatedAt only moves when the name or score
  // actually changes; that keeps "unchanged" accurate when data is resent.
  // $literal stops a value such as "$name" being read as a field reference.
  const result = await Evaluation.collection.bulkWrite(
    records.map((r) => {
      const same = {
        $and: [
          { $eq: ['$studentName', { $literal: r.studentName }] },
          { $eq: ['$percentage', { $literal: r.percentage }] },
        ],
      };
      return {
        updateOne: {
          filter: { studentKey: r.studentKey, testDate: r.testDate, testName: r.testName },
          update: [
            {
              $set: {
                createdAt: { $ifNull: ['$createdAt', '$$NOW'] },
                updatedAt: { $cond: [same, '$updatedAt', '$$NOW'] },
                studentName: { $literal: r.studentName },
                percentage: { $literal: r.percentage },
              },
            },
          ],
          upsert: true,
        },
      };
    }),
    { ordered: true }
  );

  res.json({
    received: records.length,
    created: result.upsertedCount,
    updated: result.modifiedCount,
    unchanged: result.matchedCount - result.modifiedCount,
  });
}

router.get('/', readJsonBody, requireDb, saveEvaluations);
// Same thing for tools that can't attach a body to a GET request.
router.post('/', readJsonBody, requireDb, saveEvaluations);

export default router;
