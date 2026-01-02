const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { json } = require("stream/consumers");

const FLAG = path.join(os.tmpdir(), "excel_update.flag");
const META_URL =
    "https://raw.githubusercontent.com/Zaid-Marfani/Scrapper/refs/heads/main/config/excel_version.json";

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200)
                return reject(new Error("HTTP " + res.statusCode));

            let data = "";
            res.on("data", d => (data += d));
            res.on("end", () => resolve(JSON.parse(data)));
        }).on("error", reject);
    });
}

module.exports = async function checkExcelUpdate(currentVersion) {
    try {
        const meta = await fetchJson(META_URL);

        console.log("Flag path: " + FLAG);
        if (meta.version <= currentVersion) {

            console.log("No Update");

            fs.writeFileSync(FLAG, "NO_UPDATE", "utf8");
            return;
        }
        const EOL = "\r\n";

        const out =
            "UPDATE_AVAILABLE" + EOL +
            "VERSION=" + meta.version + EOL +
            "URL=" + meta.template_url;

        fs.writeFileSync(FLAG, out, "ascii");


        console.log(JSON.stringify(out));


        fs.writeFileSync(FLAG, out, "utf8");
    } catch (err) {
        fs.writeFileSync(
            FLAG,
            "ERROR\nMESSAGE=" + err.message,
            "utf8"
        );
    }
};
