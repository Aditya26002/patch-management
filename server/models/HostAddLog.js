import mongoose from "mongoose";

const hostAddLogSchema = new mongoose.Schema(
  {
    hostIP: { type: String, required: true, index: true },
    osName: { type: String, required: true },
    osVersion: { type: String, required: true },
    loginId: { type: String, required: true },
    performedBy: { type: String, default: "Admin", index: true },
    scanResult: mongoose.Schema.Types.Mixed, // optional: patchCount/output
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

hostAddLogSchema.index({ timestamp: -1 });

export const HostAddLog = mongoose.model("HostAddLog", hostAddLogSchema);
