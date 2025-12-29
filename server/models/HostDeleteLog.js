import mongoose from "mongoose";

const hostDeleteLogSchema = new mongoose.Schema(
  {
    hostIP: { type: String, required: true, index: true },
    osName: { type: String, required: true },
    osVersion: { type: String, required: true },
    performedBy: { type: String, default: "Admin", index: true },
    patchCountAtDeletion: { type: Number, default: 0 },
    installedPatchesAtDeletion: [String],
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

hostDeleteLogSchema.index({ timestamp: -1 });

export const HostDeleteLog = mongoose.model(
  "HostDeleteLog",
  hostDeleteLogSchema
);
