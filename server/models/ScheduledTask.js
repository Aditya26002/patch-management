import mongoose from "mongoose";

const scheduledTaskSchema = new mongoose.Schema(
  {
    taskType: {
      type: String,
      enum: ["patch", "update"],
      required: true,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    // For patch deployment
    patchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patch",
      },
    ],
    // For host updates
    hostIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Host",
      },
    ],
    osType: {
      type: String,
      enum: ["Windows", "Linux"],
      required: true,
    },
    createdBy: {
      type: String,
      default: "Admin",
    },
    executedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    results: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for efficient querying
scheduledTaskSchema.index({ status: 1, scheduledTime: 1 });
scheduledTaskSchema.index({ taskType: 1, status: 1 });
scheduledTaskSchema.index({ createdAt: -1 });

export const ScheduledTask = mongoose.model("ScheduledTask", scheduledTaskSchema);
