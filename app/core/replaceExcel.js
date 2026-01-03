"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

/**
 * Keep only latest N .bak files next to the target
 */
function cleanupOldBackups(targetFile, keep = 3) {
  const dir = path.dirname(targetFile);
  const base = path.basename(targetFile);

  const files = fs
    .readdirSync(dir)
    .filter(f => f.startsWith(base) && f.endsWith(".bak"))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // newest first

  files.slice(keep).forEach(f => {
    try { fs.unlinkSync(path.join(dir, f.name)); } catch {}
  });
}

/**
 * Cleanup orphaned temp updated files older than X minutes
 */
function cleanupOrphanTempUpdatedFiles(tempDir, keepMinutes = 60) {
  const now = Date.now();
  fs.readdirSync(tempDir)
    .filter(f => f.startsWith("scrapper_updated_") && f.endsWith(".xlsm"))
    .forEach(f => {
      const full = path.join(tempDir, f);
      try {
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs > keepMinutes * 60 * 1000) {
          fs.unlinkSync(full);
        }
      } catch {}
    });
}

module.exports = async function replaceExcel() {
  const TEMP = process.env.TEMP || os.tmpdir();
  const reqFile = path.join(TEMP, "excel_replace_request.txt");

  // Optional housekeeping
  cleanupOrphanTempUpdatedFiles(TEMP, 60);

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

  if (!tempFile || !targetFile) {
    console.error("replace-excel: empty TEMP or TARGET");
    return;
  }

  if (!fs.existsSync(tempFile)) {
    console.error("replace-excel: temp file missing");
    return;
  }

  // Guard: never allow temp == target
  if (path.resolve(tempFile) === path.resolve(targetFile)) {
    console.error("replace-excel: temp file equals target file (abort)");
    return;
  }

  /* -------------------------------------------------
     Wait until ALL Excel processes are fully closed
     ------------------------------------------------- */
  while (true) {
    try {
      execSync('tasklist | findstr /i excel.exe', { stdio: 'ignore' });
    } catch {
      break; // Excel fully exited
    }
  }

  const backupFile = targetFile + ".bak";

  /* -------------------------------------------------
     Replace with rollback protection (cross-drive safe)
     ------------------------------------------------- */
  try {
    // Backup original (overwrite latest .bak)
    if (fs.existsSync(targetFile)) {
      fs.copyFileSync(targetFile, backupFile);
    }

    // Replace using COPY (works across drives)
    fs.copyFileSync(tempFile, targetFile);

    // Remove temp
    fs.unlinkSync(tempFile);

  } catch (err) {
    console.error("replace-excel: replace failed, rolling back", err.message);

    // Rollback to backup if available
    if (fs.existsSync(backupFile)) {
      try { fs.copyFileSync(backupFile, targetFile); } catch {}
    }

    // Reopen original Excel so user is never stuck
    try {
      execSync(`start "" excel "${targetFile}"`, { shell: "cmd.exe" });
    } catch {}

    return;
  }

  /* -------------------------------------------------
     Cleanup old backups (keep last 3)
     ------------------------------------------------- */
  cleanupOldBackups(targetFile, 3);

  /* -------------------------------------------------
     Write update success flag for Excel UI
     ------------------------------------------------- */
  const versionFile = path.join(TEMP, "excel_update_success.txt");

  let version = "unknown";
  try {
    const v = require("../version.json");
    version = v.version || version;
  } catch {}

  try {
    fs.writeFileSync(versionFile, "VERSION=" + version, "utf8");
  } catch {}

  /* -------------------------------------------------
     Append update log
     ------------------------------------------------- */
  const logDir = path.join(
    process.env.LOCALAPPDATA || TEMP,
    "Scrapper"
  );
  const logFile = path.join(logDir, "excel_update.log");

  try {
    fs.mkdirSync(logDir, { recursive: true });

    const logLine =
      new Date().toISOString().replace("T", " ").slice(0, 19) +
      " | UPDATED | " +
      targetFile +
      " | VERSION=" + version +
      "\n";

    fs.appendFileSync(logFile, logLine, "utf8");
  } catch {}

  /* -------------------------------------------------
     Reopen Excel (same filename, new version inside)
     ------------------------------------------------- */
  try {
    execSync(`start "" excel "${targetFile}"`, { shell: "cmd.exe" });
  } catch {}

  console.log("Excel replaced successfully");
};
