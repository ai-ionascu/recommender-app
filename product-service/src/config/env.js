import dotenv from 'dotenv';
dotenv.config();

const isLocalDev = process.env.NODE_ENV === 'development';

const pgHost = (isLocalDev && (!process.env.PG_HOST || process.env.PG_HOST === 'postgres'))
  ? 'localhost'
  : process.env.PG_HOST;

const port = (isLocalDev && (!process.env.PORT || process.env.PORT === '3000')) ? 3001 : process.env.PORT;

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(port),
  db: {
    host: pgHost,
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DB
  },
  images: {
    maxPerProduct: 3
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadUrl: process.env.CLOUDINARY_UPLOAD_URL,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
  },
  external: {
    unsplashKey: process.env.UNSPLASH_ACCESS_KEY,
    pexelsKey: process.env.PEXELS_API_KEY
  }
};
