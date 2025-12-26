const fs = require("fs");
const path = require("path");
const outDir = path.join(__dirname, "../../", "logs");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const runId = new Date().toISOString().replace(/[:.]/g,"-");
const debugFile = path.join(outDir, `debug_${runId}.txt`);

function logDebug(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try { fs.appendFileSync(debugFile, line, "utf8"); } catch(e){ console.error("LOG WRITE ERR", e.message); }
    console.log(line.trim());
}
module.exports = { logDebug };
