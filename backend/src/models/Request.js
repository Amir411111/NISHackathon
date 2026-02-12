const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const RequestSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ["low", "medium", "high"], default: "medium" },

    location: { type: LocationSchema, required: true },

    photosBefore: { type: [String], required: true, default: [] },
    photosAfter: { type: [String], required: true, default: [] },

    status: {
      type: String,
      required: true,
      enum: ["ACCEPTED", "ASSIGNED", "IN_PROGRESS", "DONE"],
      default: "ACCEPTED",
    },

    statusHistory: {
      type: [
        new mongoose.Schema(
          {
            status: { type: String, required: true, enum: ["ACCEPTED", "ASSIGNED", "IN_PROGRESS", "DONE"] },
            at: { type: Date, required: true },
            by: { type: String, required: true, enum: ["citizen", "worker", "admin"] },
          },
          { _id: false }
        ),
      ],
      required: true,
      default: [],
    },

    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    slaDeadline: { type: Date, required: true },
    isOverdue: { type: Boolean, required: true, default: false },

    workStartedAt: { type: Date, default: null },
    workEndedAt: { type: Date, default: null },
    citizenConfirmedAt: { type: Date, default: null },
    citizenRating: { type: Number, default: null, min: 1, max: 5 },
    reworkCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", RequestSchema);
