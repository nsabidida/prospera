require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const db = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const contentRoutes = require("./routes/content");

async function main() {
  await db.migrate();

  const app = express();

  // If CLIENT_ORIGIN is set (two-service deploy), restrict to it.
  // Otherwise allow any origin — safe here because auth uses a Bearer
  // token (not cookies), so there's no CSRF exposure from permissive CORS.
  app.use(
    cors(
      process.env.CLIENT_ORIGIN
        ? { origin: process.env.CLIENT_ORIGIN }
        : { origin: true }
    )
  );
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "prospera-api" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/content", contentRoutes);

  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

  // ---- Serve the built frontend from this same service (single-service
  // deploy: no separate static site, no CORS headaches, no extra host). ----
  const clientDist = path.join(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    app.get("*", (req, res) => {
      res
        .status(200)
        .send(
          "Prospera API is running. Build the frontend (cd client && npm run build) to serve the app from here, or run the client dev server separately."
        );
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on our end." });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`[prospera] API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[prospera] Failed to start:", err);
  process.exit(1);
});
