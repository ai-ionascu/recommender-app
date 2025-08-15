import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectMongo } from './config/mongo.js';

const PORT = process.env.PORT || 4001;

(async () => {
  await connectMongo();
  app.listen(PORT, () => console.log(`order-service listening on ${PORT}`));
})();
