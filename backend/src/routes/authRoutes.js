const express = require("express");
const multer = require("multer");
const { register, login } = require("../controllers/authController");

const authUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 256 * 1024 },
});

function buildAuthRoutes(env) {
  const r = express.Router();

  r.post("/register", (req, res) => register(env, req, res));
  r.post("/login", authUpload.single("digitalIdFile"), (req, res) => login(env, req, res));

  return r;
}

module.exports = { buildAuthRoutes };
