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

function toLocalDayKey(value) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function scoreByRole(user, role) {
  if (role === "worker") {
    const ratingAvg = Number(user?.ratingAvg);
    return Number.isFinite(ratingAvg) ? ratingAvg : 0;
  }
  const points = Number(user?.points);
  return Number.isFinite(points) ? points : 0;
}

async function computeDenseRoleRank(role, user) {
  const users = await User.find({ role }, { points: 1, ratingAvg: 1 });
  const myScore = scoreByRole(user, role);
  const scores = new Set(users.map((u) => scoreByRole(u, role)));
  let ahead = 0;
  for (const score of scores) {
    if (score > myScore) ahead += 1;
  }
  return ahead + 1;
}

async function getMeProfile(_env, req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const rank = await computeDenseRoleRank(user.role, user);

  let requestsCreated = 0;
  let requestsConfirmed = 0;
  let requestsActive = 0;
  let tasksCompleted = 0;
  let avgCloseMinutes = null;
  let activity = [];

  if (user.role === "citizen") {
    const [created, confirmed, active] = await Promise.all([
      Request.countDocuments({ citizenId: user._id }),
      Request.countDocuments({ citizenId: user._id, citizenConfirmedAt: { $ne: null } }),
      Request.countDocuments({ citizenId: user._id, status: { $nin: ["DONE", "REJECTED"] } }),
    ]);
    requestsCreated = created;
    requestsConfirmed = confirmed;
    requestsActive = active;

    const days = 84;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const docs = await Request.find(
      {
        citizenId: user._id,
        $or: [
          { workEndedAt: { $ne: null } },
          { citizenConfirmedAt: { $ne: null } },
        ],
      },
      { workEndedAt: 1, citizenConfirmedAt: 1 }
    );

    const daily = new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDayKey(d);
      daily.set(key, 0);
    }

    for (const item of docs) {
      if (item.workEndedAt) {
        const key = toLocalDayKey(item.workEndedAt);
        if (daily.has(key)) daily.set(key, (daily.get(key) || 0) + 1);
      }
      if (item.citizenConfirmedAt) {
        const key = toLocalDayKey(item.citizenConfirmedAt);
        if (daily.has(key)) daily.set(key, (daily.get(key) || 0) + 1);
      }
    }

    activity = Array.from(daily.entries()).map(([date, count]) => ({ date, count }));
  }

  if (user.role === "worker") {
    const [active, completed] = await Promise.all([
      Request.countDocuments({ workerId: user._id, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
      Request.countDocuments({ workerId: user._id, status: "DONE" }),
    ]);
    requestsActive = active;
    tasksCompleted = completed;

    const doneDocs = await Request.find(
      { workerId: user._id, status: "DONE", workEndedAt: { $ne: null } },
      { createdAt: 1, workStartedAt: 1, workEndedAt: 1 }
    );

    const durations = doneDocs
      .map((item) => {
        const from = item.workStartedAt ? new Date(item.workStartedAt).getTime() : new Date(item.createdAt).getTime();
        const to = new Date(item.workEndedAt).getTime();
        if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
        return to - from;
      })
      .filter((v) => typeof v === "number");

    avgCloseMinutes = durations.length
      ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length / 60000)
      : null;
  }

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
      rank,
    },
    stats: {
      requestsCreated,
      requestsConfirmed,
      requestsActive,
      tasksCompleted,
      avgCloseMinutes,
      activity,
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

async function buildLeaderboardData(roleParam, limitParam, meUserId) {
  const allowedRoles = new Set(["citizen", "worker", "admin"]);
  const role = String(roleParam || "").trim().toLowerCase();
  const limitRaw = Number(limitParam || 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;

  const query = allowedRoles.has(role) ? { role } : {};

  const users = await User.find(query).sort({ createdAt: 1 });

  const scored = users.map((u) => {
    const points = Number.isFinite(u.points) ? u.points : 0;
    const ratingCount = Number.isFinite(u.ratingCount) ? u.ratingCount : 0;
    const ratingAvgRaw = Number(u.ratingAvg);
    const ratingAvg = Number.isFinite(ratingAvgRaw) ? ratingAvgRaw : 0;
    const sortScore = role === "worker" ? ratingAvg : points;

    return {
      user: u,
      points,
      ratingAvg,
      ratingCount,
      sortScore,
    };
  });

  scored.sort((a, b) => {
    if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
    if (role === "worker" && b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
  });

  let lastScore = null;
  let lastRank = 0;
  const ranked = scored.map((entry, idx) => {
    if (lastScore === null || entry.sortScore < lastScore) {
      lastRank = idx + 1;
      lastScore = entry.sortScore;
    }

    return {
      rank: lastRank,
      id: entry.user._id.toString(),
      fullName: displayName(entry.user),
      email: entry.user.email,
      role: entry.user.role,
      points: entry.points,
      ratingAvg: Number(entry.ratingAvg.toFixed(2)),
      ratingCount: entry.ratingCount,
    };
  });

  const items = ranked.slice(0, limit);

  let meRank = null;
  if (meUserId) {
    const found = ranked.find((item) => item.id === String(meUserId));
    meRank = found ? found.rank : null;
  }

  return { items, meRank };
}

async function leaderboard(_env, req, res) {
  const payload = await buildLeaderboardData(req.query?.role, req.query?.limit, req.user?.id);
  return res.json(payload);
}

async function publicLeaderboard(_env, req, res) {
  const payload = await buildLeaderboardData(req.query?.role, req.query?.limit, null);
  return res.json(payload);
}

module.exports = { getMeProfile, updateMeProfile, changeMyPassword, leaderboard, publicLeaderboard };
