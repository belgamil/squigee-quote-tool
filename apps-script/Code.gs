/**
 * Squeegee Squad quote sheet – the app's shared storage.
 *
 * Paste this into Extensions → Apps Script of the Google Sheet that should
 * hold the quotes, then follow the setup steps in the repo's README.
 *
 * Every request must carry the team code saved in Project Settings →
 * Script properties as TEAM_CODE. The sheet itself stays private to the
 * owner's Google account; the script runs as the owner.
 */

const SHEET_NAME = "Quotes";
const FIRST_NUMBER = 1001;

// Readable columns for people; the last column holds the full quote for the app.
const HEADERS = [
  "Quote #", "Created", "Updated", "Created By",
  "First Name", "Last Name", "Street", "Suite No", "City", "State", "Zip", "Phone", "Email", "Notes",
  "Services", "Window Service", "Window Condition", "Cleaning Difficulty",
  "XS", "S", "M", "L", "XL", "Screen", "Skylight",
  "ID", "App Data (don't edit)",
];
const ID_COL = HEADERS.indexOf("ID");
const DATA_COL = HEADERS.length - 1;

function doGet() {
  return ContentService.createTextOutput("Squeegee Squad quote sheet is running.");
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "Bad request." });
  }

  const teamCode = PropertiesService.getScriptProperties().getProperty("TEAM_CODE");
  if (!teamCode) {
    return reply({ ok: false, error: "The quote sheet isn't set up yet: add TEAM_CODE under Project Settings → Script properties." });
  }
  if (req.code !== teamCode) return reply({ ok: false, auth: true, error: "Wrong team code." });

  try {
    switch (req.action) {
      case "ping":
        return reply({ ok: true });
      case "list":
        return reply({ ok: true, quotes: listQuotes() });
      case "save":
        return reply(withLock(() => saveQuote(req.quote)));
      case "delete":
        return reply(withLock(() => deleteQuote(req.id)));
      default:
        return reply({ ok: false, error: "Unknown action." });
    }
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// One write at a time, so two phones can't get the same quote number.
function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function dataRows(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function listQuotes() {
  const quotes = [];
  for (const row of dataRows(getSheet())) {
    try {
      quotes.push(JSON.parse(row[DATA_COL]));
    } catch (err) {
      // Skip rows whose app data was edited by hand.
    }
  }
  return quotes;
}

function saveQuote(quote) {
  if (!quote || typeof quote.id !== "string" || !quote.id) return { ok: false, error: "Missing quote." };
  const sheet = getSheet();
  const rows = dataRows(sheet);
  const index = rows.findIndex((r) => r[ID_COL] === quote.id);

  // Quote numbers are handed out here, never reused (even after a delete).
  if (!quote.number) {
    const props = PropertiesService.getScriptProperties();
    const used = rows.map((r) => Number(r[0]) || 0);
    const last = Math.max(FIRST_NUMBER - 1, Number(props.getProperty("LAST_NUMBER")) || 0, ...used);
    quote.number = last + 1;
    props.setProperty("LAST_NUMBER", String(quote.number));
  }
  quote.updatedAt = new Date().toISOString();

  const values = [toRow(quote)];
  if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues(values);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length).setValues(values);
  return { ok: true, number: quote.number, updatedAt: quote.updatedAt };
}

function deleteQuote(id) {
  const sheet = getSheet();
  const index = dataRows(sheet).findIndex((r) => r[ID_COL] === id);
  if (index >= 0) sheet.deleteRow(index + 2);
  return { ok: true };
}

function toRow(q) {
  const c = q.contact || {};
  const w = (q.services && q.services.Windows) || {};
  const counts = w.counts || {};
  return [
    q.number, q.createdAt, q.updatedAt, q.createdBy,
    c.firstName, c.lastName, c.street, c.suite, c.city, c.state, c.zip, c.phone, c.email, q.notes,
    Object.keys(q.services || {}).join(", "), w.windowService, w.windowCondition, w.cleaningDifficulty,
    counts.XS, counts.S, counts.M, counts.L, counts.XL, counts.Screen, counts.Skylight,
    q.id, JSON.stringify(q),
  ].map(safe);
}

// Keep typed text as text: a value like "=IMPORTXML(...)" must never become a formula.
function safe(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}
