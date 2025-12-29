import mongoose from "mongoose";

const selectiveApplicationInstallLogSchema = new mongoose.Schema({
  patchId: {
    type: String,
    required: true,
  },
  patchName: {
    type: String,
    required: true,
  },
  hostIPs: {
    type: [String],
    required: true,
  },
  results: [
    {
      hostIP: String,
      success: Boolean,
      message: String,
      error: String,
      timestamp: Date,
    },
  ],
  successCount: {
    type: Number,
    default: 0,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("SelectiveApplicationInstallLog", selectiveApplicationInstallLogSchema);