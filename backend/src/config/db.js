const mongoose = require("mongoose");

async function connectDb(mongoUri) {
  // IMPORTANT: connect strictly via mongoose.connect(process.env.MONGODB_URI)
  try {
    await mongoose.connect(mongoUri);
    return;
  } catch (error) {
    const canFallback =
      typeof mongoUri === "string" &&
      mongoUri.startsWith("mongodb+srv://") &&
      error?.code === "ECONNREFUSED" &&
      error?.syscall === "querySrv";

    const directUri = process.env.MONGODB_URI_DIRECT;
    if (!canFallback || !directUri) throw error;

    await mongoose.connect(directUri);
  }
}

module.exports = { connectDb };
