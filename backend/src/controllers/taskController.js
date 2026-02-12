const Request = require("../models/Request");
const { computeIsOverdue } = require("../utils/sla");
const { saveUploadedFilesToMongo } = require("../utils/upload");

function map(doc) {
  const cat = doc.categoryId && typeof doc.categoryId === "object" ? doc.categoryId : null;
  return {
    id: doc._id.toString(),
    categoryId: cat ? cat._id.toString() : doc.categoryId.toString(),
    categoryName: cat ? cat.name : undefined,
    description: doc.description,
    priority: doc.priority,
    location: doc.location,
    photosBefore: doc.photosBefore,
    photosAfter: doc.photosAfter,
    status: doc.status,
    statusHistory: (doc.statusHistory || []).map((h) => ({ status: h.status, at: h.at, by: h.by })),
    citizenId: doc.citizenId.toString(),
    workerId: doc.workerId ? doc.workerId.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    slaDeadline: doc.slaDeadline,
    isOverdue: doc.isOverdue,
    workStartedAt: doc.workStartedAt,
    workEndedAt: doc.workEndedAt,
    citizenConfirmedAt: doc.citizenConfirmedAt,
    reworkCount: doc.reworkCount,
  };
}

async function listTasks(_env, req, res) {
  const docs = await Request.find({ workerId: req.user.id, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } })
    .sort({ createdAt: -1 })
    .populate("categoryId");
  const now = new Date();
  for (const d of docs) {
    const overdue = computeIsOverdue(d, now);
    if (overdue !== d.isOverdue) {
      d.isOverdue = overdue;
      // eslint-disable-next-line no-await-in-loop
      await d.save();
    }
  }
  return res.json({ items: docs.map(map) });
}

async function startTask(_env, req, res) {
  const id = req.params.id;
  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (!doc.workerId || doc.workerId.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  if (doc.status === "ASSIGNED") {
    doc.status = "IN_PROGRESS";
    doc.workStartedAt = new Date();
    doc.workEndedAt = null;
    doc.statusHistory = [...(doc.statusHistory || []), { status: "IN_PROGRESS", at: new Date(), by: "worker" }];
    doc.isOverdue = computeIsOverdue(doc);
    await doc.save();
  }

  const populated = await Request.findById(id).populate("categoryId");
  return res.json({ item: map(populated) });
}

async function completeTask(_env, req, res) {
  const id = req.params.id;
  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (!doc.workerId || doc.workerId.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const afterFiles = req.files?.after;
  const afterUrls = await saveUploadedFilesToMongo(afterFiles, req);
  if (afterUrls.length === 0) return res.status(400).json({ error: "photosAfter is required" });

  doc.photosAfter = [...doc.photosAfter, ...afterUrls];
  doc.status = "DONE";
  doc.workEndedAt = new Date();
  doc.statusHistory = [...(doc.statusHistory || []), { status: "DONE", at: new Date(), by: "worker" }];
  doc.isOverdue = computeIsOverdue(doc);
  await doc.save();

  const populated = await Request.findById(id).populate("categoryId");
  return res.json({ item: map(populated) });
}

module.exports = { listTasks, startTask, completeTask };
