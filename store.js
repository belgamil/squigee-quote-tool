// Where quotes are kept.
//
// With COMPANY.quoteStore.url set, quotes live in the team's Google Sheet (see
// apps-script/Code.gs). The phone only holds a quote until the sheet confirms
// it's saved, so a dead zone doesn't lose work; nothing else stays on the phone.
//
// Without a URL, quotes are kept on this phone (localStorage) as before.
//
// Everything else in the app talks to Store, so the sheet can later be swapped
// for a database or a CRM without touching the screens.
const Store = (() => {
  const LOCAL_KEY = "squigee.quotes"; // phone-only mode (and quotes made before the sheet existed)
  const PENDING_KEY = "squigee.pending"; // sheet mode: quotes not yet saved to the sheet
  const USER_KEY = "squigee.user"; // { name, code }
  const url = COMPANY.quoteStore?.url || "";
  const remote = !!url;

  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (e.g. private mode) – keep going in memory.
    }
  };

  let user = read(USER_KEY, null);
  const pending = new Map(read(PENDING_KEY, []).map((q) => [q.id, q]));
  const quotes = remote ? [...pending.values()] : read(LOCAL_KEY, []);
  const listeners = [];
  const timers = {};
  let status = { loading: false, error: "" };

  const notify = () => listeners.forEach((fn) => fn());
  const savePending = () => write(PENDING_KEY, [...pending.values()]);

  class StoreError extends Error {
    constructor(message, auth = false) {
      super(message);
      this.auth = auth;
    }
  }

  // Plain-text POST keeps this a "simple" request, which Apps Script accepts from a browser.
  async function call(action, payload = {}) {
    let res;
    try {
      res = await fetch(url, { method: "POST", body: JSON.stringify({ action, code: user?.code, ...payload }) });
    } catch {
      throw new StoreError("No connection to the quote sheet.");
    }
    let data;
    try {
      data = await res.json();
    } catch {
      throw new StoreError(`The quote sheet sent an unexpected reply (status ${res.status}).`);
    }
    if (!data.ok) throw new StoreError(data.error || "The quote sheet reported an error.", !!data.auth);
    return data;
  }

  // Sends one quote to the sheet. It stays pending (on the phone) until this succeeds.
  async function upload(q) {
    const rev = q._rev;
    const { _rev, ...body } = q;
    let res;
    try {
      res = await call("save", { quote: body });
    } catch (err) {
      status.error = err.message;
      notify();
      throw err;
    }
    q.number = res.number;
    q.updatedAt = res.updatedAt;
    if (q._rev === rev) {
      pending.delete(q.id);
      savePending();
    }
    status.error = "";
    notify();
  }

  async function flush(q) {
    clearTimeout(timers[q.id]);
    if (!pending.has(q.id)) return;
    await upload(q);
  }

  async function flushAll() {
    for (const q of [...pending.values()]) {
      try {
        await flush(q);
      } catch (err) {
        if (err.auth) return;
      }
    }
  }

  // Replaces the list in place with the sheet's copy, keeping unsaved edits made on this phone.
  function merge(list, keep) {
    const byId = new Map(list.map((q) => [q.id, q]));
    for (const q of pending.values()) byId.set(q.id, q);
    if (keep) byId.set(keep.id, keep);
    quotes.splice(0, quotes.length, ...byId.values());
  }

  return {
    remote,
    quotes,
    user: () => user,
    status: () => ({ ...status, pending: pending.size }),
    isPending: (q) => pending.has(q.id),
    onChange: (fn) => listeners.push(fn),

    // Checks the team code with the sheet before remembering it.
    async connect(name, code) {
      const previous = user;
      user = { name, code };
      try {
        await call("ping");
      } catch (err) {
        user = previous;
        throw err;
      }
      write(USER_KEY, user);
      // Move quotes made before the sheet existed off the phone and into the sheet.
      for (const q of read(LOCAL_KEY, [])) this.save(q);
      write(LOCAL_KEY, null);
      await flushAll();
    },

    setName(name) {
      user = { ...user, name };
      write(USER_KEY, user);
    },

    signOut() {
      user = null;
      write(USER_KEY, null);
    },

    // Loads every quote from the sheet (and retries anything still pending).
    async refresh(keep) {
      if (!remote || !user) return;
      status = { ...status, loading: true };
      notify();
      try {
        await flushAll();
        const { quotes: list } = await call("list");
        merge(list, keep);
        status = { loading: false, error: "" };
      } catch (err) {
        status = { loading: false, error: err.message, auth: err.auth };
      }
      notify();
    },

    // Saves a quote: straight away on the phone, or to the sheet shortly after the last change.
    save(q) {
      if (!quotes.includes(q)) quotes.push(q);
      if (!remote) return write(LOCAL_KEY, quotes);
      q._rev = (q._rev || 0) + 1;
      pending.set(q.id, q);
      savePending();
      clearTimeout(timers[q.id]);
      timers[q.id] = setTimeout(() => upload(q).catch(() => {}), 1500);
    },

    // Saves now and waits for the sheet (e.g. before sending, which needs the quote number).
    flush,

    async remove(q) {
      if (remote) {
        clearTimeout(timers[q.id]);
        await call("delete", { id: q.id });
        pending.delete(q.id);
        savePending();
      }
      const i = quotes.indexOf(q);
      if (i >= 0) quotes.splice(i, 1);
      if (!remote) write(LOCAL_KEY, quotes);
      notify();
    },

    // Next quote number. The sheet hands them out itself so phones can't clash.
    nextNumber: () => (remote ? null : Math.max(1000, ...quotes.map((q) => q.number || 0)) + 1),
  };
})();
