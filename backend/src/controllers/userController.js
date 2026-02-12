const bcrypt = require("bcrypt");

const Request = require("../models/Request");
const User = require("../models/User");

function displayName(user) {
  const fullName = String(user?.fullName || "").trim();
  if (fullName) return fullName;
  return String(user?.email || "").split("@")[0] || "Пользователь";
}

function isStrongPassword(password) {
  const p = String(password || "");
  return p.length >= 6 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

async function getMeProfile(_env, req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const [requestsCreated, requestsConfirmed, requestsActive, tasksCompleted, usersAhead] = await Promise.all([
    Request.countDocuments({ citizenId: user._id }),
    Request.countDocuments({ citizenId: user._id, citizenConfirmedAt: { $ne: null } }),
    Request.countDocuments({ citizenId: user._id, status: { $ne: "DONE" } }),
    Request.countDocuments({ workerId: user._id, status: "DONE" }),
    User.countDocuments({ role: user.role, points: { $gt: user.points } }),
  ]);

  const confirmedDocs = await Request.find(
    { citizenId: user._id, citizenConfirmedAt: { $ne: null } },
    { createdAt: 1, citizenConfirmedAt: 1 }
  );

  const durations = confirmedDocs
    .map((item) => {
      const from = new Date(item.createdAt).getTime();
      const to = new Date(item.citizenConfirmedAt).getTime();
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
      return to - from;
    })
    .filter((v) => typeof v === "number");

  const avgCloseMinutes = durations.length
    ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length / 60000)
    : null;

  return res.json({
    user: {
      id: user._id.toString(),
      fullName: String(user.fullName || "").trim(),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
      ratingAvg: Number.isFinite(user.ratingAvg) ? user.ratingAvg : 5,
      ratingCount: Number.isFinite(user.ratingCount) ? user.ratingCount : 0,
      createdAt: user.createdAt,
      rank: usersAhead + 1,
    },
    stats: {
      requestsCreated,
      requestsConfirmed,
      requestsActive,
      tasksCompleted,
      avgCloseMinutes,
    },
  });
}

async function updateMeProfile(_env, req, res) {
  const fullName = String(req.body?.fullName || "").trim();
  if (fullName.length < 3) return res.status(400).json({ error: "Укажите корректное ФИО" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  user.fullName = fullName;
  await user.save();

  return res.json({
    user: {
      id: user._id.toString(),
      fullName: String(user.fullName || "").trim(),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
      ratingAvg: Number.isFinite(user.ratingAvg) ? user.ratingAvg : 5,
      ratingCount: Number.isFinite(user.ratingCount) ? user.ratingCount : 0,
      createdAt: user.createdAt,
    },
  });
}

async function changeMyPassword(_env, req, res) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Текущий и новый пароль обязательны" });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: "Новый пароль должен быть не менее 6 символов и содержать буквы и цифры" });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "Новый пароль должен отличаться от текущего" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Неверный текущий пароль" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.json({ ok: true });
}

async function leaderboard(_env, req, res) {
  const allowedRoles = new Set(["citizen", "worker", "admin"]);
  const role = String(req.query?.role || "").trim().toLowerCase();
  const limitRaw = Number(req.query?.limit || 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;

  const query = allowedRoles.has(role) ? { role } : {};

  const users = await User.find(query).sort({ points: -1, createdAt: 1 }).limit(limit);

  let lastPoints = null;
  let lastRank = 0;

  const items = users.map((u, idx) => {
    const points = Number.isFinite(u.points) ? u.points : 0;
    if (lastPoints === null || points < lastPoints) {
      lastRank = idx + 1;
      lastPoints = points;
    }

    return {
      rank: lastRank,
    id: u._id.toString(),
    fullName: displayName(u),
    email: u.email,
    role: u.role,
    points,
  };
  });

  let meRank = null;
  const me = await User.findById(req.user.id);
  if (me) {
    const meQuery = allowedRoles.has(role) ? { role } : {};
    const usersAhead = await User.countDocuments({ ...meQuery, points: { $gt: me.points } });
    meRank = usersAhead + 1;
  }

  return res.json({ items, meRank });
}

module.exports = { getMeProfile, updateMeProfile, changeMyPassword, leaderboard };
