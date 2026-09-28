// ---------- Constants ----------
const STORAGE_KEY = "squigee.quotes";
const CURRENT_KEY = "squigee.currentQuoteId";

// Alphabetical. `screen` is where tapping the service starts its workflow.
const SERVICES = [
  { name: "Christmas Lights" },
  { name: "Gutter" },
  { name: "Solar" },
  { name: "Windows", screen: "window-details" },
];

// Window sizes add up to the header total; extras are counted separately.
const WINDOW_SIZES = ["XS", "S", "M", "L", "XL"];
const EXTRAS = ["Screen", "Skylight"];
const SIZES = [...WINDOW_SIZES, ...EXTRAS];

// ---------- Pricing ----------
// Unit price in dollars for one line item (e.g. key "M" = medium windows), or
// null when the price sheet has no matching row. Prices are frozen on a quote
// when it's sent, so later price-sheet edits don't change quotes already sent.
function priceKey(service, key, d) {
  return Prices.key(service, d.windowService, d.windowCondition, key);
}

function unitPrice(q, service, key, d) {
  const frozen = q.sentPrices?.[priceKey(service, key, d)];
  return frozen ?? Prices.lookup(service, d.windowService, d.windowCondition, key);
}

// ---------- Saved quotes ----------
// All quotes live in localStorage so nothing is lost on a refresh in the field.
function loadQuotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function loadCurrentId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

function saveQuotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    localStorage.setItem(CURRENT_KEY, current ? current.id : "");
  } catch {
    // Storage unavailable (e.g. private mode) – the app still works for this session.
  }
}

function newQuote() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    number: Math.max(1000, ...quotes.map((q) => q.number || 0)) + 1,
    createdAt: new Date().toISOString(),
    contact: { firstName: "", lastName: "", street: "", suite: "", city: "", state: "", zip: "", phone: "", email: "" },
    notes: "",
    services: {}, // service name -> details, e.g. services.Windows
  };
}

function isEmpty(q) {
  return !Object.values(q.contact).some(Boolean) && !q.notes && !Object.keys(q.services).length;
}

const quotes = loadQuotes();
let current = quotes.find((q) => q.id === loadCurrentId()) || null;

