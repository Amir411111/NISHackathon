const User = require("../models/User");

async function listWorkers(_env, _req, res) {
  const query = _req.user?.role === "worker" ? { role: "worker", _id: _req.user.id } : { role: "worker" };
  const workers = await User.find(query).sort({ createdAt: -1 });

  const items = workers.map((u) => ({
    ratingCount: Number.isFinite(u.ratingCount) ? u.ratingCount : 0,
    rating: (Number.isFinite(u.ratingCount) ? u.ratingCount : 0) > 0
      ? (Number.isFinite(u.ratingAvg) ? u.ratingAvg : 5)
      : 5,
    id: u._id.toString(),
    name: String(u.fullName || "").trim() || u.email.split("@")[0] || u.email,
    contractorName: "—",
    email: u.email,
    digitalIdKey: u.digitalIdKey,
    createdAt: u.createdAt,
  }));

  return res.json({ items });
}

module.exports = { listWorkers };
