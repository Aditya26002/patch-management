import mongoose from "mongoose";

const installLogSchema = new mongoose.Schema(
  {
    hostIP: { type: String, required: true, index: true },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Host",
      required: true,
      index: true,
    },
    os: { type: String, enum: ["linux", "windows"], required: true },
    installType: {
      type: String,
      enum: ["full", "selective"],
      default: "full",
      index: true,
    }, // NEW
    timestamp: { type: Date, required: true, index: true },
    success: { type: Boolean, required: true, default: false },
    rebootRequired: { type: Boolean, required: true, default: false },
    rebootPerformed: { type: Boolean, required: true, default: false },
    installedCount: { type: Number, required: true, default: 0 },
    remainingCount: { type: Number, required: true, default: 0 },
    errors: [String],
    installationDetails: [
      {
        name: String,
        kb: String,
        category: String,
        currentVersion: String,
        newVersion: String,
        isSecurity: Boolean,
        status: { type: String, enum: ["installed", "skipped", "failed"] },
      },
    ],
    rawOutput: { stdout: String, stderr: String },
    rawLog: mongoose.Schema.Types.Mixed, // NEW: store full log blob
    logFilePath: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

// Indexes for efficient querying
installLogSchema.index({ hostIP: 1, timestamp: -1 });
installLogSchema.index({ hostId: 1, timestamp: -1 });
installLogSchema.index({ os: 1, timestamp: -1 });
installLogSchema.index({ success: 1, timestamp: -1 });
installLogSchema.index({ installType: 1, timestamp: -1 });

export const InstallLog = mongoose.model("InstallLog", installLogSchema);
