import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        logo_url TEXT,
        category TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        program_title TEXT NOT NULL,
        program_description TEXT
      );

      CREATE TABLE IF NOT EXISTS external_sources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        logo_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS epg_configs (
        id SERIAL PRIMARY KEY,
        last_generated TEXT,
        xml_url TEXT
      );
    `);
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}
