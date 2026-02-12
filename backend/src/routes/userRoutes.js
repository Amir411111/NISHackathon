const express = require("express");

const { requireRole } = require("../middleware/requireRole");
const { getMeProfile, updateMeProfile, changeMyPassword, leaderboard } = require("../controllers/userController");

function buildUserRoutes(env) {
  const r = express.Router();

  r.get("/me", requireRole("citizen", "worker", "admin"), (req, res) => getMeProfile(env, req, res));
  r.patch("/me", requireRole("citizen", "worker", "admin"), (req, res) => updateMeProfile(env, req, res));
  r.post("/change-password", requireRole("citizen", "worker", "admin"), (req, res) => changeMyPassword(env, req, res));
  r.get("/leaderboard", requireRole("citizen", "worker", "admin"), (req, res) => leaderboard(env, req, res));

  return r;
}

module.exports = { buildUserRoutes };
