import mongoose from "mongoose";

const patchAddLogSchema = new mongoose.Schema(
  {
    patchId: { type: String, required: true, index: true },
    patchName: { type: String, required: true },
    fileName: { type: String, required: true },
    affectedOS: [String],
    category: String,
    severity: String,
    size: String,
    performedBy: { type: String, default: "Admin", index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, default: "patch_added" },
  },
  { versionKey: false }
);

patchAddLogSchema.index({ timestamp: -1 });

export const PatchAddLog = mongoose.model("PatchAddLog", patchAddLogSchema);
