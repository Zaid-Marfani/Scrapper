/**
 * Scraper: KMTC
 * Version: 3.0.0
 * Last Verified: 2025-12-22
 *
 * Notes:
 * - lastEvent intentionally removed
 * - ETA / ETD / Empty Release normalized via core/events.js
 * - Multi-leg + multi-container safe
 */

const { logDebug } = require("../core/debug");
const { safeType, safeClick } = require("../core/action");

const { buildContainerSummary } = require("../core/containers");
const { normalizeContainer, formatContainerSummary } = require("../core/utils");
const { extractEvents } = require("../core/events");

function parseKmtcDateForSort(s) {
    if (!s) return null;
    const iso = s.replace(/\./g, "-").replace(" ", "T");
    const d = new Date(iso);
    return isNaN(d) ? null : d;
}

async function scrape(page, url, bl) {
    try {
        const blNo = bl.replace("KMTC", "");
        logDebug(`KMTC → ${url} ${blNo}`);

        /* ---------------- PAGE LOAD ---------------- */
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(3000);

        /* ---------------- INPUT BL ---------------- */
        await safeType(page, 'xpath=//*[@id="blNo"]', blNo);
        await safeClick(
            page,
            'xpath=/html/body/div/div[1]/div[2]/div[1]/form/div/table/tbody/tr/td[3]/a'
        );

        await page.waitForTimeout(6000);

        /* ---------------- WAIT FOR TABLE ---------------- */
        await page.waitForSelector("table.tbl_col", { timeout: 20000 });

        /* ---------------- TABLE PARSING ---------------- */
        const tableData = await page.evaluate(() => {
            const rows = Array.from(
                document.querySelectorAll("table.tbl_col tbody tr")
            );

            if (!rows.length) return null;

            const safeSplit = node => {
                if (!node || typeof node.innerText !== "string") return [];
                return node.innerText
                    .split("\n")
                    .map(t => t.trim())
                    .filter(Boolean);
            };

            const legs = [];
            const containers = new Map();

            for (const row of rows) {
                const tds = Array.from(row.querySelectorAll("td"));

                // ---- FULL ROW ----
                if (tds.length >= 7) {
                    const cntNo =
                        row.querySelector(".cntrNo_area")?.textContent?.trim() || null;
                    const type = tds[3]?.innerText?.trim() || null;

                    if (cntNo && /^[A-Z]{4}\d{7}$/.test(cntNo)) {
                        containers.set(cntNo, type);
                    }

                    const [pol, etd] = safeSplit(tds[5]);
                    const [pod, eta] = safeSplit(tds[6]);
                    const vessel =
                        tds[7]?.innerText
                            ?.replace(/^\d+\)/, "")
                            .trim() || null;

                    legs.push({ pol, etd, pod, eta, vessel });
                }

                // ---- CONTINUATION ROW ----
                else if (tds.length >= 3) {
                    const [pol, etd] = safeSplit(tds[0]);
                    const [pod, eta] = safeSplit(tds[1]);
                    const vessel =
                        tds[2]?.innerText
                            ?.replace(/^\d+\)/, "")
                            .trim() || null;

                    legs.push({ pol, etd, pod, eta, vessel });
                }
            }

            return {
                legs,
                containers: Array.from(containers, ([cntNo, type]) => ({ cntNo, type }))
            };
        });

        if (!tableData || !tableData.legs.length) {
            throw new Error("KMTC table parsed empty");
        }

        /* ---------------- FIRST / FINAL LEG ---------------- */
        const firstLeg = tableData.legs[0];

        const finalLeg =
            tableData.legs
                .map(l => ({ ...l, _eta: parseKmtcDateForSort(l.eta) }))
                .filter(l => l._eta)
                .sort((a, b) => b._eta - a._eta)[0] || firstLeg;

        const pol = firstLeg?.pol || null;
        const etd = firstLeg?.etd || null;
        const pod = finalLeg?.pod || null;
        const eta = finalLeg?.eta || null;
        const vessel = finalLeg?.vessel || null;

        /* ---------------- CONTAINERS ---------------- */
        const cntNumbers = tableData.containers.map(c => c.cntNo);
        const rawTypes = tableData.containers.map(c => c.type);

        const { cntNo, cntType, nosCnt } = buildContainerSummary({
            cntNumbers,
            rawTypes,
            normalizeContainer,
            formatContainerSummary
        });

        /* ---------------- EVENTS (DATES ONLY) ---------------- */
        const rawEvents = await page.evaluate(() => {
            const events = [];

            document.querySelectorAll(".location_detail li").forEach(li => {
                const text =
                    li.querySelector(".ts_scroll p")?.innerText
                        ?.replace(/\s+/g, " ")
                        .trim() || "";

                const dateNode = li.querySelector(".date");
                const date = dateNode?.childNodes[0]?.textContent?.trim() || "";
                const time = dateNode?.querySelector("span")?.innerText?.trim() || "";

                if (text && date) {
                    events.push({ text, date, time });
                }
            });

            return events;
        });

        const { emptyRel } = extractEvents(rawEvents);

        /* ---------------- FINAL RESULT ---------------- */
        const result = {
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

        logDebug("KMTC RESULT → " + JSON.stringify(result));
        return result;

    } catch (err) {
        logDebug("KMTC Error: " + err.message);
        return {};
    }
}

module.exports = {
    scrape,
    meta: {
        supports: [
            "pol",
            "pod",
            "emptyRel",
            "etd",
            "eta",
            "vessel",
            "cntType",
            "nosCnt",
            "cntNo"
        ]
    }
};
