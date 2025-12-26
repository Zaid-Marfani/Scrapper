/**
 * Unified Events Extractor (GENERIC)
 * ---------------------------------
 * - No lastEvent
 * - Carrier-agnostic
 * - Keyword-based normalization
 */

const { convertDate } = require("./utils");

const KEYWORDS = {
  EMPTY_RELEASE: [
    "empty release",
    "empty pickup",
    "empty pick",
    "empty container",
    "empty gate",
    "gate out empty",
    "empty",
    "pickup"
  ],

  ETD: [
    "etd",
    "departure",
    "vessel departure",
    "loaded on vessel",
    "export loaded",
    "gate in"
  ],

  ETA: [
    "eta",
    "arrival",
    "vessel arrival",
    "estimated arrival",
  ]
};

function classifyLabel(label = "") {
  const l = label.toLowerCase();
  for (const [type, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => l.includes(w))) {
      return type;
    }
  }
  return null;
}

function extractEvents(rawEvents = []) {
  let emptyRel = null;
  let etd = null;
  let eta = null;

  for (const e of rawEvents) {
    if (!e?.text) continue;

    const type = classifyLabel(e.text);
    if (!type) continue;

    const date = convertDate(
      (e.date || "") + (e.time ? " " + e.time : "")
    );

    if (!date) continue;

    if (type === "EMPTY_RELEASE" && !emptyRel) emptyRel = date;
    if (type === "ETD" && !etd) etd = date;
    if (type === "ETA") eta = date; // last ETA wins
  }

  return { emptyRel, etd, eta };
}

module.exports = {
  extractEvents
};
