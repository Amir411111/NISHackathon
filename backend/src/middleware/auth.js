const jwt = require("jsonwebtoken");
const User = require("../models/User");

function authMiddleware(env) {
  return async function auth(req, res, next) {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing Authorization header" });
      }
      const token = header.slice("Bearer ".length);
      const payload = jwt.verify(token, env.JWT_SECRET);

      const user = await User.findById(payload.sub);
      if (!user) return res.status(401).json({ error: "Invalid token" });

      req.user = { id: user._id.toString(), role: user.role, points: user.points, email: user.email };
      next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

module.exports = { authMiddleware };
