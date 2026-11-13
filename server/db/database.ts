import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type DbInstance = Database.Database;

export function openDatabase(dbPath?: string): DbInstance {
  const resolved = dbPath || process.env.DATABASE_PATH || './data/sanatsahnede.db';
  if (resolved !== ':memory:') {
    const dir = path.dirname(path.resolve(resolved));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
