"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

module.exports = async function replaceExcel() {
  const TEMP = process.env.TEMP || os.tmpdir();
  const reqFile = path.join(TEMP, "excel_replace_request.txt");

  if (!fs.existsSync(reqFile)) {
    console.error("Replace request file missing");
    return;
  }

  const lines = fs.readFileSync(reqFile, "utf8").split(/\r?\n/);

  const tempLine = lines.find(l => l.startsWith("TEMP="));
  const targetLine = lines.find(l => l.startsWith("TARGET="));

  if (!tempLine || !targetLine) {
    console.error("Invalid replace request file");
    return;
  }

  const tempFile = tempLine.replace("TEMP=", "").trim();
  const targetFile = targetLine.replace("TARGET=", "").trim();

  // 🔒 Wait until Excel is fully closed
  while (true) {
    try {
      execSync('tasklist | findstr /i excel.exe', { stdio: 'ignore' });
    } catch {
      break; // excel.exe not running
    }
  }

  const backup = targetFile + ".bak";

  // Backup original
  if (fs.existsSync(targetFile)) {
    fs.copyFileSync(targetFile, backup);
  }

  // Replace
  fs.renameSync(tempFile, targetFile);

  // Relaunch Excel
  execSync(`start "" excel "${targetFile}"`, { shell: "cmd.exe" });

  console.log("Excel replaced successfully");
};
