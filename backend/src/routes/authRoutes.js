const express = require("express");
const { register, login } = require("../controllers/authController");

function buildAuthRoutes(env) {
  const r = express.Router();

  r.post("/register", (req, res) => register(env, req, res));
  r.post("/login", (req, res) => login(env, req, res));

  return r;
}

module.exports = { buildAuthRoutes };
