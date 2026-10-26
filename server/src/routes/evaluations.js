import { Router } from 'express';
import { config } from '../config.js';
import { requireDb } from '../db.js';
import { requireApiKey } from '../middleware/requireApiKey.js';
import Evaluation from '../models/Evaluation.js';
import { validateEvaluations } from '../validation.js';

const router = Router();

/**
 * Called by the external application.
 * Body: { "evaluations": [ { "studentName", "testDate", "percentage", "testName"? } ] }
 * All-or-nothing: if any record is invalid, nothing is saved and every problem is listed.
 */
// Key check first, so unauthenticated calls never touch the database.
router.post('/', requireApiKey, requireDb, async (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Send the body as JSON with the header Content-Type: application/json.' });
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
});

// Lets the setup page show whether the API key is configured, without revealing it.
router.get('/status', (req, res) => {
  res.json({ apiKeyConfigured: Boolean(config.apiKey) });
});

export default router;