// ---------- Formatting ----------
const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ");
const streetLine = (c) => [c.street, c.suite && `Suite ${c.suite}`].filter(Boolean).join(", ");
const cityLine = (c) => [c.city, [c.state, c.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
const oneLineAddress = (c) => [streetLine(c), cityLine(c)].filter(Boolean).join(", ");
const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const shortDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ---------- Navigation ----------
// Each screen gets a history entry so the phone's back button/gesture works.
// Home is always the first entry, so "Done" can unwind straight back to it.
const PREVIOUS = {
  prior: "home",
  contact: "home",
  services: "contact",
  "window-details": "services",
  "window-count": "window-details",
  quote: "home",
};
const NEEDS_QUOTE = ["contact", "services", "window-details", "window-count", "quote"];
const onShow = {};

function screenId(hash = location.hash) {
  const id = hash.slice(1);
  return document.getElementById(id)?.classList.contains("screen") ? id : "home";
}

function show(id) {
  if (NEEDS_QUOTE.includes(id) && !current) id = "home";
  for (const screen of document.querySelectorAll(".screen")) screen.hidden = screen.id !== id;
  renderContactStrip(document.querySelector(`#${id} .contact-strip`));
  onShow[id]?.();
  window.scrollTo(0, 0);
  document.querySelector(`#${id} h1`).focus({ preventScroll: true });
}

function go(id, extra = {}) {
  history.pushState({ ...extra, depth: (history.state?.depth || 0) + 1 }, "", `#${id}`);
  show(id);
}

function back() {
  if (history.state?.depth > 0) history.back();
  else {
    const prev = PREVIOUS[screenId()] || "home";
    history.replaceState({ depth: 0 }, "", `#${prev}`);
    show(prev);
  }
}

function goHome() {
  const depth = history.state?.depth || 0;
  if (depth > 0) history.go(-depth);
  else show("home");
}

window.addEventListener("popstate", () => show(screenId()));

// First Last · Street under the header, so the crew knows whose quote this is.
function renderContactStrip(strip) {
  if (!strip) return;
  const c = current.contact;
  const name = fullName(c);
  const parts = [name && el("span", "strip-name", name), c.street && el("span", "strip-street", c.street)].filter(Boolean);
  if (parts.length === 2) parts.splice(1, 0, el("span", null, "·"));
  strip.replaceChildren(...(parts.length ? parts : [el("span", "strip-street", "No contact info – tap to add")]));
}

// Tapping the strip edits the contact, then returns to the screen it came from.
for (const strip of document.querySelectorAll(".contact-strip")) {
  strip.addEventListener("click", () => go("contact", { returnAfterContact: true }));
}
for (const btn of document.querySelectorAll(".back")) btn.addEventListener("click", back);
for (const btn of document.querySelectorAll(".home-btn")) btn.addEventListener("click", goHome);

// ---------- Main ----------
document.getElementById("new-quote").addEventListener("click", () => {
  // Drop abandoned quotes that never had anything entered.
  for (let i = quotes.length - 1; i >= 0; i--) if (isEmpty(quotes[i])) quotes.splice(i, 1);
  current = newQuote();
  quotes.push(current);
  saveQuotes();
  go("contact");
});
document.getElementById("view-prior").addEventListener("click", () => go("prior"));

// ---------- Prior quotes ----------
const priorList = document.getElementById("prior-list");
const priorSearch = document.getElementById("prior-search");
const priorEmpty = document.getElementById("prior-empty");

// Every word typed must appear somewhere in the name or address.
function matchesSearch(q, text) {
  const c = q.contact;
  const haystack = `${fullName(c)} ${oneLineAddress(c)}`.toLowerCase();
  return text.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

priorSearch.addEventListener("input", () => onShow.prior());

onShow.prior = () => {
  // By last name, then first name, then address. Quotes without a name go last.
  const compare = (x, y) => (!x - !y) || x.localeCompare(y, undefined, { sensitivity: "base" });
  const byName = (a, b) =>
    compare(a.contact.lastName, b.contact.lastName) ||
    compare(a.contact.firstName, b.contact.firstName) ||
    compare(oneLineAddress(a.contact), oneLineAddress(b.contact));
  const saved = quotes.filter((q) => !isEmpty(q));
  const list = saved.filter((q) => matchesSearch(q, priorSearch.value)).sort(byName);

  priorList.replaceChildren(
    ...list.map((q) => {
      const c = q.contact;
      const btn = el("button", "prior-item");
      btn.type = "button";
      const name = [c.lastName, c.firstName].filter(Boolean).join(", ");
      btn.append(
        el("span", "prior-name", name || "No name"),
        el("span", "prior-address", oneLineAddress(c) || "No address"),
        el("span", "prior-meta", `#${q.number} · ${shortDate(q.createdAt)}`)
      );
      btn.addEventListener("click", () => {
        current = q;
        saveQuotes();
        go("quote");
      });
      const li = el("li");
      li.append(btn);
      return li;
    })
  );
  priorEmpty.textContent = saved.length ? "No quotes match your search." : "No saved quotes yet.";
  priorEmpty.hidden = list.length > 0;
  priorSearch.hidden = !saved.length;
};

// ---------- 1. Contact ----------
const contactForm = document.getElementById("contact");

onShow.contact = () => {
  for (const [name, value] of Object.entries(current.contact)) contactForm.elements[name].value = value;
  contactForm.elements.notes.value = current.notes;
};
contactForm.addEventListener("input", (e) => {
  const { name, value } = e.target;
  if (name === "notes") current.notes = value;
  else current.contact[name] = name === "state" ? value.toUpperCase() : value;
  saveQuotes();
});
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  for (const key of Object.keys(current.contact)) current.contact[key] = current.contact[key].trim();
  saveQuotes();
  if (history.state?.returnAfterContact) back();
  // Editing contact info on a quote that already has services goes back to the quote.
  else go(Object.keys(current.services).length ? "quote" : "services");
});

// ---------- 2. Services To Quote ----------
const serviceButtons = document.getElementById("service-buttons");
const servicesViewQuote = document.getElementById("services-view-quote");

onShow.services = () => {
  serviceButtons.replaceChildren(
    ...SERVICES.map((service) => {
      const btn = el("button", "service-btn");
      btn.type = "button";
      btn.append(el("span", "service-name", service.name));
      if (current.services[service.name]) btn.append(el("span", "badge", "Added"));
      btn.addEventListener("click", () => startService(service));
      return btn;
    })
  );
  servicesViewQuote.hidden = !Object.keys(current.services).length;
};
servicesViewQuote.addEventListener("click", () => go("quote"));

function startService(service) {
  // Placeholder until the other services have their own screens.
  if (!service.screen) return alert(`${service.name} quoting is coming soon.`);
  if (service.name === "Windows") beginWindows();
  go(service.screen);
}

// ---------- Windows workflow (Window Details + Window Count) ----------
// Edits happen on a draft so backing out doesn't change the quote until "Add to Quote".
// The Window Details questions; all must be answered before Next.
const WINDOW_QUESTIONS = ["windowService", "windowCondition", "cleaningDifficulty"];

function emptyWindows() {
  return {
    ...Object.fromEntries(WINDOW_QUESTIONS.map((q) => [q, ""])),
    cleaningDifficulty: "Standard",
    counts: Object.fromEntries(SIZES.map((s) => [s, 0])),
  };
}

function beginWindows() {
  // Start from the saved line (if any), filling in answers added since it was saved.
  current.windowDraft = { ...emptyWindows(), ...structuredClone(current.services.Windows || {}) };
  saveQuotes();
}

function draft() {
  if (!current.windowDraft) beginWindows();
  return current.windowDraft;
}

// 3. Window Details
const detailsForm = document.getElementById("window-details");
const detailsNext = detailsForm.querySelector("[type=submit]");

onShow["window-details"] = () => {
  // Set each radio explicitly; assigning "" to a radio group's value doesn't clear it.
  for (const radio of detailsForm.querySelectorAll("input[type=radio]")) {
    radio.checked = draft()[radio.name] === radio.value;
  }
  detailsNext.disabled = !WINDOW_QUESTIONS.every((q) => draft()[q]);
};
detailsForm.addEventListener("change", () => {
  for (const q of WINDOW_QUESTIONS) draft()[q] = detailsForm.elements[q].value;
  detailsNext.disabled = !WINDOW_QUESTIONS.every((q) => draft()[q]);
  saveQuotes();
});
detailsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  go("window-count");
});

