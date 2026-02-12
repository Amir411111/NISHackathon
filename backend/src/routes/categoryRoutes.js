const express = require("express");
const { listCategories, createCategory } = require("../controllers/categoryController");
const { requireRole } = require("../middleware/requireRole");

function buildCategoryRoutes(env) {
  const r = express.Router();

  r.get("/", (req, res) => listCategories(env, req, res));
  r.post("/", requireRole("citizen", "admin"), (req, res) => createCategory(env, req, res));

  return r;
}

module.exports = { buildCategoryRoutes };
