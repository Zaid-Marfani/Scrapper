const fs = require("fs");
const path = require("path");

const { getAllShippingLines } = require("./db");
const paths = require("./paths");

function exportShippingLinesToCsv() {
  const OUTPUT_FILE = path.join(paths.OUTPUT, "shipping_lines.csv");

  const rows = getAllShippingLines();

  if (!rows.length) {
    console.log("⚠ No shipping lines found");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => `"${r[h] ?? ""}"`).join(",")
    )
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");
  
  console.log(`✅ Shipping lines CSV exported: ${OUTPUT_FILE}`);
}

module.exports = exportShippingLinesToCsv;

// CLI support
if (require.main === module) {
  exportShippingLinesToCsv();
}
