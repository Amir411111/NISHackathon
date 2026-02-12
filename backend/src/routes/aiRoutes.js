const express = require("express");
const { assistant } = require("../controllers/aiController");

function buildAiRoutes(env) {
  const r = express.Router();

  r.post("/assistant", (req, res) => assistant(env, req, res));

  return r;
}

module.exports = { buildAiRoutes };
