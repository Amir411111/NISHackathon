const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

function createDigitalIdKey() {
  return `did_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function signToken(env, user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function register(env, req, res) {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ error: "email, password, role are required" });
  if (!/[\S]+@[\S]+\.[\S]+/.test(email)) return res.status(400).json({ error: "Invalid email" });
  if (String(password).length < 6) return res.status(400).json({ error: "Password too short" });
  if (!['citizen','worker','admin'].includes(role)) return res.status(400).json({ error: "Invalid role" });

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ error: "User already exists" });

  const passwordHash = await bcrypt.hash(String(password), 10);
  let user;
  // small retry loop to avoid rare digitalIdKey collisions
  for (let i = 0; i < 5; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      user = await User.create({
        email: String(email).toLowerCase(),
        passwordHash,
        role,
        points: 0,
        digitalIdKey: createDigitalIdKey(),
      });
      break;
    } catch (e) {
      if (e && e.code === 11000) continue;
      throw e;
    }
  }

  if (!user) return res.status(500).json({ error: "Failed to create user" });

  const token = signToken(env, user);
  return res.json({
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
    },
  });
}

async function login(env, req, res) {
  const { email, identifier, password, digitalIdKey } = req.body || {};
  const loginId = identifier ?? email ?? digitalIdKey;
  if (!loginId || !password) return res.status(400).json({ error: "identifier and password are required" });

  const raw = String(loginId).trim();
  const isEmail = /[\S]+@[\S]+\.[\S]+/.test(raw);

  const user = isEmail ? await User.findOne({ email: raw.toLowerCase() }) : await User.findOne({ digitalIdKey: raw });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // Backward-compatible: if user was created before digitalIdKey existed, generate it now.
  if (!user.digitalIdKey) {
    for (let i = 0; i < 5; i++) {
      try {
        user.digitalIdKey = createDigitalIdKey();
        // eslint-disable-next-line no-await-in-loop
        await user.save();
        break;
      } catch (e) {
        if (e && e.code === 11000) continue;
        throw e;
      }
    }
  }

  const token = signToken(env, user);
  return res.json({
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
    },
  });
}

async function me(_env, req, res) {
  // req.user comes from JWT middleware; fetch full user for points + digitalIdKey
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  if (!user.digitalIdKey) {
    for (let i = 0; i < 5; i++) {
      try {
        user.digitalIdKey = createDigitalIdKey();
        // eslint-disable-next-line no-await-in-loop
        await user.save();
        break;
      } catch (e) {
        if (e && e.code === 11000) continue;
        throw e;
      }
    }
  }
  return res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
      createdAt: user.createdAt,
    },
  });
}

module.exports = { register, login, me };
