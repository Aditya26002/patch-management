import mongoose from "mongoose";

const selectiveInstallLogSchema = new mongoose.Schema(
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
      enum: ["selective"],
      default: "selective",
      index: true,
    },
    timestamp: { type: Date, required: true, index: true },
    success: { type: Boolean, required: true, default: true },
    rebootRequired: { type: Boolean, required: true, default: false },
    selection: mongoose.Schema.Types.Mixed,
    install: mongoose.Schema.Types.Mixed,
    summary: mongoose.Schema.Types.Mixed,
    rawLog: mongoose.Schema.Types.Mixed, // full JSON as-is
    logFilePath: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

selectiveInstallLogSchema.index({ hostIP: 1, timestamp: -1 });
selectiveInstallLogSchema.index({ hostId: 1, timestamp: -1 });
selectiveInstallLogSchema.index({ os: 1, timestamp: -1 });

export const SelectiveInstallLog = mongoose.model(
  "SelectiveInstallLog",
  selectiveInstallLogSchema
);
