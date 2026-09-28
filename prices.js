// Price list from the Google Sheet in COMPANY.priceSheet.
//
// Each tab has a header row; columns are found by name, so they can be moved:
//   Service | Windows (Outside or Outside/Inside) | Dirty (condition) | Size | Price
// The last prices loaded are kept on the phone so quoting works without signal.
const Prices = (() => {
  const CACHE_KEY = "squigee.prices";
  const COLUMNS = {
    service: ["service"],
    type: ["windows", "window service", "type"],
    condition: ["dirty", "condition", "window condition"],
    size: ["size", "item"],
    price: ["price", "unit price"],
  };
  // Sheet wording -> app keys (XS, S, M, L, XL, Screen, Skylight).
  const SIZES = {
    xs: "XS", "extra small": "XS",
    s: "S", small: "S",
    m: "M", medium: "M",
    l: "L", large: "L",
    xl: "XL", "extra large": "XL",
    screen: "Screen", screens: "Screen",
    skylight: "Skylight", skylights: "Skylight",
  };

  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const keyOf = (service, type, condition, size) => [service, type, condition, size].map(norm).join("|");

  let state = load(); // { table: { "windows|outside|heavy|m": 2 }, loadedAt, error }
  const listeners = [];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || { table: {} };
    } catch {
      return { table: {} };
    }
  }

  function save() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable – prices still work until the app is closed.
    }
  }

  // Minimal CSV parser (Google's export quotes every field).
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') field += text[++i];
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") row.push(field), (field = "");
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field), rows.push(row), (row = []), (field = "");
      } else field += ch;
    }
    if (field || row.length) row.push(field), rows.push(row);
    return rows;
  }

  // Turns one tab into lookup entries. Rows without a readable price are skipped.
  function readTab(service, csv) {
    const [header = [], ...rows] = parseCsv(csv);
    const col = {};
    for (const [name, aliases] of Object.entries(COLUMNS)) {
      col[name] = header.findIndex((h) => aliases.includes(norm(h)));
    }
    if (col.size < 0 || col.price < 0) throw new Error(`The ${service} tab needs "Size" and "Price" columns.`);

    const table = {};
    for (const r of rows) {
      const size = SIZES[norm(r[col.size])];
      const price = parseFloat(String(r[col.price] ?? "").replace(/[$,\s]/g, ""));
      if (!size || !Number.isFinite(price)) continue;
      const rowService = col.service >= 0 && r[col.service] ? r[col.service] : service;
      table[keyOf(rowService, r[col.type], r[col.condition], size)] = price;
    }
    return table;
  }

  async function refresh() {
    const { id, tabs } = COMPANY.priceSheet;
    try {
      const table = {};
      for (const [service, gid] of Object.entries(tabs)) {
        const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`The price sheet couldn't be read (error ${res.status}). Check it's shared as "Anyone with the link".`);
        Object.assign(table, readTab(service, await res.text()));
      }
      state = { table, loadedAt: new Date().toISOString() };
    } catch (err) {
      // A TypeError from fetch means no connection; anything else is a problem with the sheet.
      const offline = err instanceof TypeError || navigator.onLine === false;
      state = { ...state, error: offline ? "Couldn't reach the price sheet – using the last prices loaded." : err.message };
    }
    save();
    listeners.forEach((fn) => fn());
  }

  return {
    // Unit price for one line item, or null if the sheet has no matching row.
    lookup: (service, type, condition, size) => state.table[keyOf(service, type, condition, size)] ?? null,
    key: keyOf,
    refresh,
    onChange: (fn) => listeners.push(fn),
    status: () => ({ loadedAt: state.loadedAt, error: state.error, count: Object.keys(state.table).length }),
  };
})();
