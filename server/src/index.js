import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, ROOT_DIR } from './config.js';
import { connectDb } from './db.js';
import evaluationsRouter from './routes/evaluations.js';
import studentsRouter from './routes/students.js';

const app = express();
// Room for a whole class's results in one request.
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/students', studentsRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the built React app is served from the same server.
const clientDist = path.join(ROOT_DIR, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large (max 5 MB).' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

await connectDb();
app.listen(config.port, '0.0.0.0', (err) => {
  // Express 5 reports startup errors (e.g. port already in use) here instead of throwing.
  if (err) {
    console.error(`Could not start on port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`API server listening on http://localhost:${config.port}`);
});
