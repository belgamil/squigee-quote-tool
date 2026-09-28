// ---------- Constants ----------
const STORAGE_KEY = "squigee.quotes";
const CURRENT_KEY = "squigee.currentQuoteId";

// Shown at the top of the PDF quote.
const BUSINESS_NAME = "Squeege Squad";

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
// Returns the cost of one line item in dollars, or null when it can't be priced yet.
// TODO: fill in once the pricing rules are known.
function priceFor(service, details) {
  return null;
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
// Detail lines for one service, e.g. Windows: "Outside/Inside", "7 windows: S 4 · M 3", ...
function describe(service, d) {
  if (service !== "Windows") return [];
  const sizes = WINDOW_SIZES.filter((s) => d.counts[s]);
  const windowCount = sizes.reduce((sum, s) => sum + d.counts[s], 0);
  return [
    d.windowService,
    d.windowCondition && `Condition: ${d.windowCondition}`,
    d.cleaningDifficulty && `Difficulty: ${d.cleaningDifficulty}`,
    windowCount ? `${plural(windowCount, "window")}: ${sizes.map((s) => `${s} ${d.counts[s]}`).join(" · ")}` : "No windows",
    d.counts.Screen && plural(d.counts.Screen, "screen"),
    d.counts.Skylight && plural(d.counts.Skylight, "skylight"),
  ].filter(Boolean);
}

// Line items and total for a quote, shared by the Quote screen and the PDF.
function summarize(q) {
  let total = 0;
  let unpriced = false;
  const lines = SERVICES.filter((s) => q.services[s.name]).map((service) => {
    const details = q.services[service.name];
    const price = priceFor(service.name, details);
    if (price == null) unpriced = true;
    else total += price;
    return { service, details: describe(service.name, details), amount: price == null ? "TBD" : money(price) };
  });
  return { lines, total: unpriced || !lines.length ? "TBD" : money(total) };
}

const contactLines = (c) => [fullName(c), streetLine(c), cityLine(c), c.phone, c.email].filter(Boolean);

onShow.quote = () => {
  document.getElementById("quote-meta").textContent = `#${current.number} · ${shortDate(current.createdAt)}`;

  const contact = contactLines(current.contact);
  document.getElementById("quote-contact").replaceChildren(
    ...(contact.length ? contact.map((line) => el("span", null, line)) : [el("span", "muted", "No contact info")])
  );

  const { lines, total } = summarize(current);
  document.getElementById("quote-lines").replaceChildren(
    ...lines.map(({ service, details, amount }) => {
      // Tap a line to change it.
      const row = el("button", "line");
      row.type = "button";
      const info = el("span", "line-info");
      info.append(el("span", "line-name", service.name));
      for (const text of details) info.append(el("span", "line-detail", text));
      row.append(info, el("span", "line-amount", amount));
      row.addEventListener("click", () => startService(service));
      return row;
    })
  );
  document.getElementById("quote-no-lines").hidden = lines.length > 0;
  document.getElementById("quote-total").textContent = total;

  document.getElementById("quote-notes").textContent = current.notes;
  document.getElementById("quote-notes-block").hidden = !current.notes.trim();
};

// ---------- PDF + sending ----------
// Letter-size PDF laid out like the Quote screen. Built synchronously so the
// share sheet can still open from the same tap.
function quotePdf(q) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 54; // margin
  const BRAND = [11, 111, 184];
  const MUTED = [93, 107, 120];
  const TEXT = [28, 39, 51];
  let y = M;

  const ensure = (h) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const text = (str, x, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 11);
    doc.setTextColor(...(opts.color || TEXT));
    doc.text(str, x, y, { align: opts.align || "left" });
  };
  const label = (str) => {
    text(str.toUpperCase(), M, { size: 9, bold: true, color: MUTED });
    y += 16;
  };

  // Header
  text(BUSINESS_NAME, M, { size: 12, bold: true, color: MUTED });
  y += 30;
  text("QUOTE", M, { size: 26, bold: true, color: BRAND });
  text(`#${q.number}`, W - M, { size: 12, bold: true, align: "right" });
  y += 16;
  text(shortDate(q.createdAt), W - M, { size: 11, color: MUTED, align: "right" });
  y += 30;

  // Prepared for
  label("Prepared for");
  const contact = contactLines(q.contact);
  contact.forEach((line, i) => {
    text(line, M, { bold: i === 0 && !!fullName(q.contact) });
    y += 15;
  });
  if (!contact.length) {
    text("No contact info", M, { color: MUTED });
    y += 15;
  }
  y += 20;

  // Line items
  const { lines, total } = summarize(q);
  text("SERVICE", M, { size: 9, bold: true, color: MUTED });
  text("AMOUNT", W - M, { size: 9, bold: true, color: MUTED, align: "right" });
  y += 8;
  doc.setDrawColor(...TEXT);
  doc.setLineWidth(1.5);
  doc.line(M, y, W - M, y);
  y += 20;
  for (const line of lines) {
    ensure(20 + line.details.length * 14);
    text(line.service.name, M, { size: 12, bold: true });
    text(line.amount, W - M, { size: 12, bold: true, align: "right" });
    y += 16;
    for (const detail of line.details) {
      text(detail, M, { size: 10, color: MUTED });
      y += 14;
    }
    y += 4;
    doc.setDrawColor(217, 225, 232);
    doc.setLineWidth(0.75);
    doc.line(M, y, W - M, y);
    y += 20;
  }
  if (!lines.length) {
    text("No services added yet.", M, { color: MUTED });
    y += 24;
  }
  ensure(30);
  text("Total", M, { size: 14, bold: true });
  text(total, W - M, { size: 14, bold: true, align: "right" });
  y += 36;

  // Notes
  if (q.notes.trim()) {
    ensure(40);
    label("Notes");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    for (const row of doc.splitTextToSize(q.notes.trim(), W - 2 * M)) {
      ensure(15);
      text(row, M);
      y += 15;
    }
  }

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
  const file = new File([quotePdf(q)], pdfName(q), { type: "application/pdf" });
  const where = oneLineAddress(q.contact);
  const subject = `Quote #${q.number}${where ? " – " + where : ""}`;
  const message = `Hi${q.contact.firstName ? " " + q.contact.firstName : ""}, here is your window cleaning quote from ${BUSINESS_NAME}.`;

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

// Edit jumps straight to the window counts (or the service list if windows aren't on the quote yet).
document.getElementById("edit-windows").addEventListener("click", () => {
  if (!current.services.Windows) return go("services");
  beginWindows();
  go("window-count");
});
document.getElementById("quote-done").addEventListener("click", goHome);

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
