const fs = require("fs");
const path = require("path");

const { getAllRecords } = require("./db");
const {
  recordToRow,
  getCsvHeader
} = require("./recordFactory");
const paths = require("./paths");

module.exports = function exportResultsToCsv() {
  const OUTPUT_FILE = path.join(paths.OUTPUT, "bl_results.csv");

  const records = getAllRecords();
  const header = getCsvHeader();

  const rows = records.map(recordToRow);

  const csv = [
    header.join(","),
    ...rows.map(r => r.map(v => `"${v ?? ""}"`).join(","))
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");

  console.log(`✅ bl_results.csv exported (${records.length} rows)`);
};
