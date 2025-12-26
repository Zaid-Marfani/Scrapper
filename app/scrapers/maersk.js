/**
 * Scraper: Maersk
 * Version: 2.0.0
 * Last Verified: 2025-12-20
 *
 * Event logic delegated to core/events.js
 * lastEvent = shipment lifecycle (consignee-centric)
 */

const { logDebug } = require("../core/debug");
const { safeText } = require("../core/action");
const { normalizeContainer, formatContainerSummary } = require("../core/utils");
const { extractEvents } = require("../core/events");
const {
    extractContainerNumbers,
    buildContainerSummary
} = require("../core/containers");


async function scrape(page, url, bl) {
    url = url + (bl || "");
    logDebug("maersk: opening page for " + url);

    try {
        // ------------------ INIT ------------------
        let loading = "";
        let destination = "";
        let vessel = "";

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 6000 });
        await page.waitForTimeout(2500);

        // Cookie popup
        try {
            await page.click("button:has-text('Accept')", { timeout: 1500 });
        } catch { }

        // ------------------ RAW EVENTS (TIMELINE) ------------------
        const rawEvents = await page.evaluate(() => {
            const events = [];

            const ul = document.querySelector("#transport-plan__container__0 ul");
            if (!ul) return events;

            const lis = [...ul.querySelectorAll("li")];

            for (const li of lis) {
                const milestone = li.querySelector('div[data-test="milestone"]');
                if (!milestone) continue;

                const label =
                    milestone.querySelector("span")?.textContent?.trim() || "";

                const date =
                    milestone
                        .querySelector('span[data-test="milestone-date"]')
                        ?.textContent?.trim() || "";

                if (label) {
                    events.push({ text: label, date });
                }
            }

            return events;
        });


        // ------------------ EVENTS (NORMALIZED) ------------------
        const { emptyRel, etd, eta } = extractEvents(rawEvents);

        // ------------------ POL / POD ------------------
        loading = await safeText(
            page,
            'xpath=//*[@id="transport-plan__container__0"]//li[1]//div[@data-test="location-name"]//strong'
        );

        destination = await safeText(
            page,
            'xpath=//*[@id="transport-plan__container__0"]//li[last()]//div[@data-test="location-name"]//strong'
        );

        // ------------------ VESSEL ------------------
        vessel = await page.evaluate(() => {
            const ul = document.querySelector("#transport-plan__container__0 ul");
            if (!ul) return "";

            const lis = [...ul.querySelectorAll("li")];
            for (const li of lis) {
                const milestone = li.querySelector('div[data-test="milestone"]');
                if (!milestone) continue;

                for (const node of milestone.childNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE &&
                        node.textContent.includes("(")
                    ) {
                        return node.textContent.replace(/[()]/g, "").trim();
                    }
                }
            }
            return "";
        });

        let cntNumbers = [];
        let rawTypes = [];

        const cntdetails = await page.$(
            'mc-text-and-icon[data-test="container-details"]'
        );

        if (cntdetails) {
            // container number (NOT in body text)
            const noEl = await cntdetails.$('span.mds-text--medium-bold');
            if (noEl) {
                const no = (await noEl.textContent())?.trim();
                if (no) cntNumbers.push(no);
            }

            // container type
            const rawTypeEl = await cntdetails.$('span:last-of-type');
            if (rawTypeEl) {
                const rawType = (await rawTypeEl.textContent())?.trim();
                if (rawType) rawTypes.push(rawType);
            }
        }

        // normalize via shared helper
        const { cntNo, cntType, nosCnt } = buildContainerSummary({
            cntNumbers,
            rawTypes,
            normalizeContainer,
            formatContainerSummary
        });

        const lastEvent = null;



        // ------------------ DEBUG ------------------
        // logDebug(JSON.stringify({loading,destination,emptyRel,etd,eta,lastEvent,vessel,cntNo,cntType}));

        // ------------------ FINAL RESULT ------------------
        return {
            pol: loading || null,
            pod: destination || null,
            emptyRel,
            etd,
            eta,
            lastEvent,
            vessel: vessel || null,
            cntNo: cntNo || null,
            cntType: cntType || null,
            nosCnt
        };

    } catch (err) {
        logDebug("maersk error: " + err.message);
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
            "lastEvent",
            "vessel",
            "cntNo",
            "cntType",
            "nosCnt"
        ]
    }
};
