const mongoose = require("mongoose");

async function connectDb(mongoUri) {
  // IMPORTANT: connect strictly via mongoose.connect(process.env.MONGODB_URI)
  await mongoose.connect(mongoUri);
}

module.exports = { connectDb };
