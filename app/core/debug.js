const fs = require("fs");
const path = require("path");
const paths = require("./paths");

const logDir = paths.LOGS;

try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {}

const debugFile = path.join(logDir, "debug_startup.txt");

fs.writeFileSync(
  debugFile,
  [
    "DEBUG START",
    `cwd: ${process.cwd()}`,
    `__dirname: ${__dirname}`,
    `files in cwd: ${fs.readdirSync(process.cwd()).join(", ")}`,
  ].join("\n"),
  "utf8"
);

function logDebug(msg) {
  fs.appendFileSync(debugFile, `\n${msg}`, "utf8");
  console.log(msg);
}

module.exports = { logDebug };
