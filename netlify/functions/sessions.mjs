// Bankroll sync endpoint — GET returns the shared session ledger, PUT stores it.
// Data lives in Netlify Blobs (site-wide store "bankroll", key "ledger").
// Credentials are injected automatically by the Netlify Functions runtime.
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "bankroll", consistency: "strong" });
const KEY = "ledger";
const MAX_SESSIONS = 50000;
const MAX_BYTES = 5 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const isValidSession = (s) =>
  s &&
  typeof s.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
  isFinite(+s.minBuyIn) &&
  isFinite(+s.buyIns) &&
  isFinite(+s.pnl) &&
  typeof s.venue === "string" &&
  s.venue.trim().length > 0;

export default async (req) => {
  try {
    if (req.method === "GET") {
      const data = await store.get(KEY, { type: "json" });
      if (data && Array.isArray(data.sessions)) return json(data);
      return json({ updatedAt: 0, sessions: [] });
    }

    if (req.method === "PUT" || req.method === "POST") {
      // Optional write protection: set BANKROLL_WRITE_KEY in Netlify → Site configuration
      // → Environment variables, and paste the same value into SYNC_KEY in index.html.
      const want = process.env.BANKROLL_WRITE_KEY;
      if (want && req.headers.get("x-bankroll-key") !== want)
        return json({ error: "unauthorized" }, 401);

      const raw = await req.text();
      if (!raw || raw.length > MAX_BYTES) return json({ error: "payload too large" }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }
      if (!body || !Array.isArray(body.sessions) || body.sessions.length > MAX_SESSIONS)
        return json({ error: "bad shape" }, 400);

      const clean = body.sessions.filter(isValidSession).slice(0, MAX_SESSIONS);
      const incoming = { updatedAt: +body.updatedAt || Date.now(), sessions: clean };

      // Last-write-wins guard: never overwrite a newer ledger with an older one.
      const current = await store.get(KEY, { type: "json" });
      if (current && +current.updatedAt > incoming.updatedAt)
        return json({ ok: false, conflict: true, data: current });

      await store.setJSON(KEY, incoming);
      return json({ ok: true, updatedAt: incoming.updatedAt, count: clean.length });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    return json({ error: "server error" }, 500);
  }
};
