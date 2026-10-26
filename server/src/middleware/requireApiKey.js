import crypto from 'node:crypto';
import { config } from '../config.js';

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Accepts the key as `x-api-key: <key>` or `Authorization: Bearer <key>`. */
export function requireApiKey(req, res, next) {
  if (!config.apiKey) {
    return res.status(503).json({ error: 'EVALUATIONS_API_KEY is not configured on the server.' });
  }
  const bearer = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = req.get('x-api-key') || bearer || '';
  if (!provided || !safeEqual(provided, config.apiKey)) {
    return res.status(401).json({ error: 'Missing or invalid API key.' });
  }
  next();
}
