const fs = require("fs");
const path = require("path");

const Database = require("better-sqlite3");
const paths = require("./paths");

module.exports = function exportShippingLinesCsv() {
  const OUTPUT_FILE = path.join(paths.OUTPUT, "shipping_lines.csv");

  const db = new Database(paths.DB);

  // 🔥 Get column names dynamically
  const columns = db
    .prepare("PRAGMA table_info(shipping_lines)")
    .all()
    .map(c => c.name);

  // Safety check
  if (!columns.length) {
    throw new Error("shipping_lines table has no columns");
  }

  // Get data
  const rows = db.prepare("SELECT * FROM shipping_lines").all();

  const csv = [
    columns.join(","), // header row
    ...rows.map(row =>
      columns.map(col => `"${row[col] ?? ""}"`).join(",")
    )
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");
};


// CLI support
if (require.main === module) {
  exportShippingLinesToCsv();
}
