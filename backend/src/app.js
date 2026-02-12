const path = require("path");
const express = require("express");
const cors = require("cors");

const { authMiddleware } = require("./middleware/auth");
const { requireRole } = require("./middleware/requireRole");
const { buildAuthRoutes } = require("./routes/authRoutes");
const { buildCategoryRoutes } = require("./routes/categoryRoutes");
const { buildRequestRoutes } = require("./routes/requestRoutes");
const { buildTaskRoutes } = require("./routes/taskRoutes");
const { buildAnalyticsRoutes } = require("./routes/analyticsRoutes");
const { buildWorkerRoutes } = require("./routes/workerRoutes");
const { ensureUploadDir } = require("./utils/upload");
const { ensureSystemCategories } = require("./controllers/requestController");
const { me } = require("./controllers/authController");

function createApp(env) {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));

  ensureUploadDir();
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/", (_req, res) =>
    res.json({
      ok: true,
      service: "urban-services-backend",
      health: "/health",
      auth: "/auth/login",
    })
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Auth routes: /register and /login are public.
  app.use("/auth", buildAuthRoutes(env));

  // Protected routes
  app.use(authMiddleware(env));

  app.get("/auth/me", requireRole("citizen", "worker", "admin"), (req, res) => me(env, req, res));

  app.use("/categories", buildCategoryRoutes(env));
  app.use("/requests", buildRequestRoutes(env));
  app.use("/tasks", buildTaskRoutes(env));
  app.use("/analytics", buildAnalyticsRoutes(env));
  app.use("/workers", buildWorkerRoutes(env));

  // bootstrap system categories lazily
  app.post("/admin/bootstrap", async (req, res) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    await ensureSystemCategories();
    return res.json({ ok: true });
  });

  // 404
  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}

module.exports = { createApp };
