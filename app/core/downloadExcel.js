const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const FLAG = path.join(os.tmpdir(), "excel_downloaded.flag");

module.exports = function downloadExcel(url) {
  return new Promise((resolve, reject) => {
    const target = path.join(
      os.tmpdir(),
      path.basename(url)
    );

    const file = fs.createWriteStream(target);

    https.get(url, res => {
      if (res.statusCode !== 200)
        return reject(new Error("HTTP " + res.statusCode));

      res.pipe(file);
      file.on("finish", () => {
        file.close();
        fs.writeFileSync(
          FLAG,
          `DOWNLOADED\r\nPATH=${target}`,
          "utf8"
        );
        resolve();
      });
    }).on("error", reject);
  });
};
