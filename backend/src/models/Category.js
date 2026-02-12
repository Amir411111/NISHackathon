const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isSystem: { type: Boolean, required: true, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Category", CategorySchema);
