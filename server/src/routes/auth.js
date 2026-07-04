const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { publicUser } = require("../lib/sanitize");
const { getRankForPoints } = require("../lib/ranks");

const router = express.Router();

async function getSetting(key, fallback) {
  const row = await db.get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : fallback;
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function makeReferralCode() {
  let code;
  let exists = true;
  while (exists) {
    code = nanoid(7).toUpperCase();
    const row = await db.get("SELECT 1 FROM users WHERE referral_code = ?", [code]);
    exists = !!row;
  }
  return code;
}

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body || {};

    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ error: "A valid email is required." });
    if (!password || password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters." });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.get("SELECT 1 FROM users WHERE email = ?", [normalizedEmail]);
    if (existing) return res.status(409).json({ error: "An account with that email already exists." });

    let referrer = null;
    if (referralCode) {
      referrer = await db.get("SELECT * FROM users WHERE referral_code = ?", [
        referralCode.trim().toUpperCase(),
      ]);
      if (!referrer) return res.status(400).json({ error: "That referral code was not found." });
    }

    const hash = bcrypt.hashSync(password, 10);
    const myReferralCode = await makeReferralCode();
    const signupPoints = parseInt(await getSetting("signup_points", "50"), 10) || 0;
    const referralPoints = parseInt(await getSetting("referral_points", "100"), 10) || 0;

    const tx = await db.client.transaction("write");
    let newUserId;
    try {
      const insertResult = await tx.execute({
        sql: `INSERT INTO users (name, email, password_hash, referral_code, referred_by, points)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [name.trim(), normalizedEmail, hash, myReferralCode, referrer ? referrer.id : null, signupPoints],
      });
      newUserId = Number(insertResult.lastInsertRowid);

      await tx.execute({
        sql: "INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'signup', ?, 'Welcome bonus for joining Prospera')",
        args: [newUserId, signupPoints],
      });

      if (referrer) {
        await tx.execute({
          sql: "UPDATE users SET points = points + ? WHERE id = ?",
          args: [referralPoints, referrer.id],
        });
        await tx.execute({
          sql: "INSERT INTO transactions (user_id, type, points, note) VALUES (?, 'referral', ?, ?)",
          args: [referrer.id, referralPoints, `${name.trim()} joined your Prospera network`],
        });
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    const user = await db.get("SELECT * FROM users WHERE id = ?", [newUserId]);
    const token = signToken(user);
    const rank = await getRankForPoints(user.points);
    res.status(201).json({ token, user: publicUser(user), rank });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await db.get("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
    if (!user) return res.status(401).json({ error: "Incorrect email or password." });
    if (user.status !== "active")
      return res.status(403).json({ error: "This account has been suspended." });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

    const token = signToken(user);
    const rank = await getRankForPoints(user.points);
    res.json({ token, user: publicUser(user), rank });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const rank = await getRankForPoints(req.user.points);
    res.json({ user: publicUser(req.user), rank });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
