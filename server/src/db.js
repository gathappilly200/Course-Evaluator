import mongoose from 'mongoose';
import { config } from './config.js';

let connecting = null;

/**
 * Connects once and reuses the connection. On Vercel each function instance
 * keeps it between requests; a failed attempt is retried on the next request.
 */
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!config.mongoUri) return Promise.reject(new Error('MONGODB_URI is not set on the server.'));
  connecting ||= mongoose
    .connect(config.mongoUri, { dbName: config.mongoDb, serverSelectionTimeoutMS: 8000 })
    .then(() => console.log(`MongoDB connected (database: ${config.mongoDb})`))
    .catch((err) => {
      connecting = null;
      throw err;
    });
  return connecting;
}

export async function requireDb(req, res, next) {
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    const error = config.mongoUri
      ? 'Database unavailable. Check MONGODB_URI and that MongoDB Atlas Network Access allows this server.'
      : 'MONGODB_URI is not set on the server.';
    res.status(503).json({ error });
  }
}
