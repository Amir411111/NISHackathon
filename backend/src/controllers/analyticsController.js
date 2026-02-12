const Request = require("../models/Request");

async function summary(_env, _req, res) {
  const all = await Request.find({});

  const total = all.length;
  const byStatus = all.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const overdue = all.filter((r) => r.isOverdue).length;

  const confirmed = all.filter((r) => r.citizenConfirmedAt);
  const avgCloseMinutes = confirmed.length
    ? Math.round(
        confirmed.reduce((sum, r) => sum + (new Date(r.citizenConfirmedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          confirmed.length /
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
