const { DatabaseSync } = require('node:sqlite');
const assert = require('node:assert');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

// ---- exact schema copied from server/src/db.js ----
db.exec(`
CREATE TABLE users (
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

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE ranks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  emblem     TEXT NOT NULL DEFAULT 'chevron'
);

CREATE TABLE codes (
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

CREATE TABLE code_redemptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id    INTEGER NOT NULL REFERENCES codes(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  points     INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code_id, user_id)
);

CREATE TABLE transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  points     INTEGER NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
insertSetting.run('signup_points', '50');
insertSetting.run('referral_points', '100');
insertSetting.run('brand_name', 'Prospera');

const insertRank = db.prepare("INSERT INTO ranks (name, min_points, sort_order, emblem) VALUES (?, ?, ?, ?)");
const defaultRanks = [
  ['Recruit', 0, 1, 'chevron-1'],
  ['Cadet', 150, 2, 'chevron-2'],
  ['Sergeant', 400, 3, 'chevron-3'],
  ['Lieutenant', 900, 4, 'bar-1'],
  ['Captain', 1800, 5, 'bar-2'],
  ['Major', 3200, 6, 'star-1'],
  ['Colonel', 5500, 7, 'star-2'],
  ['General', 9000, 8, 'star-3'],
];
for (const r of defaultRanks) insertRank.run(...r);

console.log('Schema + seed OK');

// ---- port of lib/ranks.js ----
function getAllRanks() {
  return db.prepare('SELECT * FROM ranks ORDER BY sort_order ASC').all();
}
function getRankForPoints(points) {
  const ranks = getAllRanks();
  let current = ranks[0] || null;
  let next = null;
  for (let i = 0; i < ranks.length; i++) {
    if (points >= ranks[i].min_points) {
      current = ranks[i];
      next = ranks[i + 1] || null;
    }
  }
  let progressPct = 100;
  if (next) {
    const span = next.min_points - current.min_points;
    const gained = points - current.min_points;
    progressPct = Math.max(0, Math.min(100, Math.round((gained / span) * 100)));
  }
  return { current, next, progressPct };
}

// ---- makeReferralCode port ----
function makeReferralCode(seed) {
  return 'REF' + seed;
}

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

// ---- signup logic port (from routes/auth.js) ----
function signup(name, email, password_hash, referralCode) {
  let referrer = null;
  if (referralCode) {
    referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referralCode);
    if (!referrer) throw new Error('referral code not found');
  }
  const myReferralCode = makeReferralCode(Math.random().toString(36).slice(2, 8));
  const signupPoints = parseInt(getSetting('signup_points', '50'), 10) || 0;
  const referralPoints = parseInt(getSetting('referral_points', '100'), 10) || 0;

  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO users (name, email, password_hash, referral_code, referred_by, points)
       VALUES (?, ?, ?, ?, ?, ?)`).run(name, email, password_hash, myReferralCode, referrer ? referrer.id : null, signupPoints);
    const newUserId = db.prepare('SELECT last_insert_rowid() AS id').get().id;
    db.prepare("INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'signup', ?, 'welcome')").run(newUserId, signupPoints);
    if (referrer) {
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(referralPoints, referrer.id);
      db.prepare("INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'referral', ?, ?)").run(referrer.id, referralPoints, `Recruited ${name}`);
    }
    db.exec('COMMIT');
    return newUserId;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Test 1: signup with no referral
const u1 = signup('Alice Admin', 'alice@x.com', 'hash1', null);
let alice = db.prepare('SELECT * FROM users WHERE id = ?').get(u1);
assert.strictEqual(alice.points, 50, 'Alice should get 50 signup points');
console.log('Test 1 OK: base signup awards signup_points');

// Test 2: signup with referral
const u2 = signup('Bob Recruit', 'bob@x.com', 'hash2', alice.referral_code);
alice = db.prepare('SELECT * FROM users WHERE id = ?').get(u1);
let bob = db.prepare('SELECT * FROM users WHERE id = ?').get(u2);
assert.strictEqual(bob.points, 50, 'Bob should get 50 signup points');
assert.strictEqual(alice.points, 150, 'Alice should get +100 referral points (50+100)');
assert.strictEqual(bob.referred_by, alice.id);
console.log('Test 2 OK: referral awards referrer, links referred_by');

