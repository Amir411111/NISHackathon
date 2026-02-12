function getSlaMinutesForPriority(priority) {
  // Tunable SLA policy for hackathon MVP
  if (priority === "high") return 10;
  if (priority === "low") return 45;
  return 20; // medium
}

function computeSlaDeadline(priority, now = new Date()) {
  const minutes = getSlaMinutesForPriority(priority);
  return new Date(now.getTime() + minutes * 60 * 1000);
}

function computeIsOverdue(requestDoc, now = new Date()) {
  if (!requestDoc) return false;
  if (requestDoc.status !== "IN_PROGRESS") return false;
  return requestDoc.slaDeadline && requestDoc.slaDeadline.getTime() < now.getTime();
}

module.exports = { getSlaMinutesForPriority, computeSlaDeadline, computeIsOverdue };