// 4. Window Count
const container = document.getElementById("counters");
const template = document.getElementById("counter-template");
const totalEl = document.getElementById("total");
const outputs = {};
const minusButtons = {};

function renderCount(size) {
  const counts = draft().counts;
  outputs[size].textContent = counts[size];
  minusButtons[size].disabled = counts[size] === 0;
  totalEl.textContent = WINDOW_SIZES.reduce((sum, s) => sum + counts[s], 0);
}

function change(size, delta) {
  const counts = draft().counts;
  counts[size] = Math.max(0, counts[size] + delta);
  saveQuotes();
  renderCount(size);
}

for (const size of SIZES) {
  const node = template.content.cloneNode(true);
  node.querySelector(".counter-label").textContent = size;
  const minus = node.querySelector(".minus");
  const plus = node.querySelector(".plus");
  const noun = EXTRAS.includes(size) ? size.toLowerCase() : `${size} window`;
  minus.setAttribute("aria-label", `Remove one ${noun}`);
  plus.setAttribute("aria-label", `Add one ${noun}`);
  minus.addEventListener("click", () => change(size, -1));
  plus.addEventListener("click", () => change(size, 1));
  outputs[size] = node.querySelector(".count");
  minusButtons[size] = minus;
  if (size === EXTRAS[0]) container.append(el("h2", "section-heading", "Extras"));
  container.appendChild(node);
}

