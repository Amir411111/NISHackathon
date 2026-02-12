const User = require("../models/User");

async function listWorkers(_env, _req, res) {
  const workers = await User.find({ role: "worker" }).sort({ createdAt: -1 });

  const items = workers.map((u) => ({
    id: u._id.toString(),
    name: u.email.split("@")[0] || u.email,
    contractorName: "—",
    rating: 4.5,
    email: u.email,
    digitalIdKey: u.digitalIdKey,
    createdAt: u.createdAt,
  }));

  return res.json({ items });
}

module.exports = { listWorkers };
