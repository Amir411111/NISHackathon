const Request = require("../models/Request");

async function summary(_env, _req, res) {
  const all = await Request.find({});

  const total = all.length;
  const byStatus = all.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const overdue = all.filter((r) => r.isOverdue).length;

  const closed = all
    .map((r) => {
      const closeAt = r.workEndedAt || r.citizenConfirmedAt;
      if (!closeAt) return null;
      const created = new Date(r.createdAt).getTime();
      const ended = new Date(closeAt).getTime();
      if (!Number.isFinite(created) || !Number.isFinite(ended) || ended < created) return null;
      return ended - created;
    })
    .filter((v) => typeof v === "number");

  const avgCloseMinutes = closed.length
    ? Math.round(
        closed.reduce((sum, ms) => sum + ms, 0) /
          closed.length /
          60000
      )
    : null;

  return res.json({
    total,
    overdue,
    byStatus,
    avgCloseMinutes,
  });
}

module.exports = { summary };
