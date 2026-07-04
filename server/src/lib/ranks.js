const db = require("../db");

async function getAllRanks() {
  return db.all("SELECT * FROM ranks ORDER BY sort_order ASC");
}

async function getRankForPoints(points) {
  const ranks = await getAllRanks();
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

module.exports = { getAllRanks, getRankForPoints };
