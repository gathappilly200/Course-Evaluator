import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, ROOT_DIR } from './config.js';
import { connectDb, requireDb } from './db.js';
import evaluationsRouter from './routes/evaluations.js';
import studentsRouter from './routes/students.js';

const app = express();
// Vercel caps request bodies at 4.5 MB; 4 MB still fits thousands of evaluations.
app.use(express.json({ limit: '4mb' }));

if (process.env.VERCEL) {
  app.get('/', (req, res) => {
    res.json({
      name: 'Student Evaluations API',
      endpoints: { health: 'GET /api/health', submitEvaluations: 'POST /api/evaluations' },
    });
  });
}

// Deployment check: open /api/health in a browser after deploying.
app.get('/api/health', async (req, res) => {
  let database = 'connected';
  try {
    await connectDb();
  } catch (err) {
    console.error('Health check: database connection failed:', err.message);
    database = config.mongoUri ? 'unreachable' : 'MONGODB_URI not set';
  }
  const ok = database === 'connected' && Boolean(config.apiKey);
  res.status(ok ? 200 : 503).json({ ok, database, apiKeyConfigured: Boolean(config.apiKey) });
});
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/students', requireDb, studentsRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Local production mode (npm start) serves the built React app too.
// On Vercel the frontend is its own deployment.
const clientDist = path.join(ROOT_DIR, 'client', 'dist');
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
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
    return res.status(413).json({ error: 'Request body is too large (max 4 MB).' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

// Vercel runs the exported app as a function; locally we start a server.
export default app;

if (!process.env.VERCEL) {
  app.listen(config.port, '0.0.0.0', (err) => {
    // Express 5 reports startup errors (e.g. port already in use) here instead of throwing.
    if (err) {
      console.error(`Could not start on port ${config.port}: ${err.message}`);
      process.exit(1);
    }
    console.log(`API server listening on http://localhost:${config.port}`);
  });
}
