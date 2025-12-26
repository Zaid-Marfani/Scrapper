const fs = require("fs");
const path = require("path");
const https = require("https");
const unzipper = require("unzipper");

const UPDATE_URL = "https://github.com/Zaid-Marfani/Scrapper/blob/main/updates/version.json";

async function fetchJSON(url) {
  return new Promise(resolve => {
    https.get(url, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve(JSON.parse(data)));
    });
  });
}

async function checkAndUpdate() {
  const appDir = path.join(process.cwd(), "app");
  const local = require(path.join(appDir, "version.json"));
  const remote = await fetchJSON(UPDATE_URL);

  if (remote.version !== local.version) {
    const zip = path.join(process.cwd(), "app.zip");
    await new Promise(resolve => {
      https.get(remote.appZip, r => {
        r.pipe(fs.createWriteStream(zip)).on("finish", resolve);
      });
    });

    fs.rmSync(appDir, { recursive: true, force: true });
    fs.mkdirSync(appDir);

    await fs.createReadStream(zip)
      .pipe(unzipper.Extract({ path: appDir }))
      .promise();
  }
}

module.exports = { checkAndUpdate };
