import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine database path based on environment
const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
const dbPath = isDev
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
      yaw REAL DEFAULT 0,
      yaw_rate REAL DEFAULT 0,
      gForceX REAL,
      gForceY REAL,
      gForceZ REAL,
      fuel REAL,
      engineTemp REAL,
      damage_engine REAL DEFAULT 1,
      damage_transmission REAL DEFAULT 1,
      damage_suspension REAL DEFAULT 1,
      damage_brakes REAL DEFAULT 1,
      damage_aero REAL DEFAULT 1,
      tire_temp_fl REAL DEFAULT 0,
      tire_temp_fr REAL DEFAULT 0,
      tire_temp_rl REAL DEFAULT 0,
      tire_temp_rr REAL DEFAULT 0,
      tire_surface_temp_fl REAL DEFAULT 0,
      tire_surface_temp_fr REAL DEFAULT 0,
      tire_surface_temp_rl REAL DEFAULT 0,
      tire_surface_temp_rr REAL DEFAULT 0,
      tire_pressure_fl REAL DEFAULT 0,
      tire_pressure_fr REAL DEFAULT 0,
      tire_pressure_rl REAL DEFAULT 0,
      tire_pressure_rr REAL DEFAULT 0,
      throttle_delta REAL DEFAULT 0,
      brake_delta REAL DEFAULT 0,
      steering_delta REAL DEFAULT 0,
      speed_delta REAL DEFAULT 0,
      gforce_combined REAL DEFAULT 0,
      slip_angle_estimate REAL DEFAULT 0,
      is_coasting INTEGER DEFAULT 0,
      is_wots INTEGER DEFAULT 0,
      is_braking INTEGER DEFAULT 0,
      is_turning INTEGER DEFAULT 0,
      jerk_x REAL DEFAULT 0,
      jerk_y REAL DEFAULT 0,
      distance_traveled REAL DEFAULT 0,
      turn_radius REAL DEFAULT 0,
      pedal_overlap REAL DEFAULT 0,
      is_trail_braking INTEGER DEFAULT 0,
      oversteer_correction INTEGER DEFAULT 0,
      understeer_plough INTEGER DEFAULT 0,
      coasting_time_pct REAL DEFAULT 0,
      brake_bias_utilization REAL DEFAULT 0,
      true_tire_wear_fl REAL DEFAULT 1,
      true_tire_wear_fr REAL DEFAULT 1,
      true_tire_wear_rl REAL DEFAULT 1,
      true_tire_wear_rr REAL DEFAULT 1,
      actual_slip_ratio REAL DEFAULT 0,
      oil_temp REAL DEFAULT 0,
      lap_time REAL DEFAULT 0,
      last_lap REAL DEFAULT 0,
      best_lap REAL DEFAULT 0,
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

  // Migrations: Add new ML-critical columns to telemetry if missing
  const telColumns = db.prepare("PRAGMA table_info(telemetry)").all() as any[];
  const telColNames = telColumns.map((c: any) => c.name);

  if (!telColNames.includes('oil_temp')) {
    db.exec('ALTER TABLE telemetry ADD COLUMN oil_temp REAL DEFAULT 0');
  }
  if (!telColNames.includes('lap_time')) {
    db.exec('ALTER TABLE telemetry ADD COLUMN lap_time REAL DEFAULT 0');
  }
  if (!telColNames.includes('last_lap')) {
    db.exec('ALTER TABLE telemetry ADD COLUMN last_lap REAL DEFAULT 0');
  }
  if (!telColNames.includes('best_lap')) {
    db.exec('ALTER TABLE telemetry ADD COLUMN best_lap REAL DEFAULT 0');
  }

  // Migrations for Telemetry table
  const telemetryTables = db.prepare("PRAGMA table_info(telemetry)").all() as any[];
  const telemetryColumns = telemetryTables.map(c => c.name);

  const mlColumns = [
    'clutch',
    'yaw', 'yaw_rate',
    'throttle_delta', 'brake_delta', 'steering_delta', 'speed_delta',
    'gforce_combined', 'slip_angle_estimate', 'is_coasting', 'is_wots',
    'is_braking', 'is_turning', 'jerk_x', 'jerk_y', 'distance_traveled',
    'turn_radius', 'pedal_overlap', 'is_trail_braking',
    'oversteer_correction', 'understeer_plough', 'coasting_time_pct', 'brake_bias_utilization',
    'damage_engine', 'damage_transmission', 'damage_suspension', 'damage_brakes', 'damage_aero',
    'tire_temp_fl', 'tire_temp_fr', 'tire_temp_rl', 'tire_temp_rr',
    'tire_surface_temp_fl', 'tire_surface_temp_fr', 'tire_surface_temp_rl', 'tire_surface_temp_rr',
    'tire_pressure_fl', 'tire_pressure_fr', 'tire_pressure_rl', 'tire_pressure_rr',
    'true_tire_wear_fl', 'true_tire_wear_fr', 'true_tire_wear_rl', 'true_tire_wear_rr', 'actual_slip_ratio'
  ];

  for (const col of mlColumns) {
    if (!telemetryColumns.includes(col)) {
      let type = 'REAL DEFAULT 0';
      if (col.startsWith('is_')) {
        type = 'INTEGER DEFAULT 0';
      } else if (col.startsWith('damage_')) {
        type = 'REAL DEFAULT 1';
      }
      db.exec(`ALTER TABLE telemetry ADD COLUMN ${col} ${type}`);
    }
  }

  console.log('Database initialized at:', dbPath);
};

export default db;
