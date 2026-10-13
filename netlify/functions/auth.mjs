// Owner-login check. The password lives ONLY in the BANKROLL_WRITE_KEY
// environment variable (Netlify → Site configuration → Environment variables).
// If the env var is not set, the site runs in open mode (no login needed).
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const want = process.env.BANKROLL_WRITE_KEY;
  if (!want) return json({ ok: true, gate: false }); // no password configured → open site
  let key = "";
  try { key = ((await req.json()) || {}).key || ""; } catch { /* empty */ }
  if (key && key === want) return json({ ok: true, gate: true });
  return json({ ok: false, gate: true }, 401);
};
