import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, '../../drizzle/0000_init.sql');

export type Database = PgliteDatabase<typeof schema>;

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;
let rawExecutor: ((sql: string) => Promise<void>) | null = null;

async function connectDatabase(): Promise<Database> {
  // Mode test unitaire : base PostgreSQL PGlite en mémoire isolée et rapide
  if (process.env.NODE_ENV === 'test' || config.databaseUrl.startsWith('pglite://memory')) {
    const client = new PGlite();
    await client.waitReady;
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    await client.exec(sql);
    rawExecutor = async (q: string) => {
      await client.exec(q);
    };
    return drizzlePglite(client, { schema });
  }

  // Tentative de connexion à PostgreSQL externe (Docker ou Cloud)
  if (!config.databaseUrl.startsWith('pglite://')) {
    try {
      const pool = new pg.Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 2500,
      });
      const testClient = await pool.connect();
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      await testClient.query(sql);
      testClient.release();
      rawExecutor = async (q: string) => {
        await pool.query(q);
      };
      return drizzlePg(pool, { schema }) as unknown as Database;
    } catch (err) {
      if (!config.pgliteFallback) {
        throw err;
      }
      // Repli transparent sur PostgreSQL embarqué (PGlite sur disque) si Docker n'est pas lancé
    }
  }

  fs.mkdirSync(config.pgliteDataDir, { recursive: true });
  const client = new PGlite(config.pgliteDataDir);
  await client.waitReady;
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  await client.exec(sql);
  rawExecutor = async (q: string) => {
    await client.exec(q);
  };
  return drizzlePglite(client, { schema });
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = connectDatabase().then((d) => {
      dbInstance = d;
      return d;
    });
  }
  return initPromise;
}

export async function resetDbForTests(): Promise<void> {
  await getDb();
  if (rawExecutor) {
    await rawExecutor(
      'TRUNCATE TABLE "transcription_jobs", "report_suggestions", "report_confirmations", "reports", "users" CASCADE;',
    );
  }
}
