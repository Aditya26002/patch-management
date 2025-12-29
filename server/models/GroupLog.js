import mongoose from "mongoose";

const groupLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["group_created", "group_updated", "group_deleted"],
      index: true,
    },
    groupId: { type: Number, required: true, index: true },
    groupName: { type: String, required: true },
    os: { type: String, required: true },
    hostCount: { type: Number, required: true },
    performedBy: { type: String, default: "Admin", index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Create indexes for better performance
groupLogSchema.index({ timestamp: -1 });
groupLogSchema.index({ type: 1, timestamp: -1 });

const GroupLog = mongoose.model("GroupLog", groupLogSchema);

export default GroupLog;
