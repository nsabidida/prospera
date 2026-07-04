const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { createClient } = require("@libsql/client");

// --- Connection -------------------------------------------------------
// If TURSO_DATABASE_URL is set, Prospera talks to a Turso cloud database
// (no local disk needed — this is what makes it deployable on hosts with
// no persistent storage, like Render's free tier). Otherwise it falls
// back to a local SQLite file for zero-config local development.
const usingCloud = !!process.env.TURSO_DATABASE_URL;

let client;
if (usingCloud) {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  client = createClient({ url: `file:${path.join(dataDir, "prospera.db")}` });
}

async function run(sql, args = []) {
  return client.execute({ sql, args });
}

async function get(sql, args = []) {
  const rs = await run(sql, args);
  return rs.rows[0] || null;
}

async function all(sql, args = []) {
  const rs = await run(sql, args);
  return rs.rows;
}

// --- Schema -------------------------------------------------------------
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  handle        TEXT UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by   INTEGER REFERENCES users(id),
  role          TEXT NOT NULL DEFAULT 'user',
  status        TEXT NOT NULL DEFAULT 'active',
  points        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ranks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  emblem     TEXT NOT NULL DEFAULT 'chevron'
);

CREATE TABLE IF NOT EXISTS codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  points      INTEGER NOT NULL,
  max_uses    INTEGER NOT NULL DEFAULT 1,
  uses_count  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  note        TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT
);

