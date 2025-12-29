import mongoose from "mongoose";

const patchDeleteLogSchema = new mongoose.Schema(
  {
    patchId: { type: String, required: true, index: true },
    patchName: { type: String, required: true },
    fileName: { type: String, required: true },
    affectedOS: [String],
    category: String,
    severity: String,
    performedBy: { type: String, default: "Admin", index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, default: "patch_deleted" },
  },
  { versionKey: false }
);

patchDeleteLogSchema.index({ timestamp: -1 });

export const PatchDeleteLog = mongoose.model(
  "PatchDeleteLog",
  patchDeleteLogSchema
);
