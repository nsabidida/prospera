# Putting Prospera online — step by step

This assumes you've never deployed anything before. No command line is
required except a few copy/paste steps, clearly marked. Total time:
20–30 minutes. Everything below is free to start.

This is simpler than a typical deploy because Prospera runs as **one
service** with **one database** — not two separate websites glued
together. That's deliberate: fewer accounts, fewer settings, fewer places
for something to go wrong.

We'll use:
- **GitHub** — free storage for your code, and where your host pulls it from
- **Turso** — a free, cloud-hosted database (this is what removes the
  "no persistent disk" problem — your data lives in Turso, not on the
  server itself, so it survives restarts, redeploys, and free-tier limits)
- **Render** — free hosting for the app itself

---

## Part 1 — Get the code onto GitHub

### 1. Create a GitHub account
Go to https://github.com and sign up (free).

### 2. Install GitHub Desktop
Go to https://desktop.github.com, download it, and install it. This gives
you a simple app — no typed commands — for getting files onto GitHub.

### 3. Create a new repository
1. Open GitHub Desktop and sign in.
2. Click **File → New Repository**.
3. Name it `prospera`.
4. For "Local Path," pick a folder on your computer.
5. Click **Create Repository**.

### 4. Add the project files
1. Unzip the `prospera.zip` file from this chat.
2. Copy everything inside the unzipped folder (the `server` folder, the
   `client` folder, and the `.md` files) into the repository folder from
   step 3.
3. Switch to GitHub Desktop — it will detect the new files automatically.
4. Type a summary like `Initial version` in the bottom-left box, then
   click **Commit to main**.
5. Click **Publish repository** at the top. Either "public" or "private"
   is fine.

Your code is now on GitHub.

---

## Part 2 — Create your free database (Turso)

### 1. Create a Turso account
Go to https://turso.tech and sign up — using GitHub to sign in is
usually the fastest option.

### 2. Create a database
1. In the Turso dashboard, create a new database (look for a button like
   **"Create Database"**).
2. Give it a name, e.g. `prospera`.
3. Pick any region — the closest one to your users is a reasonable
   default, but it isn't critical to get exactly right.

### 3. Get your connection details
Open the database you just created. You're looking for two pieces of
information — the dashboard may label them slightly differently, but
they'll be easy to spot:
- A **Database URL** — starts with `libsql://...`
- An **Auth Token** — a long string; there's usually a "create token" or
  "generate token" button if one isn't shown by default

**Copy both of these somewhere safe — you'll paste them into Render in
Part 3.** Turso's free tier (a few active databases, generous storage and
read limits) is more than enough for Prospera.

---

## Part 3 — Deploy Prospera (Render)

### 1. Create a Render account
Go to https://render.com and sign up with **"Sign up with GitHub"** so
the two are connected.

### 2. Create the web service
1. In the Render dashboard, click **New → Web Service**.
2. Choose your `prospera` repository.
3. Fill in the settings:
   - **Name**: `prospera` (or anything you like)
   - **Root Directory**: leave this **blank** (not `server` — this is
     what lets the build step reach both `server` and `client`)
   - **Runtime**: Node
   - **Build Command**:
     ```
     npm install --prefix server && npm install --prefix client && npm run build --prefix client
     ```
   - **Start Command**:
     ```
     npm start --prefix server
     ```
   - **Instance Type**: Free (fine to start)

Do **not** add a disk. You don't need one — that's the whole point of
using Turso.

### 3. Set your environment variables
Scroll to **Environment Variables** and add:

| Key | Value |
|---|---|
| `JWT_SECRET` | Any long random string — mash your keyboard for 40 characters. Keep it secret. |
| `TURSO_DATABASE_URL` | The `libsql://...` URL from Part 2 |
| `TURSO_AUTH_TOKEN` | The auth token from Part 2 |
| `SUPERADMIN_NAME` | Your name, or "Prospera HQ" |
| `SUPERADMIN_EMAIL` | The email you'll use to log into the admin panel |
| `SUPERADMIN_PASSWORD` | A strong password — you'll change it after first login anyway |

You do **not** need to set `CLIENT_ORIGIN` or any frontend URL variable —
since everything runs from one service, there's nothing to connect.

### 4. Deploy
Click **Create Web Service**. Render will install everything, build the
frontend, and start the server — this takes a few minutes the first
time. When it's done, you'll get a URL like:

```
https://prospera-xxxx.onrender.com
```

**This is your live website. Visit it, and you should see the Prospera
sign-in page.**

---

## Part 4 — First login and cleanup

1. Visit your website URL.
2. Log in with the `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` you set in
   Part 3 — this takes you to Prospera HQ.
3. **Immediately go to your Profile and change your password.**
4. Explore **Prospera HQ → Site Text** to reword anything you like, and
   **Point Rules & Ranks** to set your point values.

You're live. New members sign up at your website's `/signup` page.

---

## Making changes later

**Site text, point rules, ranks, and boost codes** — all editable live
from Prospera HQ, no redeploy needed.

**Code changes** (if you or someone else edits the actual app):
1. Edit the files in your local `prospera` folder.
2. Open GitHub Desktop, write a short summary, click **Commit to main**,
   then **Push origin**.
3. Render detects the update and redeploys automatically within a
   couple of minutes.

## A note on the free tier

Render's free web services "sleep" after periods of inactivity and take
10–20 seconds to wake up on the next visit — fine for testing or a small
launch. Turso's free tier is generous enough that you're unlikely to hit
its limits before you outgrow Render's free tier first. If you outgrow
either, both offer inexpensive paid plans with no code changes required —
just a setting change in each dashboard.

## If something goes wrong

- **"Application failed to respond" or the page won't load**: open your
  Render service's **Logs** tab — it will usually show the exact error.
  The most common cause is a typo in `TURSO_DATABASE_URL` or
  `TURSO_AUTH_TOKEN`.
- **Site loads but login fails**: double check `TURSO_DATABASE_URL` and
  `TURSO_AUTH_TOKEN` are pasted exactly as shown in Turso (no extra
  spaces), then trigger a manual redeploy from Render's dashboard.
- **Build fails**: open the **Logs** tab during the build — it will show
  which of the two `npm install` steps or the `vite build` step failed,
  which usually points straight at the problem.
- **Lost your super admin password**: change `SUPERADMIN_EMAIL` to a new
  address in Render's environment variables and redeploy — this only
  creates a fresh super admin if no admin account exists yet in the
  database. If one already exists, the simplest fix is asking someone
  with Turso dashboard access to edit the `users` table directly (Turso's
  dashboard includes a basic data browser/SQL console), or come back here
  for help.
