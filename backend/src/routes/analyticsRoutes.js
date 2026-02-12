const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { summary } = require("../controllers/analyticsController");

function buildAnalyticsRoutes(env) {
  const r = express.Router();

  r.get("/summary", requireRole("admin"), (req, res) => summary(env, req, res));

  return r;
}

module.exports = { buildAnalyticsRoutes };
