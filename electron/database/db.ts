import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = process.env.VITE_DEV_SERVER_URL
  ? path.join(__dirname, '../../driving_telemetry.db') // Dev: project root
  : path.join(app.getPath('userData'), 'driving_telemetry.db'); // Prod: userData

const db = new Database(dbPath);

export const initDatabase = () => {
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create tables
  const schema = `
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      track TEXT,
      vehicle TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      distance_traveled REAL,
      avg_speed REAL,
      top_speed REAL,
      score INTEGER,
      notes TEXT,
      coast_time INTEGER DEFAULT 0,
      fuel_used REAL DEFAULT 0,
      efficiency REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      session_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      speed REAL,
      rpm REAL,
      gear INTEGER,
      throttle REAL,
      brake REAL,
      steering REAL,
      clutch REAL,
      pos_x REAL,
      pos_y REAL,
      pos_z REAL,
      gForceX REAL,
      gForceY REAL,
      gForceZ REAL,
      fuel REAL,
      engineTemp REAL,
      FOREIGN KEY (session_id) REFERENCES sessions (id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT,
      data TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions (id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `;

  db.exec(schema);

  // Migrations: Check if columns exist and add them if not
  const tables = db.prepare("PRAGMA table_info(sessions)").all() as any[];
  const columns = tables.map(c => c.name);

  if (!columns.includes('coast_time')) {
    db.exec('ALTER TABLE sessions ADD COLUMN coast_time INTEGER DEFAULT 0');
  }
  if (!columns.includes('fuel_used')) {
    db.exec('ALTER TABLE sessions ADD COLUMN fuel_used REAL DEFAULT 0');
  }
  if (!columns.includes('efficiency')) {
    db.exec('ALTER TABLE sessions ADD COLUMN efficiency REAL DEFAULT 0');
  }

  console.log('Database initialized at:', dbPath);
};

export default db;