onShow["window-count"] = () => SIZES.forEach(renderCount);

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("Reset all counts to 0?")) return;
  for (const size of SIZES) draft().counts[size] = 0;
  saveQuotes();
  SIZES.forEach(renderCount);
});

document.getElementById("add-windows").addEventListener("click", () => {
  current.services.Windows = structuredClone(draft());
  delete current.windowDraft;
  saveQuotes();
  go("quote");
});

// ---------- Quote ----------
const SIZE_NAMES = { XS: "Extra Small", S: "Small", M: "Medium", L: "Large", XL: "Extra Large" };
const usDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "");
const amount = (n) => (n == null ? "TBD" : money(n));
const percent = (rate) => `${+(rate * 100).toFixed(2)}%`;

// Line items for one service: { key, qty, description, unitPrice }.
function lineItems(q, service, d) {
  if (service !== "Windows") return [];
  const side = d.windowService === "Outside" ? "Out" : "In/Out";
  return [
    ...WINDOW_SIZES.map((s) => ({ key: s, qty: d.counts[s], description: `${SIZE_NAMES[s]} Windows ${side}` })),
    { key: "Screen", qty: d.counts.Screen, description: "Screens" },
    { key: "Skylight", qty: d.counts.Skylight, description: `Skylights ${side}` },
  ]
    .filter((item) => item.qty)
    .map((item) => ({ ...item, unitPrice: unitPrice(q, service, item.key, d) }));
}

