const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["citizen", "worker", "admin"] },
    points: { type: Number, required: true, default: 0 },
    ratingAvg: { type: Number, required: true, default: 5, min: 0, max: 5 },
    ratingCount: { type: Number, required: true, default: 0, min: 0 },
    // Digital ID / eGov-like key (unique per user)
    digitalIdKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("User", UserSchema);
