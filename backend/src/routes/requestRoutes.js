const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const {
  createCitizenRequest,
  listMyRequests,
  citizenConfirm,
  citizenReject,
  adminListAll,
  adminAssign,
} = require("../controllers/requestController");
const { upload } = require("../utils/upload");

function buildRequestRoutes(env) {
  const r = express.Router();

  // Citizen
  r.post(
    "/",
    requireRole("citizen"),
    upload.fields([{ name: "before", maxCount: 3 }]),
    (req, res) => createCitizenRequest(env, req, res)
  );
  r.get("/my", requireRole("citizen"), (req, res) => listMyRequests(env, req, res));
  r.post("/:id/confirm", requireRole("citizen"), (req, res) => citizenConfirm(env, req, res));
  r.post("/:id/reject", requireRole("citizen"), (req, res) => citizenReject(env, req, res));

  // Admin
  r.get("/", requireRole("admin"), (req, res) => adminListAll(env, req, res));
  r.post("/:id/assign", requireRole("admin"), (req, res) => adminAssign(env, req, res));

  return r;
}

module.exports = { buildRequestRoutes };