CREATE TABLE IF NOT EXISTS code_redemptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id    INTEGER NOT NULL REFERENCES codes(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  points     INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code_id, user_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  points     INTEGER NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
`;

const DEFAULT_SETTINGS = {
  signup_points: "50",
  referral_points: "100",
  brand_name: "Prospera",
};

// Growth ladder: every Prosperian starts as a Seed and rises toward Pillar.
const DEFAULT_RANKS = [
  ["Seed", 0, 1, "chevron-1"],
  ["Sprout", 150, 2, "chevron-2"],
  ["Builder", 400, 3, "chevron-3"],
  ["Architect", 900, 4, "bar-1"],
  ["Pioneer", 1800, 5, "bar-2"],
  ["Visionary", 3200, 6, "star-1"],
  ["Luminary", 5500, 7, "star-2"],
  ["Pillar", 9000, 8, "star-3"],
];

const DEFAULT_CONTENT = [
  ["brand.name", "Prospera"],
  ["brand.tagline", "Create. Build. Prosper."],
  ["brand.member_title", "Prosperian"],

  ["nav.dashboard", "Dashboard"],
  ["nav.organization", "My Network"],
  ["nav.leaderboard", "Leaderboard"],
  ["nav.redeem", "Redeem Boost"],
  ["nav.profile", "Profile"],
  ["nav.signout", "Sign out"],
  ["nav.field_ops", "Member Home"],
  ["nav.command_hq", "Prospera HQ"],
  ["nav.back_to_app", "← Back to Member Home"],
  ["nav.hq_overview", "Overview"],
  ["nav.hq_users", "Prosperians"],
  ["nav.hq_codes", "Boost Codes"],
  ["nav.hq_settings", "Point Rules & Ranks"],
  ["nav.hq_content", "Site Text"],

  ["auth.hero.eyebrow", "A movement for prosperity"],
  ["auth.hero.title", "Create. Build.\nProsper."],
  ["auth.hero.body", "Prospera is a movement for people building their own path to prosperity. Grow your network, hit your objectives, and rise from Seed to Pillar as a Prosperian."],

  ["auth.login.eyebrow", "Sign in"],
  ["auth.login.title", "Welcome back"],
  ["auth.login.subtitle", "Sign in to keep building your prosperity."],
  ["auth.login.email_label", "Email"],
  ["auth.login.password_label", "Password"],
  ["auth.login.submit", "Sign in"],
  ["auth.login.submit_loading", "Signing in…"],
  ["auth.login.footer_text", "New to Prospera?"],
  ["auth.login.footer_link", "Join the movement"],

  ["auth.signup.eyebrow", "Join Prospera"],
  ["auth.signup.title", "Start your prosperity journey"],
  ["auth.signup.subtitle", "Create your account and plant your first Seed."],
  ["auth.signup.name_label", "Full name"],
  ["auth.signup.email_label", "Email"],
  ["auth.signup.password_label", "Password"],
  ["auth.signup.referral_label", "Referral code (optional)"],
  ["auth.signup.submit", "Become a Prosperian"],
  ["auth.signup.submit_loading", "Creating account…"],
  ["auth.signup.footer_text", "Already a Prosperian?"],
  ["auth.signup.footer_link", "Sign in"],

  ["dashboard.eyebrow", "Member home"],
  ["dashboard.welcome_prefix", "Welcome back,"],
  ["dashboard.invite_button", "Invite someone to Prospera"],
  ["dashboard.stat_points", "Prosperity points"],
  ["dashboard.stat_rank", "Current rank"],
  ["dashboard.stat_referrals", "People you've brought in"],
  ["dashboard.activity_title", "Recent activity"],
  ["dashboard.activity_empty", "No activity yet — invite your first Prosperian to get started."],
  ["dashboard.rank_progress_title", "Rank progress"],
  ["dashboard.top_rank_label", "Top rank reached"],
  ["dashboard.next_rank_prefix", "Next:"],
  ["dashboard.progress_suffix", "% to next rank"],
  ["dashboard.referral_code_label", "Your referral code"],
  ["dashboard.copy_button", "Copy"],
  ["dashboard.tx_signup", "Welcome bonus"],
  ["dashboard.tx_referral", "Network growth bonus"],
  ["dashboard.tx_code", "Boost code"],
  ["dashboard.tx_admin_adjust", "Prospera HQ adjustment"],

  ["organization.eyebrow", "Your network"],
  ["organization.title", "Your Prospera network"],
  ["organization.recruit_title", "Grow your network"],
  ["organization.recruit_body", "Share your link. Everyone who joins through it becomes part of your network, and earns you points as your network prospers."],
  ["organization.copy_button", "Copy link"],
  ["organization.copy_button_done", "Copied!"],
  ["organization.tree_title", "Network tree"],
  ["organization.tree_empty", "No one in your network yet. Share your link above to start building."],
  ["organization.you_badge", "You"],

  ["leaderboard.eyebrow", "Standings"],
  ["leaderboard.title", "Leaderboard"],
  ["leaderboard.col_rank", "#"],
  ["leaderboard.col_leader", "Prosperian"],
  ["leaderboard.col_org", "Network size"],
  ["leaderboard.col_points", "Points"],
  ["leaderboard.you_badge", "You"],

  ["redeem.eyebrow", "Bonus intake"],
  ["redeem.title", "Redeem a boost code"],
  ["redeem.body", "Prospera HQ issues boost codes for milestones, events, and special objectives. Enter yours below to add the points to your account."],
  ["redeem.label", "Boost code"],
  ["redeem.placeholder", "e.g. PR-4K9P2X"],
  ["redeem.button", "Redeem code"],
  ["redeem.button_loading", "Confirming…"],
  ["redeem.success_prefix", "Confirmed. +"],
  ["redeem.success_suffix", "points added to your total."],

  ["profile.eyebrow", "Personnel file"],
  ["profile.title", "Profile"],
  ["profile.password_title", "Change password"],
  ["profile.password_body", "Use a password you don't use anywhere else."],
  ["profile.current_password_label", "Current password"],
  ["profile.new_password_label", "New password"],
  ["profile.password_button", "Update password"],
  ["profile.password_button_loading", "Updating…"],
  ["profile.handle_title", "Unique address"],
  ["profile.handle_body", "Claim a unique callsign for your public profile. Letters, numbers, and hyphens only."],
  ["profile.handle_label", "Address"],
  ["profile.handle_prefix", "prospera.co/"],
  ["profile.handle_button", "Save address"],
  ["profile.handle_button_loading", "Saving…"],

  ["admin.overview.eyebrow", "Prospera HQ"],
  ["admin.overview.title", "Overview"],
  ["admin.overview.stat_users", "Total Prosperians"],
  ["admin.overview.stat_points", "Points in circulation"],
  ["admin.overview.stat_codes", "Codes redeemed"],
  ["admin.overview.top_referrers_title", "Top network builders"],
  ["admin.overview.recent_signups_title", "Newest Prosperians"],

  ["admin.users.eyebrow", "Prospera HQ"],
  ["admin.users.title", "Prosperians"],
  ["admin.users.search_placeholder", "Search name, email, or address…"],
  ["admin.users.search_button", "Search"],
  ["admin.users.empty", "No matching Prosperians."],
  ["admin.users.detail_empty", "Select a Prosperian to view their file."],
  ["admin.users.suspend_button", "Suspend account"],
  ["admin.users.reactivate_button", "Reactivate account"],
  ["admin.users.revoke_hq_button", "Revoke HQ access"],
  ["admin.users.grant_hq_button", "Grant HQ access"],
  ["admin.users.adjust_title", "Adjust points"],
  ["admin.users.adjust_amount_label", "Amount (use - to deduct)"],
  ["admin.users.adjust_note_label", "Note"],
  ["admin.users.adjust_button", "Apply adjustment"],
  ["admin.users.history_title", "Transaction history"],

  ["admin.codes.eyebrow", "Prospera HQ"],
  ["admin.codes.title", "Boost codes"],
  ["admin.codes.issue_title", "Issue a new boost code"],
  ["admin.codes.issue_body", "Prosperians redeem this code from their dashboard to receive bonus points."],
  ["admin.codes.points_label", "Points value"],
  ["admin.codes.max_uses_label", "Max redemptions"],
  ["admin.codes.custom_code_label", "Custom code (optional — auto-generated if blank)"],
  ["admin.codes.note_label", "Internal note (optional)"],
  ["admin.codes.create_button", "Create code"],
  ["admin.codes.create_button_loading", "Creating…"],
  ["admin.codes.list_title", "All codes"],
  ["admin.codes.empty", "No codes issued yet."],
  ["admin.codes.deactivate", "Active — deactivate"],
  ["admin.codes.activate", "Inactive — activate"],

  ["admin.settings.eyebrow", "Prospera HQ"],
  ["admin.settings.title", "Point rules & ranks"],
  ["admin.settings.rules_title", "Point rules"],
  ["admin.settings.signup_points_label", "Points per sign-up"],
  ["admin.settings.referral_points_label", "Points per successful referral"],
  ["admin.settings.brand_name_label", "Platform name"],
  ["admin.settings.save_button", "Save rules"],
  ["admin.settings.save_button_loading", "Saving…"],
  ["admin.settings.ranks_title", "Rank ladder"],
  ["admin.settings.add_rank_title", "Add a rank"],
  ["admin.settings.rank_name_label", "Name"],
  ["admin.settings.rank_points_label", "Min. points"],
  ["admin.settings.add_rank_button", "Add rank"],
  ["admin.settings.save_rank_button", "Save"],
  ["admin.settings.delete_rank_button", "Delete"],

  ["admin.content.eyebrow", "Prospera HQ"],
  ["admin.content.title", "Site text"],
  ["admin.content.body", "Edit any word or phrase shown across the platform. Changes appear immediately for everyone."],
  ["admin.content.search_placeholder", "Search text…"],
  ["admin.content.save_button", "Save changes"],
  ["admin.content.save_button_loading", "Saving…"],
  ["admin.content.saved_message", "Site text updated."],
];

let migrated = false;

async function migrate() {
  if (migrated) return;

  await client.executeMultiple(SCHEMA_SQL);

  const settingsBatch = Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
    args: [k, v],
  }));
  if (settingsBatch.length) await client.batch(settingsBatch, "write");

  const contentBatch = DEFAULT_CONTENT.map(([k, v]) => ({
    sql: "INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)",
    args: [k, v],
  }));
  if (contentBatch.length) await client.batch(contentBatch, "write");

  const rankCountRow = await get("SELECT COUNT(*) AS c FROM ranks");
  if (Number(rankCountRow.c) === 0) {
    const rankBatch = DEFAULT_RANKS.map((r) => ({
      sql: "INSERT INTO ranks (name, min_points, sort_order, emblem) VALUES (?, ?, ?, ?)",
      args: r,
    }));
    await client.batch(rankBatch, "write");
  }

  const adminCountRow = await get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
  if (Number(adminCountRow.c) === 0) {
    const name = process.env.SUPERADMIN_NAME || "Prospera HQ";
    const email = (process.env.SUPERADMIN_EMAIL || "admin@prospera.local").toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe!12345";
    const hash = bcrypt.hashSync(password, 10);
    const refCode = "HQ-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    await run(
      `INSERT INTO users (name, email, password_hash, handle, referral_code, role, status, points)
       VALUES (?, ?, ?, ?, ?, 'admin', 'active', 0)`,
      [name, email, hash, "prospera-hq", refCode]
    );
    console.log(`[prospera] Super admin created: ${email} / (password from environment)`);
  }

  migrated = true;
  console.log(`[prospera] Database ready (${usingCloud ? "Turso cloud" : "local file"}).`);
}

module.exports = { client, run, get, all, migrate };
