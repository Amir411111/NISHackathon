const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const safeOriginal = (file.originalname || "file").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const ext = path.extname(safeOriginal) || ".jpg";
    const base = path.basename(safeOriginal, ext);
    const name = `${base}_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

function fileUrlFromFilename(filename, req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/uploads/${encodeURIComponent(filename)}`;
}

module.exports = { upload, ensureUploadDir, fileUrlFromFilename, UPLOAD_DIR };
