const multer = require("multer");
const mongoose = require("mongoose");
const { Readable } = require("stream");

const GRIDFS_BUCKET = "uploads";

function getUploadsBucket() {
  const db = mongoose.connection?.db;
  if (!db) throw new Error("MongoDB is not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

function fileUrlFromFilename(filename, req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/uploads/${encodeURIComponent(String(filename))}`;
}

function uploadBufferToGridFs(file) {
  return new Promise((resolve, reject) => {
    const bucket = getUploadsBucket();
    const safeOriginal = String(file.originalname || "file").replace(/[^a-zA-Z0-9_.-]/g, "_");

    const uploadStream = bucket.openUploadStream(safeOriginal, {
      contentType: file.mimetype || "application/octet-stream",
      metadata: {
        originalName: file.originalname || safeOriginal,
      },
    });

    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve(uploadStream.id));
  });
}

async function saveUploadedFilesToMongo(files, req) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const ids = await Promise.all(files.map((f) => uploadBufferToGridFs(f)));
  return ids.map((id) => fileUrlFromFilename(id, req));
}

function streamUploadFromMongo(fileId, res) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const bucket = getUploadsBucket();
  const _id = new mongoose.Types.ObjectId(fileId);
  const filesCollection = mongoose.connection.db.collection(`${GRIDFS_BUCKET}.files`);

  filesCollection.findOne({ _id })
    .then((fileDoc) => {
      if (!fileDoc) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (fileDoc.contentType) res.setHeader("Content-Type", fileDoc.contentType);
      const stream = bucket.openDownloadStream(_id);
      stream.on("error", () => {
        if (!res.headersSent) return res.status(404).json({ error: "Not found" });
        return res.end();
      });
      stream.pipe(res);
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to fetch file" });
    });
}

module.exports = {
  upload,
  fileUrlFromFilename,
  saveUploadedFilesToMongo,
  streamUploadFromMongo,
};
