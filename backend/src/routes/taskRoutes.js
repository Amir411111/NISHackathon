const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { upload } = require("../utils/upload");
const { listTasks, startTask, completeTask } = require("../controllers/taskController");

function buildTaskRoutes(env) {
  const r = express.Router();

  r.get("/", requireRole("worker"), (req, res) => listTasks(env, req, res));
  r.post("/:id/start", requireRole("worker"), (req, res) => startTask(env, req, res));
  r.post(
    "/:id/complete",
    requireRole("worker"),
    upload.fields([{ name: "after", maxCount: 3 }]),
    (req, res) => completeTask(env, req, res)
  );

  return r;
}

module.exports = { buildTaskRoutes };
