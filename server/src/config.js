import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..', '..');

// Locally the settings come from .env; on Vercel from the project's Environment Variables.
dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  mongoDb: process.env.MONGODB_DB || 'student_evaluations',
};

// Warn rather than exit: on Vercel an exit crashes every request, while a
// running server can report exactly which setting is missing.
if (!config.mongoUri) console.error('MONGODB_URI is not set: database requests will fail.');
