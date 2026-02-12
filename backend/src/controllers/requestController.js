const Category = require("../models/Category");
const Request = require("../models/Request");
const User = require("../models/User");
const { computeIsOverdue, computeSlaDeadline } = require("../utils/sla");
const { saveUploadedFilesToMongo } = require("../utils/upload");

async function ensureSystemCategories() {
  const names = ["Свет", "Мусор", "Дорога"];
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Category.findOne({ name });
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await Category.create({ name, createdBy: null, isSystem: true });
    }
  }
}

async function resolveCategoryId(categoryName) {
  const name = String(categoryName || "").trim();
  if (!name) throw new Error("Missing category");
  const cat = await Category.findOne({ name });
  if (!cat) throw new Error("Unknown category");
  return cat._id;
}

function mapRequestDoc(doc) {
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
    citizenRating: doc.citizenRating,
    adminRejectedAt: doc.adminRejectedAt,
    adminPenaltyPoints: doc.adminPenaltyPoints,
    reworkCount: doc.reworkCount,
  };
}

async function createCitizenRequest(env, req, res) {
  await ensureSystemCategories();

  const { category, description, priority, lat, lng } = req.body || {};
  if (!description || String(description).trim().length < 4) return res.status(400).json({ error: "description is required" });

  const p = (priority || "medium").toLowerCase();
  if (!['low','medium','high'].includes(p)) return res.status(400).json({ error: "invalid priority" });

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return res.status(400).json({ error: "lat/lng are required" });

  const beforeFiles = req.files?.before;
  const beforeUrls = await saveUploadedFilesToMongo(beforeFiles, req);

  const categoryId = await resolveCategoryId(category);

  const now = new Date();
  const slaDeadline = computeSlaDeadline(p, now);

  const doc = await Request.create({
    categoryId,
    description: String(description).trim(),
    priority: p,
    location: { lat: latNum, lng: lngNum },
    photosBefore: beforeUrls,
    photosAfter: [],
    status: "ACCEPTED",
    statusHistory: [{ status: "ACCEPTED", at: now, by: "admin" }],
    citizenId: req.user.id,
    workerId: null,
    slaDeadline,
    isOverdue: false,
  });

  const populated = await Request.findById(doc._id).populate("categoryId");
  return res.status(201).json({ item: mapRequestDoc(populated) });
}

async function listMyRequests(_env, req, res) {
  const docs = await Request.find({ citizenId: req.user.id }).sort({ createdAt: -1 }).populate("categoryId");

  let changed = false;
  const now = new Date();
  for (const d of docs) {
    const overdue = computeIsOverdue(d, now);
    if (overdue !== d.isOverdue) {
      d.isOverdue = overdue;
      // eslint-disable-next-line no-await-in-loop
      await d.save();
      changed = true;
    }
  }

  const items = docs.map(mapRequestDoc);
  return res.json({ items, changed });
}

async function citizenConfirm(_env, req, res) {
  const id = req.params.id;
  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.citizenId.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (doc.status !== "DONE") return res.status(400).json({ error: "Request is not DONE" });

  const rawRating = req.body?.rating;
  const rating = Number(rawRating);

  if (!doc.citizenConfirmedAt) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating is required (1..5)" });
    }
    if (!doc.workerId) {
      return res.status(400).json({ error: "Worker is not assigned" });
    }

    doc.citizenConfirmedAt = new Date();
    doc.citizenRating = rating;
    await doc.save();

    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });

    const worker = await User.findById(doc.workerId);
    if (worker) {
      const currentCount = Number.isFinite(worker.ratingCount) ? worker.ratingCount : 0;
      const currentAvg = currentCount > 0 ? (Number.isFinite(worker.ratingAvg) ? worker.ratingAvg : 5) : 5;
      const nextCount = currentCount + 1;
      const nextAvg = ((currentAvg * currentCount) + rating) / nextCount;
      worker.ratingCount = nextCount;
      worker.ratingAvg = Number(nextAvg.toFixed(2));
      await worker.save();
    }
  }

  const updated = await Request.findById(id).populate("categoryId");
  return res.json({ item: mapRequestDoc(updated) });
}

async function citizenReject(_env, req, res) {
  const id = req.params.id;
  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.citizenId.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (doc.status !== "DONE") return res.status(400).json({ error: "Request is not DONE" });

  doc.status = "IN_PROGRESS";
  doc.statusHistory = [...(doc.statusHistory || []), { status: "IN_PROGRESS", at: new Date(), by: "citizen" }];
  doc.workEndedAt = null;
  doc.citizenConfirmedAt = null;
  doc.reworkCount += 1;
  await doc.save();

  const populated = await Request.findById(id).populate("categoryId");
  return res.json({ item: mapRequestDoc(populated) });
}

async function adminListAll(_env, req, res) {
  const docs = await Request.find({}).sort({ createdAt: -1 }).populate("categoryId");
  const now = new Date();
  for (const d of docs) {
    const overdue = computeIsOverdue(d, now);
    if (overdue !== d.isOverdue) {
      d.isOverdue = overdue;
      // eslint-disable-next-line no-await-in-loop
      await d.save();
    }
  }
  return res.json({ items: docs.map(mapRequestDoc) });
}

async function adminAssign(_env, req, res) {
  const id = req.params.id;
  const { workerId } = req.body || {};
  if (!workerId) return res.status(400).json({ error: "workerId is required" });

  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.status === "DONE" || doc.status === "REJECTED") {
    return res.status(400).json({ error: "Closed request cannot be assigned" });
  }

  doc.workerId = workerId;
  doc.status = "ASSIGNED";
  doc.statusHistory = [...(doc.statusHistory || []), { status: "ASSIGNED", at: new Date(), by: "admin" }];
  await doc.save();

  const populated = await Request.findById(id).populate("categoryId");
  return res.json({ item: mapRequestDoc(populated) });
}

async function adminReject(_env, req, res) {
  const id = req.params.id;
  const penaltyRaw = req.body?.penaltyPoints;
  const penaltyPoints = Number(penaltyRaw);

  if (!Number.isInteger(penaltyPoints) || penaltyPoints < 0 || penaltyPoints > 100) {
    return res.status(400).json({ error: "penaltyPoints must be integer in range 0..100" });
  }

  const doc = await Request.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.status === "DONE" || doc.status === "REJECTED") {
    return res.status(400).json({ error: "Closed request cannot be rejected" });
  }

  const now = new Date();
  doc.status = "REJECTED";
  doc.workerId = null;
  doc.workStartedAt = null;
  doc.workEndedAt = null;
  doc.adminRejectedAt = now;
  doc.adminPenaltyPoints = penaltyPoints;
  doc.statusHistory = [...(doc.statusHistory || []), { status: "REJECTED", at: now, by: "admin" }];
  await doc.save();

  const citizen = await User.findById(doc.citizenId);
  if (citizen) {
    const currentPoints = Number.isFinite(citizen.points) ? citizen.points : 0;
    citizen.points = Math.max(0, currentPoints - penaltyPoints);
    await citizen.save();
  }

  const populated = await Request.findById(id).populate("categoryId");
  return res.json({ item: mapRequestDoc(populated) });
}

module.exports = {
  createCitizenRequest,
  listMyRequests,
  citizenConfirm,
  citizenReject,
  adminListAll,
  adminAssign,
  adminReject,
  ensureSystemCategories,
};
