const Database = require("better-sqlite3");
const path = require("path");
const schema = require("./schema");
const { logDebug } = require("./debug");
const paths = require("./paths");


const db = new Database(paths.DB);

// --- CREATE TABLE ONCE ---
db.prepare(`
  CREATE TABLE IF NOT EXISTS bl_results (
    bl TEXT PRIMARY KEY,
    status TEXT,
    pol TEXT,
    pod TEXT,
    emptyRel TEXT,
    etd TEXT,
    eta TEXT,
    lastEvent TEXT,
    vessel TEXT,
    cntType TEXT,
    nosCnt INTEGER,
    cntNo TEXT
  )
`).run();




// --- UPSERT RECORD ---
function upsertRecord(record) {
  const keys = Object.keys(record);
  const cols = keys.join(",");
  const placeholders = keys.map(k => `@${k}`).join(",");

  const updates = keys
    .filter(k => k !== "bl")
    .map(k => `${k}=excluded.${k}`)
    .join(",");

  const sql = `
    INSERT INTO bl_results (${cols})
    VALUES (${placeholders})
    ON CONFLICT(bl) DO UPDATE SET ${updates}
  `;

  logDebug(JSON.stringify(record));

  db.prepare(sql).run(record);
}

// --- READ ALL RECORDS ---
function getAllRecords() {
  return db.prepare("SELECT * FROM bl_results").all();
}

function migrateSchema(schema) {
  const existingCols = db
    .prepare("PRAGMA table_info(bl_results)")
    .all()
    .map(c => c.name);

  for (const col of schema) {
    if (!existingCols.includes(col.key)) {
      const type =
        col.type === "number" ? "INTEGER" : "TEXT";

      const sql = `ALTER TABLE bl_results ADD COLUMN ${col.key} ${type}`;
      db.prepare(sql).run();
    }
  }
}

migrateSchema(schema);

db.prepare(`
  INSERT OR IGNORE INTO bl_results (
    bl,
    eta,
    etd,
    cntNo,
    cntType
  ) VALUES (
    '__SEED__',
    NULL,
    NULL,
    NULL,
    NULL
  )
`).run();

function resetResults() {
  db.exec(`
    DELETE FROM bl_results;
  `);

  // Seed ONE dummy row to keep Excel lookups alive
  db.exec(`
    INSERT INTO bl_results (bl)
    VALUES ('__SEED__');
  `);
}




// ===============================
// SHIPPING LINES MASTER (ADMIN)
// ===============================
db.prepare(`
  CREATE TABLE IF NOT EXISTS shipping_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    scraper_key TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();


// --- MIGRATE shipping_lines (ADD url IF DB IS OLD) ---
const shippingCols = db
  .prepare("PRAGMA table_info(shipping_lines)")
  .all()
  .map(c => c.name);

if (!shippingCols.includes("url")) {
  db.prepare(`
    ALTER TABLE shipping_lines
    ADD COLUMN url TEXT
  `).run();
}

function getAllShippingLines() {
  return db.prepare("SELECT * FROM shipping_lines").all();
}


module.exports = {
  upsertRecord,
  getAllRecords,
  getAllShippingLines,
  resetResults
};