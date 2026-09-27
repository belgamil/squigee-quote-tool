// Window sizes add up to the header total; extras are counted separately.
const WINDOW_SIZES = ["XS", "S", "M", "L", "XL"];
const EXTRAS = ["Screen", "Skylight"];
const SIZES = [...WINDOW_SIZES, ...EXTRAS];
const STORAGE_KEY = "squigee.windowCounts";

// Counts are kept in localStorage so a page refresh in the field doesn't lose work.
function loadCounts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return Object.fromEntries(SIZES.map((s) => [s, Number(saved[s]) || 0]));
  } catch {
    return Object.fromEntries(SIZES.map((s) => [s, 0]));
  }
}

function saveCounts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Storage unavailable (e.g. private mode) – counts still work for this session.
  }
}

const counts = loadCounts();
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
  saveCounts();
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
  if (!confirm("Reset all window counts to 0?")) return;
  for (const size of SIZES) counts[size] = 0;
  saveCounts();
  SIZES.forEach(render);
});
