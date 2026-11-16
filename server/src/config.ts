import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://niofar:niofar_dev_password@localhost:5432/niofar',
  pgliteFallback: process.env.PGLITE_FALLBACK !== 'false',
  pgliteDataDir: process.env.PGLITE_DATA_DIR || path.resolve(__dirname, '../../.data/pgdata'),
  jwtSecret: process.env.JWT_SECRET || 'niofar_dev_jwt_secret_key_change_in_production_32chars',
  deviceHashSalt: process.env.DEVICE_HASH_SALT || 'niofar_dev_device_salt_2026',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@niofar.sn',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'NioFar2026!',
  seedRelaisEmail: process.env.SEED_RELAIS_EMAIL || 'relais@niofar.sn',
  seedRelaisPassword: process.env.SEED_RELAIS_PASSWORD || 'Relais2026!',
  whisperApiUrl: process.env.WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions',
  whisperApiKey: process.env.WHISPER_API_KEY || '',
  whisperModel: process.env.WHISPER_MODEL || 'whisper-1',
  wolofAsrEnabled: process.env.WOLOF_ASR_ENABLED === 'true',
  wolofAsrUrl: process.env.WOLOF_ASR_URL || '',
  wolofAsrModel: process.env.WOLOF_ASR_MODEL || '',
  llmCategoryEnabled: process.env.LLM_CATEGORY_ENABLED === 'true',
  llmApiUrl: process.env.LLM_API_URL || '',
  llmApiKey: process.env.LLM_API_KEY || '',
  retentionDaysContact: Number(process.env.RETENTION_DAYS_CONTACT || 90),
  retentionDaysAudio: Number(process.env.RETENTION_DAYS_AUDIO || 180),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../.data/uploads'),
};
