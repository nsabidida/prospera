const jwt = require("jsonwebtoken");
const db = require("../db");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.get("SELECT * FROM users WHERE id = ?", [payload.id]);
    if (!user) return res.status(401).json({ error: "Account no longer exists." });
    if (user.status !== "active")
      return res.status(403).json({ error: "This account has been suspended." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Prospera HQ access only." });
  next();
}

module.exports = { requireAuth, requireAdmin };