// Test 3: invalid referral code
let threw = false;
try { signup('Eve', 'eve@x.com', 'hash3', 'BOGUSCODE'); } catch (e) { threw = true; }
assert.ok(threw, 'invalid referral code should throw');
console.log('Test 3 OK: invalid referral code rejected');

// Test 4: rank calc
const rankInfo = getRankForPoints(alice.points); // 150 -> exactly Cadet threshold
assert.strictEqual(rankInfo.current.name, 'Cadet');
assert.strictEqual(rankInfo.next.name, 'Sergeant');
console.log('Test 4 OK: rank threshold boundary (150 points = Cadet exactly)', rankInfo);

const rankInfoBob = getRankForPoints(49);
assert.strictEqual(rankInfoBob.current.name, 'Recruit');
console.log('Test 4b OK: below-threshold points stay at base rank');

// Test 5: duplicate email constraint
threw = false;
try {
  db.prepare(`INSERT INTO users (name, email, password_hash, referral_code, points) VALUES (?, ?, ?, ?, 0)`)
    .run('Dup', 'alice@x.com', 'hashX', 'UNIQ1');
} catch (e) { threw = true; }
assert.ok(threw, 'duplicate email should violate UNIQUE constraint');
console.log('Test 5 OK: duplicate email rejected by UNIQUE constraint');

