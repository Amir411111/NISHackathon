const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { makeDigitalIdFileContent, parseDigitalIdFileContent } = require("../utils/digitalIdFile");

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

function normalizedRating(user) {
  const count = Number.isFinite(user.ratingCount) ? user.ratingCount : 0;
  const avg = Number.isFinite(user.ratingAvg) ? user.ratingAvg : 5;
  return {
    ratingCount: count,
    ratingAvg: count > 0 ? avg : 5,
  };
}

function normalizedFullName(user) {
  return String(user?.fullName || "").trim();
}

function isStrongPassword(password) {
  const p = String(password || "");
  return p.length >= 6 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

async function register(env, req, res) {
  const { fullName, email, password, role, digitalFilePassword } = req.body || {};
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: "ФИО, email, пароль и роль обязательны" });
  }
  if (String(fullName).trim().length < 3) return res.status(400).json({ error: "Укажите корректное ФИО" });
  if (!/[\S]+@[\S]+\.[\S]+/.test(email)) return res.status(400).json({ error: "Некорректный email" });
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Пароль должен быть не менее 6 символов и содержать буквы и цифры" });
  }
  if (!['citizen','worker','admin'].includes(role)) return res.status(400).json({ error: "Некорректная роль" });

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ error: "Пользователь с таким email уже существует" });

  const passwordHash = await bcrypt.hash(String(password), 10);
  let user;
  // small retry loop to avoid rare digitalIdKey collisions
  for (let i = 0; i < 5; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      user = await User.create({
        fullName: String(fullName).trim(),
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

  if (!user) return res.status(500).json({ error: "Не удалось создать пользователя" });

  const filePassword = String(digitalFilePassword || password);
  const digitalFileContent = makeDigitalIdFileContent(user.digitalIdKey, filePassword);
  const filename = `digital-id-${user._id.toString()}.eqid`;

  const token = signToken(env, user);
  const rating = normalizedRating(user);
  return res.json({
    token,
    user: {
      id: user._id.toString(),
      fullName: normalizedFullName(user),
      email: user.email,
      role: user.role,
      points: user.points,
      ratingAvg: rating.ratingAvg,
      ratingCount: rating.ratingCount,
    },
    digitalIdFile: {
      filename,
      mimeType: "application/json",
      base64: Buffer.from(digitalFileContent, "utf8").toString("base64"),
    },
  });
}

async function login(env, req, res) {
  const { email, identifier, password, digitalFilePassword } = req.body || {};

  let user;

  if (req.file) {
    const filePassword = String(password || digitalFilePassword || "");
    if (!filePassword) return res.status(400).json({ error: "Введите пароль" });
    let parsed;
    try {
      parsed = parseDigitalIdFileContent(req.file.buffer.toString("utf8"), filePassword);
    } catch {
      return res.status(401).json({ error: "Неверный файл Digital ID или пароль" });
    }
    user = await User.findOne({ digitalIdKey: parsed.digitalIdKey });
    if (!user) return res.status(404).json({ error: "Пользователь из Digital ID файла не найден" });
  } else {
    const loginId = identifier ?? email;
    if (!loginId || !password) return res.status(400).json({ error: "Введите email и пароль" });

    const raw = String(loginId).trim();
    const isEmail = /[\S]+@[\S]+\.[\S]+/.test(raw);
    if (!isEmail) return res.status(400).json({ error: "Введите корректный email" });

    user = await User.findOne({ email: raw.toLowerCase() });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Неверный пароль" });
  }

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
  const rating = normalizedRating(user);
  return res.json({
    token,
    user: {
      id: user._id.toString(),
      fullName: normalizedFullName(user),
      email: user.email,
      role: user.role,
      points: user.points,
      ratingAvg: rating.ratingAvg,
      ratingCount: rating.ratingCount,
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
  const rating = normalizedRating(user);
  return res.json({
    user: {
      id: user._id.toString(),
      fullName: normalizedFullName(user),
      email: user.email,
      role: user.role,
      points: user.points,
      digitalIdKey: user.digitalIdKey,
      ratingAvg: rating.ratingAvg,
      ratingCount: rating.ratingCount,
      createdAt: user.createdAt,
    },
  });
}

module.exports = { register, login, me };
