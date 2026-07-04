# Prospera

**Create. Build. Prosper.**

Prospera is a movement-building platform: people join, refer others to grow
their network, and earn points for building their own path to prosperity.
Members rise through a rank ladder — Seed → Sprout → Builder → Architect →
Pioneer → Visionary → Luminary → Pillar — and a super admin ("Prospera HQ")
controls every point rule, every rank, and every word on the site.

**Stack:** Node.js/Express (backend + serves the built frontend) + Turso
(cloud SQLite, free, no server disk needed) + React/Vite (frontend) + JWT auth.

**New to deploying?** See [`DEPLOYMENT.md`](./DEPLOYMENT.md) — a step-by-step,
no-command-line-required guide. The whole thing deploys as **one service**
with **one free database**, no persistent disk required.

## What's included

- Email/password auth (JWT), bcrypt password hashing
- Referral network — every Prosperian gets a unique referral link; joining
  through it links the new member into the referrer's network tree and
  awards the referrer points
- Configurable point rules (points per sign-up, points per referral) —
  editable live from Prospera HQ, no code changes needed
- **Every word on the site is editable** — Prospera HQ → Site Text lets
  the super admin change any heading, label, button, or message shown
  anywhere in the app, live, with no redeploy
- A fully editable rank ladder (Seed → Pillar by default) — add, rename, or
  re-threshold ranks from Prospera HQ
- Boost codes: Prospera HQ issues a code worth N points with a redemption
  limit and optional expiry; members redeem it once from their dashboard
- Network tree view and a global leaderboard
- Profile settings: change password, claim a unique profile address
- Prospera HQ (super admin): platform-wide stats, member search with
  audit-logged manual point adjustments, suspend/reactivate or
  promote/demote accounts, manage boost codes and point rules

Note on scope: points here are an in-platform achievement/reputation
metric — earned through sign-ups, referrals, and admin-issued boost codes.
There is no cash-out, withdrawal, or percentage-return mechanic; that was
intentionally left out because it turns a growth platform into a financial
instrument (the structure behind many referral-funded "return" schemes),
regardless of intent.

## Project layout

```
prospera/
  server/     Express API — also serves the built frontend in production
  client/     React (Vite) frontend
```

## 1. Run it locally

### Backend

```bash
cd server
npm install
cp .env.example .env      # then edit .env — set a real JWT_SECRET and admin password
npm run dev                 # starts on http://localhost:4000
```

With no `TURSO_DATABASE_URL` set, Prospera automatically uses a local
SQLite file at `server/data/prospera.db` — zero setup for local dev. On
first run it also creates your super admin account from the
`SUPERADMIN_*` values in `.env`.

### Frontend

```bash
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173. Vite proxies `/api` to the backend
automatically in dev (see `client/vite.config.js`) — no CORS setup needed.

Sign in with the super admin email/password from `server/.env` to reach
Prospera HQ at `/hq`. New accounts from the sign-up page land in Member
Home at `/app`.

## 2. Configure point rules

In Prospera HQ → **Point Rules & Ranks** you can change:
- Points awarded per sign-up
- Points awarded per successful referral
- The rank ladder (names and point thresholds), including adding/removing ranks

Changes apply immediately — no redeploy needed.

## 3. Edit any word on the site

Prospera HQ → **Site Text** lists every heading, label, and button in the
app. Change any of them and hit save — it updates live for everyone.

## 4. Issue boost codes

Prospera HQ → **Boost Codes** → create a code with a points value, a
redemption cap, and an optional note. Members redeem it once each from
**Redeem Boost** in their dashboard.

## 5. Deploying

**For the full, non-developer-friendly walkthrough, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).**

Short version: Prospera deploys as a **single** Node web service.
- Create a free database at [turso.tech](https://turso.tech) (web dashboard,
  no CLI needed) — you'll get a URL and a token.
- Deploy `server/` to any Node host (Render, Railway, Fly.io, a VPS).
  Build command installs both `server` and `client` and runs `vite build`;
  start command runs the server, which serves the built frontend itself.
- Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, and the
  `SUPERADMIN_*` variables from `server/.env.example` in your host's
  environment variable settings.

No persistent disk is required anywhere — Turso holds your data.

### Security checklist before going live
- Set a long, random `JWT_SECRET` in production
- Change the default super admin password immediately after first login
- Serve everything over HTTPS (most hosts do this by default)

## Verifying the schema/logic without installing anything

`server/test/schema-logic.smoke.js` re-implements Prospera's SQL schema and
core business logic (signup, referral payouts, code redemption limits,
point adjustments, rank thresholds, the network-tree query) against
Node's built-in `node:sqlite` module and asserts the expected outcomes —
no `npm install` needed:

```bash
node --experimental-sqlite server/test/schema-logic.smoke.js
```

This validates the SQL and logic (Turso/libSQL is SQLite-compatible, so
the same schema and queries apply) — a good first thing to re-run if you
modify the schema or point-calculation logic later.

## Data model summary

- `users` — account, referral link (`referred_by`), role, points, unique `handle`
- `settings` — key/value point-rule configuration
- `content` — key/value site text (every editable word/label/heading)
- `ranks` — the editable rank ladder
- `codes` / `code_redemptions` — admin-issued boost codes and who's used them
- `transactions` — a full audit trail of every point change
