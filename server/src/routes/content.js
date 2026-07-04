const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const rows = await db.all("SELECT key, value FROM content");
    const content = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
