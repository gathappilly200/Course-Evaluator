import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDb() {
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb });
  console.log(`MongoDB connected (database: ${config.mongoDb})`);
}
