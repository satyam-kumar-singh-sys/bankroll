// Juari Adda (railbook) additions endpoint.
// GET  → returns player-log additions (public, same openness as the sessions ledger).
// PUT/POST → replaces additions; protected by the same BANKROLL_WRITE_KEY
// (same identity as Bankroll/Ledger owner login — one password everywhere).
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "bankroll", consistency: "strong" });
const KEY = "railbook-additions";
const MAX_ENTRIES = 10000;
const MAX_BYTES = 2 * 1024 * 1024;

const json = (b, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const isEntry = (e) =>
  Array.isArray(e) &&
  /^\d{4}-\d{2}-\d{2}$/.test(String(e[0] || "")) &&
  typeof e[1] === "string" && e[1].length <= 60 &&
  typeof e[2] === "string" && e[2].trim().length > 0 && e[2].length <= 48 &&
  isFinite(+e[3]) &&
  (e.length < 5 || typeof e[4] === "string");

const cleanAdditions = (a) => {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  const out = {};
  let count = 0;
  for (const [name, list] of Object.entries(a)) {
    const nm = String(name || "").trim().slice(0, 48);
    if (!nm || !Array.isArray(list)) continue;
    const entries = list.filter(isEntry).map((e) => e.slice(0, 5));
    if (entries.length) { out[nm] = entries; count += entries.length; }
    if (count > MAX_ENTRIES) return null;
  }
  return out;
};

export default async (req) => {
  try {
    if (req.method === "GET") {
      const data = await store.get(KEY, { type: "json" });
      if (data && data.additions) return json(data);
      return json({ updatedAt: 0, additions: {} });
    }
    if (req.method === "PUT" || req.method === "POST") {
      const want = process.env.BANKROLL_WRITE_KEY;
      if (want && req.headers.get("x-bankroll-key") !== want)
        return json({ error: "unauthorized" }, 401);
      const raw = await req.text();
      if (!raw || raw.length > MAX_BYTES) return json({ error: "payload too large" }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }
      const additions = cleanAdditions(body.additions);
      if (additions === null) return json({ error: "bad shape" }, 400);
      const incoming = { updatedAt: Date.now(), additions };
      await store.setJSON(KEY, incoming);
      const count = Object.values(additions).reduce((s, l) => s + l.length, 0);
      return json({ ok: true, updatedAt: incoming.updatedAt, players: Object.keys(additions).length, count });
    }
    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500);
  }
};