// ---- code redemption logic port (from routes/users.js) ----
function createCode(code, points, maxUses) {
  db.prepare('INSERT INTO codes (code, points, max_uses) VALUES (?, ?, ?)').run(code, points, maxUses);
}
function redeem(userId, code) {
  const record = db.prepare('SELECT * FROM codes WHERE code = ?').get(code);
  if (!record || !record.active) throw new Error('invalid/inactive');
  if (record.uses_count >= record.max_uses) throw new Error('limit reached');
  const already = db.prepare('SELECT 1 FROM code_redemptions WHERE code_id = ? AND user_id = ?').get(record.id, userId);
  if (already) throw new Error('already redeemed');

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO code_redemptions (code_id, user_id, points) VALUES (?, ?, ?)').run(record.id, userId, record.points);
    db.prepare('UPDATE codes SET uses_count = uses_count + 1 WHERE id = ?').run(record.id);
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(record.points, userId);
    db.prepare("INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'code', ?, ?)").run(userId, record.points, `code ${code}`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

createCode('BONUS100', 100, 1);
redeem(u2, 'BONUS100');
bob = db.prepare('SELECT * FROM users WHERE id = ?').get(u2);
assert.strictEqual(bob.points, 150, 'Bob should have 50+100=150 after redeeming code');
console.log('Test 6 OK: code redemption awards points');

threw = false;
try { redeem(u2, 'BONUS100'); } catch (e) { threw = true; }
assert.ok(threw, 'second redemption by same user should be blocked');
console.log('Test 7 OK: duplicate redemption blocked');

const u3 = signup('Carl Third', 'carl@x.com', 'hash4', alice.referral_code);
threw = false;
try { redeem(u3, 'BONUS100'); } catch (e) { threw = true; }
assert.ok(threw, 'max_uses=1 should block a second distinct user');
console.log('Test 8 OK: max_uses limit enforced across different users');

// ---- admin adjust port ----
function adjust(userId, delta) {
  db.exec('BEGIN');
  db.prepare('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?').run(delta, userId);
  db.prepare("INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'admin_adjust', ?, 'test')").run(userId, delta);
  db.exec('COMMIT');
}
adjust(u3, -99999);
const carl = db.prepare('SELECT * FROM users WHERE id = ?').get(u3);
assert.strictEqual(carl.points, 0, 'points should floor at 0, never negative');
console.log('Test 9 OK: negative adjustment floors at zero (MAX(0, ...))');

// ---- organization tree BFS port (from routes/users.js) ----
function organizationTree(rootId) {
  const nodesById = new Map();
  const root = db.prepare('SELECT id, name, referred_by FROM users WHERE id = ?').get(rootId);
  nodesById.set(root.id, { ...root, children: [] });
  let frontier = [root.id];
  let depth = 0;
  while (frontier.length && depth < 12) {
    const placeholders = frontier.map(() => '?').join(',');
    const rows = db.prepare(`SELECT id, name, referred_by FROM users WHERE referred_by IN (${placeholders})`).all(...frontier);
    if (!rows.length) break;
    frontier = [];
    for (const r of rows) { nodesById.set(r.id, { ...r, children: [] }); frontier.push(r.id); }
    depth++;
  }
  for (const node of nodesById.values()) {
    if (node.id === root.id) continue;
    const parent = nodesById.get(node.referred_by);
    if (parent) parent.children.push(node);
  }
  return { tree: nodesById.get(root.id), totalOrgSize: nodesById.size - 1 };
}

const org = organizationTree(alice.id);
assert.strictEqual(org.totalOrgSize, 2, 'Alice referred Bob and Carl directly -> org size 2');
assert.strictEqual(org.tree.children.length, 2);
console.log('Test 10 OK: organization tree BFS builds correct direct-referral tree, size =', org.totalOrgSize);

// deeper level: Dave referred by Bob
const u4 = signup('Dave Fourth', 'dave@x.com', 'hash5', bob.referral_code);
const org2 = organizationTree(alice.id);
assert.strictEqual(org2.totalOrgSize, 3, 'org size should now include Dave (3 total)');
const bobNode = org2.tree.children.find(c => c.id === bob.id);
assert.strictEqual(bobNode.children.length, 1, 'Dave should nest under Bob in the tree');
console.log('Test 11 OK: multi-level org tree nests correctly, size =', org2.totalOrgSize);

// ---- settings upsert (ON CONFLICT) ----
db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('signup_points', '75');
const updatedSetting = db.prepare("SELECT value FROM settings WHERE key='signup_points'").get();
assert.strictEqual(updatedSetting.value, '75');
console.log('Test 12 OK: settings upsert (ON CONFLICT DO UPDATE) works');

// verify new signup uses updated setting live
const u5 = signup('Erin Fifth', 'erin@x.com', 'hash6', null);
const erin = db.prepare('SELECT * FROM users WHERE id = ?').get(u5);
assert.strictEqual(erin.points, 75, 'signup_points change should apply immediately to new signups');
console.log('Test 13 OK: updated point rule applies live to next signup');

console.log('\\nALL SMOKE TESTS PASSED');

// ---- content table (site text) ----
db.exec(`CREATE TABLE content (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
db.prepare("INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)").run('dashboard.stat_points', 'Total points');
db.prepare("INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  .run('dashboard.stat_points', 'Power Score');
const updatedText = db.prepare("SELECT value FROM content WHERE key='dashboard.stat_points'").get();
assert.strictEqual(updatedText.value, 'Power Score', 'content upsert should overwrite existing text');
console.log('Test 14 OK: site-text upsert (super admin editing every word) works');

// Bulk update simulation (what PUT /admin/content does with req.body)
const bulk = { 'nav.dashboard': 'Home Base', 'nav.leaderboard': 'Rankings' };
const upsertContent = db.prepare("INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
db.exec('BEGIN');
for (const [k, v] of Object.entries(bulk)) upsertContent.run(k, v);
db.exec('COMMIT');
const navDash = db.prepare("SELECT value FROM content WHERE key='nav.dashboard'").get();
const navLeader = db.prepare("SELECT value FROM content WHERE key='nav.leaderboard'").get();
assert.strictEqual(navDash.value, 'Home Base');
assert.strictEqual(navLeader.value, 'Rankings');
console.log('Test 15 OK: bulk content update (multiple keys in one save) works');

console.log('\nALL SMOKE TESTS PASSED (including site-text editing)');
