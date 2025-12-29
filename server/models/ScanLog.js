import mongoose from "mongoose";

const scanLogSchema = new mongoose.Schema(
  {
    hostIP: {
      type: String,
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Host",
      required: true,
      index: true,
    },
    os: {
      type: String,
      enum: ["linux", "windows"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    scanType: {
      type: String,
      enum: ["initial_scan", "post_patch_scan"],
      default: "initial_scan",
    },
    totalUpdates: {
      type: Number,
      required: true,
      default: 0,
    },
    updates: [
      {
        name: String, // Package title (Windows title or Linux package name)
        kb: String, // Windows only / NULL for Linux
        category: String, // Windows only / NULL for Linux
        currentVersion: String,
        newVersion: String,
        supportUrl: String, // Windows only
      },
    ],
    logFilePath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    versionKey: false,
  }
);

// Indexes for efficient querying
scanLogSchema.index({ hostIP: 1, timestamp: -1 });
scanLogSchema.index({ hostId: 1, timestamp: -1 });
scanLogSchema.index({ os: 1, timestamp: -1 });

export const ScanLog = mongoose.model("ScanLog", scanLogSchema);
