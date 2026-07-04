const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { publicUser } = require("../lib/sanitize");
const { getRankForPoints, getAllRanks } = require("../lib/ranks");

const router = express.Router();
router.use(requireAuth);

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{2,23}$/;

// ---- Profile: change password ----
router.post("/profile/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Current and new password are required." });
    if (newPassword.length < 8)
      return res.status(400).json({ error: "New password must be at least 8 characters." });

    const ok = bcrypt.compareSync(currentPassword, req.user.password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect." });

    const hash = bcrypt.hashSync(newPassword, 10);
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Profile: set unique handle (callsign / profile address) ----
router.post("/profile/handle", async (req, res, next) => {
  try {
    const { handle } = req.body || {};
    if (!handle || !HANDLE_RE.test(handle.trim().toLowerCase()))
      return res.status(400).json({
        error: "Handle must be 3-24 characters: lowercase letters, numbers, and hyphens only.",
      });

    const clean = handle.trim().toLowerCase();
    const taken = await db.get("SELECT 1 FROM users WHERE handle = ? AND id != ?", [clean, req.user.id]);
    if (taken) return res.status(409).json({ error: "That address is already taken." });

    await db.run("UPDATE users SET handle = ? WHERE id = ?", [clean, req.user.id]);
    res.json({ ok: true, handle: clean });
  } catch (err) {
    next(err);
  }
});

// ---- Dashboard summary ----
router.get("/dashboard", async (req, res, next) => {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    const rank = await getRankForPoints(user.points);
    const directRow = await db.get("SELECT COUNT(*) AS c FROM users WHERE referred_by = ?", [user.id]);
    const recentTx = await db.all(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10",
      [user.id]
    );

    res.json({
      user: publicUser(user),
      rank,
      directReferrals: Number(directRow.c),
      recentTransactions: recentTx,
      ranks: await getAllRanks(),
    });
  } catch (err) {
    next(err);
  }
});

// ---- Organization tree (direct + indirect referrals) ----
router.get("/organization", async (req, res, next) => {
  try {
    const rootId = req.user.id;

    const nodesById = new Map();
    const root = await db.get(
      "SELECT id, name, handle, points, referred_by, created_at FROM users WHERE id = ?",
      [rootId]
    );
    nodesById.set(root.id, { ...root, children: [] });

    let frontier = [root.id];
    let depth = 0;
    while (frontier.length && depth < 12) {
      const placeholders = frontier.map(() => "?").join(",");
      const rows = await db.all(
        `SELECT id, name, handle, points, referred_by, created_at FROM users WHERE referred_by IN (${placeholders})`,
        frontier
      );
      if (!rows.length) break;
      frontier = [];
      for (const r of rows) {
        nodesById.set(r.id, { ...r, children: [] });
        frontier.push(r.id);
      }
      depth++;
    }

    for (const node of nodesById.values()) {
      if (node.id === root.id) continue;
      const parent = nodesById.get(node.referred_by);
      if (parent) parent.children.push(node);
    }

    const tree = nodesById.get(root.id);
    const totalOrgSize = nodesById.size - 1;

    res.json({ tree, totalOrgSize, referralCode: req.user.referral_code });
  } catch (err) {
    next(err);
  }
});

// ---- Leaderboard ----
router.get("/leaderboard", async (req, res, next) => {
  try {
    const top = await db.all(
      `SELECT id, name, handle, points,
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id) AS org_size
       FROM users
       WHERE role = 'user'
       ORDER BY points DESC, created_at ASC
       LIMIT 50`
    );
    res.json({ leaderboard: top });
  } catch (err) {
    next(err);
  }
});

// ---- Redeem a bonus confirmation code issued by Prospera HQ ----
router.post("/redeem", async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code || !code.trim()) return res.status(400).json({ error: "Enter a confirmation code." });

    const clean = code.trim().toUpperCase();
    const record = await db.get("SELECT * FROM codes WHERE code = ?", [clean]);
    if (!record || !record.active) return res.status(404).json({ error: "Invalid or inactive code." });
    if (record.expires_at && new Date(record.expires_at) < new Date())
      return res.status(410).json({ error: "This code has expired." });
    if (record.uses_count >= record.max_uses)
      return res.status(410).json({ error: "This code has reached its redemption limit." });

    const already = await db.get(
      "SELECT 1 FROM code_redemptions WHERE code_id = ? AND user_id = ?",
      [record.id, req.user.id]
    );
    if (already) return res.status(409).json({ error: "You already redeemed this code." });

    const tx = await db.client.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO code_redemptions (code_id, user_id, points) VALUES (?, ?, ?)",
        args: [record.id, req.user.id, record.points],
      });
      await tx.execute({
        sql: "UPDATE codes SET uses_count = uses_count + 1 WHERE id = ?",
        args: [record.id],
      });
      await tx.execute({
        sql: "UPDATE users SET points = points + ? WHERE id = ?",
        args: [record.points, req.user.id],
      });
      await tx.execute({
        sql: "INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'code', ?, ?)",
        args: [req.user.id, record.points, `Redeemed boost code ${record.code}`],
      });
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    const updated = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json({ ok: true, pointsAwarded: record.points, user: publicUser(updated) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
