const crypto = require("crypto");

const FILE_VERSION = 1;
const FILE_PURPOSE = "eqala-digital-id";

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256");
}

function toB64(buf) {
  return Buffer.from(buf).toString("base64");
}

function fromB64(s) {
  return Buffer.from(String(s), "base64");
}

function makeDigitalIdFileContent(digitalIdKey, password) {
  if (!digitalIdKey) throw new Error("digitalIdKey is required");
  if (!password || String(password).length < 6) throw new Error("digitalFilePassword too short");

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);

  const payload = JSON.stringify({
    v: FILE_VERSION,
    purpose: FILE_PURPOSE,
    digitalIdKey,
    issuedAt: new Date().toISOString(),
  });

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: FILE_VERSION,
    alg: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iter: 120000,
    salt: toB64(salt),
    iv: toB64(iv),
    tag: toB64(tag),
    data: toB64(encrypted),
  });
}

function parseDigitalIdFileContent(fileText, password) {
  if (!fileText) throw new Error("Empty Digital ID file");
  if (!password || String(password).length < 1) throw new Error("digitalFilePassword is required");

  const parsed = JSON.parse(String(fileText));
  const salt = fromB64(parsed.salt);
  const iv = fromB64(parsed.iv);
  const tag = fromB64(parsed.tag);
  const data = fromB64(parsed.data);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  const payload = JSON.parse(decrypted);

  if (payload?.purpose !== FILE_PURPOSE) throw new Error("Invalid Digital ID file");
  if (!payload?.digitalIdKey) throw new Error("Digital ID key is missing");

  return { digitalIdKey: String(payload.digitalIdKey) };
}

module.exports = { makeDigitalIdFileContent, parseDigitalIdFileContent };