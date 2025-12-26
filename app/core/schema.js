/**
 * Central data schema
 * - Order here = CSV column order
 * - Add new fields ONLY here in future
 */
module.exports = [
{ key: "bl",        header: "BL",          type: "text" },
  { key: "status",    header: "Status",        type: "text" },

  { key: "pol",       header: "POL",           type: "text" },
  { key: "pod",       header: "POD",           type: "text" },

  { key: "emptyRel",  header: "Empty Release", type: "date" },
  { key: "etd",       header: "ETD",           type: "date" },
  { key: "eta",       header: "ETA",           type: "date" },

  { key: "lastEvent", header: "Last Events",   type: "text" },
  { key: "vessel",    header: "Vessel",        type: "text" },

  // 👉 future:
{ key: "cntType", header: "Container Type", type: "text" },
{ key: "nosCnt", header: "No. of Containers", type: "number" },
{ key: "cntNo", header: "Containers No.", type: "text" }

];
