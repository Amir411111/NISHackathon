const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { listWorkers } = require("../controllers/workerController");

function buildWorkerRoutes(env) {
  const r = express.Router();

  r.get("/", requireRole("admin"), (req, res) => listWorkers(env, req, res));

  return r;
}

module.exports = { buildWorkerRoutes };
