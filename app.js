// ---------- Saved quote ----------
// Everything entered is kept in localStorage so a refresh in the field doesn't lose work.
const STORAGE_KEY = "squigee.quote";

// Window sizes add up to the header total; extras are counted separately.
const WINDOW_SIZES = ["XS", "S", "M", "L", "XL"];
const EXTRAS = ["Screen", "Skylight"];
const SIZES = [...WINDOW_SIZES, ...EXTRAS];

function emptyQuote() {
  return {
    contact: { firstName: "", lastName: "", address: "", phone: "", email: "" },
    services: [],
    windowService: "",
    newConstruction: "",
    counts: Object.fromEntries(SIZES.map((s) => [s, 0])),
  };
}

function loadQuote() {
  const quote = emptyQuote();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    Object.assign(quote.contact, saved.contact);
    if (Array.isArray(saved.services)) quote.services = saved.services;
    quote.windowService = saved.windowService || "";
    quote.newConstruction = saved.newConstruction || "";
    for (const s of SIZES) quote.counts[s] = Number(saved.counts?.[s]) || 0;
  } catch {
    // Nothing saved or unreadable – start fresh.
  }
  return quote;
}

function saveQuote() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quote));
  } catch {
    // Storage unavailable (e.g. private mode) – the app still works for this session.
  }
}

const quote = loadQuote();

// ---------- Navigation ----------
// Screen order; `back` on each screen goes to the one before it.
const SCREENS = ["contact", "services", "window-details", "window-count"];
const PREVIOUS = { services: "contact", "window-details": "services", "window-count": "window-details" };

function show(id) {
  if (!SCREENS.includes(id)) id = SCREENS[0];
  for (const screen of document.querySelectorAll(".screen")) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
  document.querySelector(`#${id} h1`).focus({ preventScroll: true });
}

// Each screen gets a history entry so the phone's back button/gesture works.
function go(id) {
  history.pushState({ depth: (history.state?.depth || 0) + 1 }, "", `#${id}`);
  show(id);
}

function back() {
  const current = location.hash.slice(1);
  if (history.state?.depth > 0) history.back();
  else {
    const prev = PREVIOUS[current] || SCREENS[0];
    history.replaceState({ depth: 0 }, "", `#${prev}`);
    show(prev);
  }
}

window.addEventListener("popstate", () => show(location.hash.slice(1)));
for (const btn of document.querySelectorAll(".back")) btn.addEventListener("click", back);

// ---------- 1. Contact ----------
const contactForm = document.getElementById("contact");
for (const [name, value] of Object.entries(quote.contact)) {
  if (contactForm.elements[name]) contactForm.elements[name].value = value;
}
contactForm.addEventListener("input", (e) => {
  quote.contact[e.target.name] = e.target.value.trim();
  saveQuote();
});
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  go("services");
});

// ---------- 2. Services To Quote ----------
const servicesForm = document.getElementById("services");
const servicesNext = servicesForm.querySelector("[type=submit]");
for (const box of servicesForm.elements.services) box.checked = quote.services.includes(box.value);

function updateServices() {
  quote.services = [...servicesForm.elements.services].filter((b) => b.checked).map((b) => b.value);
  servicesNext.disabled = quote.services.length === 0;
}
updateServices();
servicesForm.addEventListener("change", () => {
  updateServices();
  saveQuote();
});
servicesForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (quote.services.includes("Windows")) go("window-details");
  // Placeholder until screens for the other services are built.
  else alert("Screens for the other services are coming soon.");
});

// ---------- 3. Window Details ----------
const detailsForm = document.getElementById("window-details");
const detailsNext = detailsForm.querySelector("[type=submit]");
detailsForm.elements.windowService.value = quote.windowService;
detailsForm.elements.newConstruction.value = quote.newConstruction;

function updateDetails() {
  quote.windowService = detailsForm.elements.windowService.value;
  quote.newConstruction = detailsForm.elements.newConstruction.value;
  detailsNext.disabled = !quote.windowService || !quote.newConstruction;
}
updateDetails();
detailsForm.addEventListener("change", () => {
  updateDetails();
  saveQuote();
});
detailsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  go("window-count");
});

// ---------- 4. Window Count ----------
const counts = quote.counts;
const container = document.getElementById("counters");
const template = document.getElementById("counter-template");
const totalEl = document.getElementById("total");
const outputs = {};
const minusButtons = {};

function render(size) {
  outputs[size].textContent = counts[size];
  minusButtons[size].disabled = counts[size] === 0;
  totalEl.textContent = WINDOW_SIZES.reduce((sum, s) => sum + counts[s], 0);
}

function change(size, delta) {
  counts[size] = Math.max(0, counts[size] + delta);
  saveQuote();
  render(size);
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
  if (size === EXTRAS[0]) {
    const heading = document.createElement("h2");
    heading.className = "section-heading";
    heading.textContent = "Extras";
    container.appendChild(heading);
  }
  container.appendChild(node);
  render(size);
}

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("Reset all counts to 0?")) return;
  for (const size of SIZES) counts[size] = 0;
  saveQuote();
  SIZES.forEach(render);
});

// Placeholder until the quote screen is built.
document.getElementById("quote").addEventListener("click", () => {
  alert("Quote screen coming soon.");
});

// ---------- Start ----------
const start = SCREENS.includes(location.hash.slice(1)) ? location.hash.slice(1) : SCREENS[0];
history.replaceState({ depth: history.state?.depth || 0 }, "", `#${start}`);
show(start);
