import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set and at least 16 characters in production');
  }
  console.warn('[WARN] JWT_SECRET is not set or too short. Using development fallback secret.');
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/brainhire_db',
  jwtSecret: jwtSecret || 'dev-only-insecure-secret-change-me-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nvidiaApiKeys: (process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean),
  nvidiaApiBaseUrl: (process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, ''),
  nvidiaModel: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b',
  s3: {
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-2',
    bucket: process.env.S3_BUCKET || 'assets',
  },
};
