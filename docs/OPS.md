# ♠ BANKROLL — Poker PnL Ledger

A single-page, trading-desk-style tracker for your poker sessions, with **cross-device cloud sync** via Netlify Functions + Netlify Blobs (free tier, no external accounts).

## What's in this folder

```
bankroll/
├── index.html                     ← the entire app (UI + charts + sync client)
├── netlify.toml                   ← tells Netlify where functions live
├── package.json                   ← single dependency: @netlify/blobs
├── netlify/
│   └── functions/
│       └── sessions.mjs           ← GET/PUT endpoint that stores your ledger in Netlify Blobs
└── README.md
```

## Deploy with sync (≈ 2 minutes)

**Option A — drag & drop (same as before):**
1. Go to Netlify → your site's **Deploys** page (or `app.netlify.com/drop` for a new site).
2. Drag the **whole `bankroll` folder** (not just index.html).
3. Netlify detects `package.json`, installs the one dependency, bundles the function, and deploys. Sync goes live immediately — no Blobs configuration needed; credentials are auto-injected.

**Option B — Git-backed (recommended for easy future updates):**
1. Create a GitHub repo, upload this folder (the GitHub web UI "upload files" button works fine — no terminal needed).
2. Netlify → *Add new site → Import an existing project* → pick the repo. Build settings are read from `netlify.toml`; leave the build command empty.
3. Every future push auto-redeploys.

**Verify sync works:** the dot in the top-right header turns green and says **SYNCED**. Log a session on your laptop, open the site on your phone — the data is there. If the dot stays amber (**LOCAL**), the function didn't deploy (check *Site → Functions* tab on Netlify); the app keeps working with browser storage until it's fixed.

## How sync works

- Every save writes instantly to the browser, then pushes the full ledger to `/.netlify/functions/sessions` (stored as one JSON blob in Netlify Blobs).
- On load, and every 45 s while the tab is open, it pulls the cloud copy — if another device saved something newer, it's adopted automatically.
- **Last write wins** by timestamp: the server refuses to overwrite a newer ledger with an older one (protects a stale tab from clobbering fresh data). Avoid logging offline edits on two devices at once.
- Zero function/blobs usage stays well inside Netlify's free tier for a personal tool.

## View-only mode & owner login (share safely)

By default the site is **view-only for guests**: Log session, Import, edit and delete buttons (and the `N` hotkey) are hidden and locked. A **Login** button in the header unlocks edit mode for whoever knows the password.

To activate the lock:

1. Netlify → **Site configuration → Environment variables** → add `BANKROLL_WRITE_KEY` = your chosen password.
2. **Trigger a redeploy** (Deploys → Trigger deploy → Deploy site) — env var changes only reach functions on a new deploy.
3. Done. Guests see everything but can't change anything; every write (`PUT`) is rejected server-side with 401 unless it carries the password. Wrong/stale logins get bounced back to view-only automatically. Your login persists per device (Logout button clears it).

If the env var is missing, the site runs open (as before) and the Login button hides itself — so set it before sharing the link.

Note: view-only means anyone with the link can *read* your numbers — the lock guards **changes**, not reads. Keep the URL itself semi-private if the amounts are sensitive.

## Optional: lock down writes

Anyone who guesses your function URL could read/overwrite the ledger. To add a basic gate:

1. Netlify → *Site configuration → Environment variables* → add `BANKROLL_WRITE_KEY` = some long random string.
2. In `index.html`, set `var SYNC_KEY='same string';` near the top of the sync section.
3. Redeploy. (Note: the key lives in your page source, so treat this as a diary lock, not a vault.)

## Troubleshooting: dot shows LOCAL / NO SYNC, other devices are empty

The **NO SYNC** (red) or **LOCAL** pill on a *.netlify.app* site means `/.netlify/functions/sessions` returned 404 — the deploy has no Functions. Your data is then trapped in that one browser's localStorage.

Fix (in order):

1. **Verify:** open `https://YOUR-SITE.netlify.app/.netlify/functions/sessions` in a tab. Valid JSON = functions work. 404 = they never deployed.
2. **Check the dashboard:** *Cloud compute → Functions* should list `sessions` and `auth`. If empty, the last deploy skipped the function build (common with drag-and-drop "prebuilt" uploads).
3. **Re-drop the full `bankroll.zip`** — this project's `netlify.toml` declares an explicit build command to force npm install + function bundling on Drop. Watch the deploy log for "Functions bundled" and confirm step 2 again.
4. **If Drop still refuses to build functions, switch to the deterministic route:** create a GitHub repo → upload this folder via GitHub's web UI → Netlify → Add new project → Import from Git → pick the repo (build settings auto-read from `netlify.toml`, leave build command field alone). Functions + Blobs always work on Git-connected deploys.

Once functions are live, open the site in the browser that holds your data — it auto-pushes everything to the cloud on first load (dot turns green SYNCED). Every other device/incognito window then pulls it (view-only until you log in).

## Backups

**Backup** (JSON) and **CSV** export buttons remain in the header — worth downloading a JSON occasionally, since blobs are tied to your Netlify site. **Import** restores a backup on any device.
