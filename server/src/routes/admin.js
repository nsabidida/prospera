const express = require("express");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { publicUser } = require("../lib/sanitize");
const { getAllRanks } = require("../lib/ranks");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ---------------- Stats ----------------
router.get("/stats", async (req, res, next) => {
  try {
    const totalUsersRow = await db.get("SELECT COUNT(*) AS c FROM users WHERE role='user'");
    const totalPointsRow = await db.get("SELECT COALESCE(SUM(points),0) AS s FROM users WHERE role='user'");
    const totalCodesRow = await db.get("SELECT COUNT(*) AS c FROM code_redemptions");
    const topReferrers = await db.all(
      `SELECT id, name, handle, (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id) AS org_size
       FROM users WHERE role='user' ORDER BY org_size DESC LIMIT 5`
    );
    const recentSignups = await db.all(
      "SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 8"
    );

    res.json({
      totalUsers: Number(totalUsersRow.c),
      totalPoints: Number(totalPointsRow.s),
      totalCodesRedeemed: Number(totalCodesRow.c),
      topReferrers,
      recentSignups,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------- Site text (every editable label/heading/button) ----------------
router.get("/content", async (req, res, next) => {
  try {
    const rows = await db.all("SELECT key, value FROM content ORDER BY key ASC");
    res.json({ content: rows });
  } catch (err) {
    next(err);
  }
});

router.put("/content", async (req, res, next) => {
  try {
    const updates = req.body || {};
    const entries = Object.entries(updates);
    if (entries.length) {
      const batch = entries.map(([k, v]) => ({
        sql: "INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [k, String(v)],
      }));
      await db.client.batch(batch, "write");
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------- Settings (point rules) ----------------
router.get("/settings", async (req, res, next) => {
  try {
    const rows = await db.all("SELECT key, value FROM settings");
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const updates = req.body || {};
    const entries = Object.entries(updates);
    if (entries.length) {
      const batch = entries.map(([k, v]) => ({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [k, String(v)],
      }));
      await db.client.batch(batch, "write");
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------- Ranks ----------------
router.get("/ranks", async (req, res, next) => {
  try {
    res.json({ ranks: await getAllRanks() });
  } catch (err) {
    next(err);
  }
});

router.put("/ranks/:id", async (req, res, next) => {
  try {
    const { name, min_points } = req.body || {};
    const rank = await db.get("SELECT * FROM ranks WHERE id = ?", [req.params.id]);
    if (!rank) return res.status(404).json({ error: "Rank not found." });
    await db.run(
      "UPDATE ranks SET name = COALESCE(?, name), min_points = COALESCE(?, min_points) WHERE id = ?",
      [name ?? null, min_points ?? null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/ranks", async (req, res, next) => {
  try {
    const { name, min_points, emblem } = req.body || {};
    if (!name || min_points === undefined)
      return res.status(400).json({ error: "Name and min_points are required." });
    const maxOrderRow = await db.get("SELECT COALESCE(MAX(sort_order),0) AS m FROM ranks");
    const result = await db.run(
      "INSERT INTO ranks (name, min_points, sort_order, emblem) VALUES (?, ?, ?, ?)",
      [name, min_points, Number(maxOrderRow.m) + 1, emblem || "chevron-1"]
    );
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});

router.delete("/ranks/:id", async (req, res, next) => {
  try {
    await db.run("DELETE FROM ranks WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------- Users ----------------
router.get("/users", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = await db.all(
        `SELECT * FROM users WHERE name LIKE ? OR email LIKE ? OR handle LIKE ? OR referral_code LIKE ?
         ORDER BY id DESC LIMIT 100`,
        [like, like, like, like]
      );
    } else {
      rows = await db.all("SELECT * FROM users ORDER BY id DESC LIMIT 100");
    }
    res.json({ users: rows.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found." });
    const transactions = await db.all(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      [user.id]
    );
    const directReferrals = await db.all(
      "SELECT id, name, handle, points, created_at FROM users WHERE referred_by = ?",
      [user.id]
    );
    res.json({ user: publicUser(user), transactions, directReferrals });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/adjust", async (req, res, next) => {
  try {
    const { points, note } = req.body || {};
    const delta = parseInt(points, 10);
    if (!delta) return res.status(400).json({ error: "Provide a non-zero integer point amount." });

    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found." });

    const tx = await db.client.transaction("write");
    try {
      await tx.execute({
        sql: "UPDATE users SET points = MAX(0, points + ?) WHERE id = ?",
        args: [delta, user.id],
      });
      await tx.execute({
        sql: "INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'admin_adjust', ?, ?)",
        args: [user.id, delta, note || "Manual adjustment by Prospera HQ"],
      });
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    const updated = await db.get("SELECT * FROM users WHERE id = ?", [user.id]);
    res.json({ ok: true, user: publicUser(updated) });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!["active", "suspended"].includes(status))
      return res.status(400).json({ error: "Status must be 'active' or 'suspended'." });
    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ error: "You cannot suspend your own account." });
    await db.run("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!["user", "admin"].includes(role))
      return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
    await db.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------- Boost codes ----------------
router.get("/codes", async (req, res, next) => {
  try {
    const codes = await db.all("SELECT * FROM codes ORDER BY id DESC LIMIT 100");
    res.json({ codes });
  } catch (err) {
    next(err);
  }
});

router.post("/codes", async (req, res, next) => {
  try {
    const { points, maxUses, note, expiresAt, customCode } = req.body || {};
    const p = parseInt(points, 10);
    if (!p || p <= 0) return res.status(400).json({ error: "Points must be a positive integer." });

    const code = (customCode && customCode.trim().toUpperCase()) || nanoid(8).toUpperCase();
    const existing = await db.get("SELECT 1 FROM codes WHERE code = ?", [code]);
    if (existing) return res.status(409).json({ error: "That code already exists." });

    const result = await db.run(
      `INSERT INTO codes (code, points, max_uses, note, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, p, parseInt(maxUses, 10) || 1, note || null, req.user.id, expiresAt || null]
    );

    res.status(201).json({ id: Number(result.lastInsertRowid), code });
  } catch (err) {
    next(err);
  }
});

router.post("/codes/:id/toggle", async (req, res, next) => {
  try {
    const record = await db.get("SELECT * FROM codes WHERE id = ?", [req.params.id]);
    if (!record) return res.status(404).json({ error: "Code not found." });
    await db.run("UPDATE codes SET active = ? WHERE id = ?", [record.active ? 0 : 1, record.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
