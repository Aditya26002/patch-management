import mongoose from "mongoose";

const scheduleLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "schedule_created",
        "schedule_started",
        "schedule_completed",
        "schedule_failed",
        "schedule_cancelled",
      ],
      required: true,
      index: true,
    },
    taskType: {
      type: String,
      enum: ["patch", "update"],
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledTask",
      required: true,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    patchIds: [String],
    hostIPs: [String],
    osType: String,
    performedBy: {
      type: String,
      default: "Admin",
      index: true,
    },
    message: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

scheduleLogSchema.index({ timestamp: -1 });
scheduleLogSchema.index({ taskId: 1, timestamp: -1 });

export const ScheduleLog = mongoose.model("ScheduleLog", scheduleLogSchema);
