const Database = require('better-sqlite3');
const fs = require('fs');

try {
  const db = new Database('./data/telemetry.db', { fileMustExist: false });
  // check if telemetry table has data
  const data = db.prepare('SELECT * FROM telemetry LIMIT 1').all();
  console.log("DB rows: ", data.length);
} catch(e) {
  console.log("Error reading DB:", e.message);
}
