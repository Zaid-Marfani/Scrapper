const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const FLAG = path.join(process.env.TEMP || os.tmpdir(), "excel_downloaded.flag");

module.exports = function downloadExcel(url) {
  return new Promise((resolve, reject) => {

    const target = path.join(
      process.env.TEMP || os.tmpdir(),
      path.basename(decodeURIComponent(url))
    );

    const file = fs.createWriteStream(target);

    https.get(url, res => {
      if (res.statusCode !== 200) {
        fs.writeFileSync(
          FLAG,
          "ERROR\r\nMESSAGE=HTTP " + res.statusCode,
          "ascii"
        );
        file.close();
        return reject(new Error("HTTP " + res.statusCode));
      }

      res.pipe(file);

      file.on("finish", () => {
        file.close();

        const out =
          "DOWNLOADED\r\n" +
          "PATH=" + target;

        fs.writeFileSync(FLAG, out, "ascii");
        resolve();
      });
    }).on("error", err => {
      fs.writeFileSync(
        FLAG,
        "ERROR\r\nMESSAGE=" + err.message,
        "ascii"
      );
      reject(err);
    });
  });
};