function jobDescription(service, d) {
  if (service !== "Windows") return "";
  const where = d.windowService === "Outside" ? "exterior" : "interior and exterior";
  return [
    `Quote for washing the ${where} of house windows. Includes complimentary light cleaning of screens and cobweb removal around house.`,
    d.windowCondition && `Window condition: ${d.windowCondition}.`,
    d.cleaningDifficulty && `Cleaning difficulty: ${d.cleaningDifficulty}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// One section per service, each with its own line items and totals (like the paper quote).
// Money values are null until every line item has a price.
function quoteSections(q) {
  return SERVICES.filter((s) => q.services[s.name]).map((service) => {
    const d = q.services[service.name];
    const items = lineItems(q, service.name, d);
    const priced = items.length > 0 && items.every((i) => i.unitPrice != null);
    const gross = priced ? items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0) : null;
    const discount = priced ? gross * COMPANY.discountRate : null;
    const subtotal = priced ? gross - discount : null;
    const tax = priced ? subtotal * COMPANY.taxRate : null;
    return { service, description: jobDescription(service.name, d), items, discount, subtotal, tax, total: priced ? subtotal + tax : null };
  });
}

const addressLines = (c) => [fullName(c), streetLine(c), cityLine(c)].filter(Boolean);

// Label/value rows; `lines` may be several lines (e.g. an address).
function infoRows(className, rows) {
  const dl = el("dl", className);
  for (const [label, value] of rows) {
    const dd = el("dd");
    for (const line of [].concat(value || "")) dd.append(el("span", null, line));
    dl.append(el("dt", null, label), dd);
  }
  return dl;
}

function renderInvoice(q) {
  const c = q.contact;
  const invoice = document.getElementById("invoice");

  // Header: logo + company on the left, estimate box on the right.
  const brand = el("div", "inv-brand");
  const logo = el("img");
  logo.src = COMPANY.logo;
  logo.alt = COMPANY.name;
  brand.append(logo, el("p", "inv-web", COMPANY.website), el("p", "inv-web", COMPANY.phone), el("p", "inv-legal", `Legal Name: ${COMPANY.legalName}`));

  const estimate = el("div", "inv-estimate");
  const estTitle = el("div", "inv-estimate-title");
  estTitle.append(el("strong", null, "FREE ESTIMATE"), el("span", null, COMPANY.validFor));
  estimate.append(estTitle, infoRows("inv-lines", [["Date Emailed:", usDate(q.createdAt)], ["Sent By:", ""]]));

  const top = el("div", "inv-top");
  top.append(brand, estimate);

  const customer = el("div", "inv-customer");
  customer.append(
    infoRows("inv-lines", [["Customer/Contact", fullName(c)], ["Address", [streetLine(c), cityLine(c)].filter(Boolean)]]),
    infoRows("inv-lines", [["Company", ""], ["Contact", fullName(c)], ["Phone", c.phone], ["Email", c.email]])
  );

  const sections = quoteSections(q).map((sec) => {
    const job = el("section", "inv-job");

    const info = el("div", "inv-job-info");
    const edit = el("button", "link-btn inv-edit", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => editService(sec.service));
    info.append(
      edit,
      infoRows("inv-job-rows", [
        ["Name:", fullName(c)],
        ["Phone:", c.phone],
        ["Email:", c.email],
        ["Job Description:", sec.description],
        ["Job Address:", addressLines(c)],
      ])
    );

    const sched = el("div", "inv-sched");
    for (const [label, value] of [["Scheduled For:", ""], ["Quoted By:", ""], ["Quote Date:", usDate(q.createdAt)]]) {
      const cell = el("span");
      cell.append(el("strong", null, label), ` ${value}`);
      sched.append(cell);
    }

    const table = el("table", "inv-table");
    const head = el("tr");
    for (const h of ["Qty", "Description", "Unit Price", "Total"]) head.append(el("th", null, h));
    table.append(el("thead"));
    table.tHead.append(head);
    const body = el("tbody");
    for (const item of sec.items) {
      const row = el("tr");
      row.append(
        el("td", "qty", String(item.qty)),
        el("td", null, item.description),
        el("td", "num", amount(item.unitPrice)),
        el("td", "num", amount(item.unitPrice == null ? null : item.qty * item.unitPrice))
      );
      // Tap a line to change the answers or counts.
      row.addEventListener("click", () => startService(sec.service));
      body.append(row);
    }
    if (!sec.items.length) {
      const row = el("tr");
      const cell = el("td", "empty-row", "Nothing counted yet.");
      cell.colSpan = 4;
      row.append(cell);
      body.append(row);
    }
    const foot = el("tfoot");
    for (const [label, value, cls] of [
      [`Discount (${percent(COMPANY.discountRate)})`, sec.discount],
      ["Sub-Total", sec.subtotal, "alt"],
      [`Tax (${percent(COMPANY.taxRate)})`, sec.tax],
      ["Total", sec.total, "grand"],
    ]) {
      const row = el("tr", cls);
      const th = el("th", null, label);
      th.colSpan = 3;
      row.append(th, el("td", "num", amount(value)));
      foot.append(row);
    }
    table.append(body, foot);

    job.append(info, sched, table);
    return job;
  });
  if (!sections.length) sections.push(el("p", "empty", "No services added yet."));

  const terms = el("ul", "inv-terms");
  for (const t of COMPANY.terms) terms.append(el("li", null, t));

  const office = el("footer", "inv-office");
  office.append(el("p", null, [...COMPANY.address, `Phone: ${COMPANY.phone}`, `Email: ${COMPANY.email}`].join(" · ")), el("p", "inv-web", COMPANY.website));

  invoice.replaceChildren(top, el("p", "inv-intro", COMPANY.intro), customer, ...sections, terms, office);
}

function renderPriceStatus() {
  const { loadedAt, error, count } = Prices.status();
  const when = loadedAt ? new Date(loadedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const el_ = document.getElementById("price-status");
  el_.classList.toggle("warn", !!error || !count);
  el_.textContent = error
    ? `${error}${when ? ` Prices from ${when}.` : ""}`
    : count
      ? `Prices from the price sheet, updated ${when}. Items showing TBD have no matching row in the sheet.`
      : "Loading prices…";
}

onShow.quote = () => {
  renderInvoice(current);
  renderPriceStatus();
  document.getElementById("crew-notes-text").textContent = current.notes;
  document.getElementById("crew-notes").hidden = !current.notes.trim();
};

// "Edit" on a service jumps straight to its counts.
function editService(service) {
  if (service.name !== "Windows") return startService(service);
  beginWindows();
  go("window-count");
}

// ---------- PDF + sending ----------
const logoImage = new Image();
logoImage.src = COMPANY.logo;

// Letter-size PDF laid out like the company's paper quote: one page per service,
// terms after the first. Built synchronously so the share sheet can still open
// from the same tap.
function quotePdf(q) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const L = 27; // left edge
  const R = W - 27; // right edge
  const BLUE = [74, 144, 226];
  const NAVY = [31, 95, 160];
  const LINK = [21, 101, 192];
  const LAVENDER = [232, 234, 246];
  const PEACH = [252, 235, 218];
  const RULE = [210, 218, 226];
  const TEXT = [20, 20, 20];
  const c = q.contact;

  const font = (size, bold = false, color = TEXT) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const line = (x1, y1, x2, y2, color = TEXT, width = 0.75) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  };
  const box = (x, y, w, h, { fill, stroke, width = 1 } = {}) => {
    if (fill) doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(width);
    }
    doc.rect(x, y, w, h, fill && stroke ? "FD" : fill ? "F" : "S");
  };

  // Logo, company lines and the FREE ESTIMATE box. Returns the y below it.
  function pageHeader() {
    const cx = 106;
    if (logoImage.complete && logoImage.naturalWidth) doc.addImage(logoImage, "PNG", cx - 57, 20, 114, 50);
    font(9.5, true, LINK);
    doc.text(COMPANY.website, cx, 86, { align: "center" });
    doc.text(COMPANY.phone, cx, 99, { align: "center" });
    font(7.5);
    doc.text(`Legal Name: ${COMPANY.legalName}`, cx, 114, { align: "center" });

    const bx = 392;
    box(bx, 20, R - bx, 104, { fill: LAVENDER, stroke: NAVY, width: 1.5 });
    box(bx + 7, 27, R - bx - 14, 46, { fill: LAVENDER, stroke: [60, 60, 60], width: 0.75 });
    font(13, true);
    doc.text("FREE ESTIMATE", (bx + R) / 2, 47, { align: "center" });
    font(8.5, true);
    doc.text(COMPANY.validFor, (bx + R) / 2, 63, { align: "center" });
    for (const [label, value, y] of [["Date Emailed:", usDate(q.createdAt), 93], ["Sent By:", "", 110]]) {
      font(7.5, true);
      doc.text(label, bx + 6, y);
      font(8.5);
      doc.text(value, bx + 80, y);
      line(bx + 76, y + 3, R - 7, y + 3);
    }
    return 136;
  }

  // Label + underlined value(s), like a filled-in paper form.
  function formField(label, values, x, labelW, right, y) {
    font(9, true);
    doc.text(label, x, y);
    const lines = [].concat(values || "");
    lines.forEach((v, i) => {
      font(8.5);
      doc.text(v, x + labelW, y + i * 18 - 1);
      line(x + labelW - 2, y + i * 18 + 3, right, y + i * 18 + 3);
    });
    return y + Math.max(1, lines.length) * 18;
  }

  function officeFooter() {
    font(7.5, false, [90, 90, 90]);
    doc.text([...COMPANY.address, `Phone: ${COMPANY.phone}`, `Email: ${COMPANY.email}`, COMPANY.website].join("  ·  "), W / 2, H - 20, { align: "center" });
  }

  const sections = quoteSections(q);
  let y = pageHeader();

  // Thank-you paragraph and customer block (first page only).
  font(8.5, true);
  const intro = doc.splitTextToSize(COMPANY.intro, R - L);
  doc.text(intro, L - 5, y);
  y += intro.length * 10.5 + 12;
  const nameEnd = formField("Customer/Contact", fullName(c), L - 5, 100, 370, y);
  const leftEnd = formField("Address", [streetLine(c), cityLine(c)].filter(Boolean), L - 5, 100, 370, nameEnd);
  let ry = y;
  for (const [label, value] of [["Company", ""], ["Contact", fullName(c)], ["Phone", c.phone], ["Email", c.email]]) {
    ry = formField(label, value, 395, 50, R, ry);
  }
  y = Math.max(leftEnd, ry) + 2;

  if (!sections.length) {
    font(10);
    doc.text("No services added yet.", L, y + 10);
    y += 30;
  }

  sections.forEach((sec, index) => {
    if (index > 0) {
      officeFooter();
      doc.addPage();
      y = pageHeader() + 6;
    }

    // Job box
    const valueX = L + 169;
    const valueW = R - valueX - 8;
    const rows = [
      ["Name:", [fullName(c)]],
      ["Phone:", [c.phone]],
      ["Email:", [c.email]],
      ["Job Description:", doc.splitTextToSize(sec.description, valueW)],
      ["Job Address:", addressLines(c)],
    ];
    const rowH = (r) => Math.max(1, r[1].filter(Boolean).length) * 11 + 5;
    const jobH = rows.reduce((h, r) => h + rowH(r), 8);
    box(L, y, R - L, jobH + 22, { stroke: NAVY, width: 1 });
    let jy = y + 14;
    for (const r of rows) {
      font(9, true);
      doc.text(r[0], L + 7, jy);
      font(8.5);
      doc.text(r[1].filter(Boolean), valueX, jy, { lineHeightFactor: 1.3 });
      jy += rowH(r);
    }
    y += jobH;
    line(L, y, R, y, NAVY, 1);
    font(9, true);
    doc.text("Scheduled For:", L + 7, y + 14);
    doc.text("Quoted By:", L + 220, y + 14);
    doc.text("Quote Date:", L + 405, y + 14);
    font(8.5);
    doc.text(usDate(q.createdAt), L + 462, y + 14);
    y += 22;

    // Table
    const cols = [L, L + 76, L + 438, L + 468 + 30]; // Qty | Description | Unit Price | Total
    box(L, y, R - L, 22, { fill: BLUE });
    font(9.5, true, [20, 20, 20]);
    doc.text("Qty", (cols[0] + cols[1]) / 2, y + 15, { align: "center" });
    doc.text("Description", cols[1] + 6, y + 15);
    doc.text("Unit Price", (cols[2] + cols[3]) / 2, y + 15, { align: "center" });
    doc.text("Total", (cols[3] + R) / 2, y + 15, { align: "center" });
    y += 22;
    const ROW = 16;
    const items = sec.items.length ? sec.items : [{ qty: "", description: "Nothing counted yet.", unitPrice: null, empty: true }];
    for (const item of items) {
      font(8.5, false, [60, 60, 60]);
      doc.text(String(item.qty), (cols[0] + cols[1]) / 2, y + 11, { align: "center" });
      doc.text(item.description, cols[1] + 4, y + 11);
      if (!item.empty) {
        doc.text(amount(item.unitPrice), cols[3] - 4, y + 11, { align: "right" });
        doc.text(amount(item.unitPrice == null ? null : item.qty * item.unitPrice), R - 4, y + 11, { align: "right" });
      }
      line(L, y + 16, R, y + 16, RULE, 0.5);
      y += ROW;
    }
    for (const [label, value, style] of [
      [`Discount (${percent(COMPANY.discountRate)})`, sec.discount],
      ["Sub-Total", sec.subtotal, "alt"],
      [`Tax (${percent(COMPANY.taxRate)})`, sec.tax],
      ["Total", sec.total, "grand"],
    ]) {
      if (style === "alt") box(L, y, R - L, ROW, { fill: [238, 245, 253] });
      if (style === "grand") box(L, y, R - L, ROW, { fill: BLUE });
      const color = style === "grand" ? [255, 255, 255] : [60, 60, 60];
      font(8.5, true, color);
      doc.text(label, cols[3] - 6, y + 11, { align: "right" });
      font(style === "grand" ? 10 : 8.5, style === "grand", color);
      doc.text(amount(value), R - 4, y + 11, { align: "right" });
      y += ROW;
    }
    box(L, y - ROW * (items.length + 4) - 22, R - L, ROW * (items.length + 4) + 22, { stroke: NAVY, width: 1 });
    y += 14;

    // Terms after the first service, as on the paper quote.
    if (index === 0) {
      font(8);
      const bullets = COMPANY.terms.map((t) => doc.splitTextToSize(t, R - L - 40));
      const termsH = bullets.reduce((h, b) => h + b.length * 9.5 + 6, 16);
      if (y + termsH > H - 30) {
        officeFooter();
        doc.addPage();
        y = pageHeader() + 6;
      }
      box(L, y, R - L, termsH, { fill: PEACH, stroke: NAVY, width: 1.5 });
      let ty = y + 16;
      for (const b of bullets) {
        font(8);
        doc.setFillColor(...TEXT);
        doc.circle(L + 17, ty - 2.5, 1.8, "F");
        doc.text(b, L + 30, ty, { lineHeightFactor: 1.2 });
        ty += b.length * 9.5 + 6;
      }
      y += termsH + 10;
    }
  });
  officeFooter();

  return doc.output("blob");
}

function pdfName(q) {
  const who = q.contact.lastName || q.contact.street || "";
  return `Quote-${q.number}${who ? "-" + who.replace(/[^\w]+/g, "-") : ""}.pdf`;
}

// Opens the phone's share sheet with the PDF attached (pick Messages or Mail).
// Where files can't be shared (e.g. a desktop browser), saves the PDF and opens
// a pre-filled email (or text, if there's only a phone number) to attach it by hand.
async function sendQuote() {
  if (!window.jspdf) return alert("The PDF tool is still loading. Try again in a moment.");
  const q = current;
  // Freeze the prices on this quote so later price-sheet edits don't change it.
  q.sentPrices = { ...q.sentPrices };
  for (const sec of quoteSections(q)) {
    for (const item of sec.items) {
      if (item.unitPrice != null) q.sentPrices[priceKey(sec.service.name, item.key, q.services[sec.service.name])] = item.unitPrice;
    }
  }
  saveQuotes();
  const file = new File([quotePdf(q)], pdfName(q), { type: "application/pdf" });
  const where = oneLineAddress(q.contact);
  const subject = `Quote #${q.number}${where ? " – " + where : ""}`;
  const message = `Hi${q.contact.firstName ? " " + q.contact.firstName : ""}, here is your window cleaning quote from ${COMPANY.name}.`;

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject, text: message });
    } catch (err) {
      if (err.name !== "AbortError") alert("Couldn't open sharing. Try again.");
    }
    return;
  }

  const url = URL.createObjectURL(file);
  const a = el("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  const body = `${message}\n\nThe quote PDF (${file.name}) is attached.`;
  const phone = q.contact.phone.replace(/[^\d+]/g, "");
  if (q.contact.email || !phone) {
    location.href = `mailto:${encodeURIComponent(q.contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else {
    location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
  }
}

document.getElementById("send-quote").addEventListener("click", sendQuote);

document.getElementById("quote-done").addEventListener("click", goHome);

// ---------- Prices ----------
// Load the price sheet when the app opens and whenever it comes back to the foreground.
Prices.onChange(() => {
  if (!document.getElementById("quote").hidden) onShow.quote();
});
Prices.refresh();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") Prices.refresh();
});

// ---------- Start ----------
// Keep Home as the first history entry; reopen the saved screen on top of it after a refresh.
if (!history.state) {
  const target = screenId();
  history.replaceState({ depth: 0 }, "", "#home");
  if (target !== "home" && (current || !NEEDS_QUOTE.includes(target))) {
    history.pushState({ depth: 1 }, "", `#${target}`);
  }
}
show(screenId());
