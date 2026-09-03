import { sql } from "@vercel/postgres";

let initialized = false;

export async function ensureTables() {
  if (initialized) return;

  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.warn("POSTGRES_URL is not set. Vercel Postgres database connection may fail.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      city VARCHAR(255),
      totalearned VARCHAR(64) NOT NULL,
      timestarted VARCHAR(32),
      timeended VARCHAR(32),
      day VARCHAR(32),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS places (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      clean_rating INTEGER NOT NULL DEFAULT 0,
      facilities_rating INTEGER NOT NULL DEFAULT 0,
      privacy_rating INTEGER NOT NULL DEFAULT 0,
      notes JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS door_messages (
      id VARCHAR(64) PRIMARY KEY,
      message TEXT NOT NULL,
      font_color VARCHAR(32) DEFAULT '#1e1b18',
      font VARCHAR(64) DEFAULT 'Sedgwick Ave',
      rotation REAL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  initialized = true;
}

export { sql };
