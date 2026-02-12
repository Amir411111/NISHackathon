const Category = require("../models/Category");

async function listCategories(_env, _req, res) {
  const cats = await Category.find({}).sort({ isSystem: -1, name: 1 });
  return res.json({ items: cats.map((c) => ({ id: c._id.toString(), name: c.name, isSystem: c.isSystem, createdBy: c.createdBy ? c.createdBy.toString() : null })) });
}

async function createCategory(_env, req, res) {
  const { name } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: "name is required" });

  const trimmed = String(name).trim();

  const existing = await Category.findOne({ name: trimmed });
  if (existing) return res.status(409).json({ error: "Category already exists" });

  const cat = await Category.create({ name: trimmed, createdBy: req.user.id, isSystem: false });
  return res.status(201).json({ id: cat._id.toString(), name: cat.name, isSystem: cat.isSystem, createdBy: cat.createdBy.toString() });
}

module.exports = { listCategories, createCategory };
