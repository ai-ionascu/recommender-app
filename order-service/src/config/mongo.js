import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set');
  await mongoose.connect(uri, { autoIndex: true });
  console.log('[Mongo] connected');
}
