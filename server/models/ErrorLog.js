import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    operation: {
      type: String,
      enum: [
        "add_host",
        "delete_host",
        "upload_patch",
        "deploy_patch",
        "bulk_deploy_patch",
        "refresh_scan",
        "patch_host",
        "bulk_patch",
        "selective_install",
        "scan_host",
        "other",
      ],
      default: "other",
      index: true,
    },
    hostIP: { type: String },
    patchId: { type: String },
    performedBy: { type: String, default: "Admin", index: true },
    statusCode: { type: Number },
    errorMessage: { type: String, required: true },
    errorStack: { type: String },
    stdout: { type: String },
    stderr: { type: String },
    requestData: mongoose.Schema.Types.Mixed, // sanitize before logging
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

errorLogSchema.index({ timestamp: -1 });
errorLogSchema.index({ hostIP: 1, timestamp: -1 });
errorLogSchema.index({ patchId: 1, timestamp: -1 });

export const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);
