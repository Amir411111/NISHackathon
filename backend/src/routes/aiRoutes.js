const express = require("express");
const { assistant, analyzeWorkPhotos } = require("../controllers/aiController");

function buildAiRoutes(env) {
  const r = express.Router();

  r.post("/assistant", (req, res) => assistant(env, req, res));
  r.post("/analyze-work", (req, res) => analyzeWorkPhotos(env, req, res));

  return r;
}

module.exports = { buildAiRoutes };
