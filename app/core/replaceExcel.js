"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

module.exports = async function replaceExcel() {
  const TEMP = process.env.TEMP || os.tmpdir();
  const reqFile = path.join(TEMP, "excel_replace_request.txt");

  if (!fs.existsSync(reqFile)) {
    console.error("replace-excel: request file missing");
    return;
  }

  const lines = fs.readFileSync(reqFile, "utf8").split(/\r?\n/);

  const tempLine = lines.find(l => l.startsWith("TEMP="));
  const targetLine = lines.find(l => l.startsWith("TARGET="));

  if (!tempLine || !targetLine) {
    console.error("replace-excel: invalid request file");
    return;
  }

  const tempFile = tempLine.slice(5).trim();
  const targetFile = targetLine.slice(7).trim();

  if (!fs.existsSync(tempFile)) {
    console.error("replace-excel: temp file missing");
    return;
  }

  // 🔒 Wait until Excel is fully closed
  while (true) {
    try {
      execSync('tasklist | findstr /i excel.exe', { stdio: 'ignore' });
    } catch {
      break; // excel.exe not running
    }
  }

  const backupFile = targetFile + ".bak";

  // 🔒 Backup original
  if (fs.existsSync(targetFile)) {
    fs.copyFileSync(targetFile, backupFile);
  }

  // 🔁 CROSS-DRIVE SAFE REPLACE
  fs.copyFileSync(tempFile, targetFile);
  fs.unlinkSync(tempFile);

  // 🚀 Reopen Excel
  execSync(`start "" excel "${targetFile}"`, { shell: "cmd.exe" });

  console.log("Excel replaced successfully");
};
