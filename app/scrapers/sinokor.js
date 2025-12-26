/**
 * Scraper: SINOKOR
 * Version: 1.2.0
 * Last Verified: 2025-12-15
 *
 * Capabilities (knowledge-only):
 * - Multiple Containers per BL: ❌ No
 * - Trans-shipment Detection: ❌ No
 * - ETA Source: Direct XPath
 * - ETD Source: Direct XPath
 * - Empty Release: Direct XPath
 *
 * Notes:
 * - Site uses static HTML, no JS timeline
 * - BL lookup fails silently if BL is invalid
 * - Container-level info not exposed
 */

const { logDebug } = require("../core/debug");
const { safeText, safeClick, safeType, safeCheck, safeRadio, safeSelect } = require("../core/action")
const {
  extractContainerNumbers,
  buildContainerSummary
} = require("../core/containers");

const {
  normalizeContainer,
  formatContainerSummary
} = require("../core/utils");

const { extractEvents } = require("../core/events");

async function scrape(page, url, bl) {
  url = url + bl;
  logDebug("sinokor: opening page for " + url);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(2000);
    await safeClick(page, 'xpath=//*[@id="tglDetailInfo"]');

    let polRaw = await page.evaluate(() => {
      const el = document.querySelector("#arrPolnm");
      return el ? el.value : "";
    });

    let podRaw = await page.evaluate(() => {
      const el = document.querySelector("#arrPodnm");
      return el ? el.value : "";
    });


    let pol = null;
    let pod = null;

    if (polRaw) {
      const parts = polRaw
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      pol = parts.length ? parts[0] : null;
    }

    if (podRaw) {
      const parts = podRaw
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      pod = parts.length ? parts[parts.length - 1] : null;
    }

    const vessel = await page.evaluate(() => {
      const rows = document.querySelectorAll("#divDetailInfo table tr");
      let last = "";

      for (const row of rows) {
        if (row.innerText.includes("Vessel / Voyage")) continue;
        if (row.children.length > 0) {
          const txt = row.children[0].innerText;
          if (txt.includes("/")) last = txt;
        }
      }
      return last;
    });

    const rawEvents = await page.evaluate(() => {
      const events = [];
      const rows = document.querySelectorAll("#divDetailInfo table tr");

      for (let i = 0; i < rows.length; i++) {
        const header = rows[i].querySelector("th span");
        if (!header) continue;

        const label = header.innerText.trim();
        const dataRow = rows[i + 1];
        if (!dataRow) continue;

        const dateCell = dataRow.children[dataRow.children.length - 1];
        const date = dateCell?.innerText?.trim() || "";

        if (label && date) {
          events.push({ text: label, date });
        }
      }
      return events;
    });
    const { emptyRel, etd, eta } = extractEvents(rawEvents);

    const containers = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll("#tblFreetime tbody tr").forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length >= 2) {
          list.push({
            cntNo: tds[0].innerText.trim(),
            type: tds[1].innerText.trim()
          });
        }
      });
      return list;
    });

    const cntNumbers = containers.map(c => c.cntNo);
    const rawTypes = containers.map(c => c.type);

    const { cntNo, cntType, nosCnt } = buildContainerSummary({
      cntNumbers,
      rawTypes,
      normalizeContainer,
      formatContainerSummary
    });

    const lastEvent = null;


    logDebug(JSON.stringify({ pol, pod, emptyRel, etd, eta, lastEvent, vessel, cntNo, cntType, nosCnt }));

    return {
      pol,
      pod,
      emptyRel,
      etd,
      eta,
      vessel,
      cntType,
      nosCnt,
      cntNo
    };

  } catch (err) {
    logDebug("sinokor error: " + err.message);
    return {};
  }
};

module.exports = {
  scrape,
  meta: {
    supports: ["pol", "pod", "emptyRel", "etd", "eta", "lastevent", "vessel", "nosCnt", "cntType", "cntNo"]
  }
};
