import { ScheduledTask } from "../models/ScheduledTask.js";
import { ScheduleLog } from "../models/ScheduleLog.js";
import { Host } from "../models/Host.js";
import Patch from "../models/Patch.js";

/**
 * Create a new scheduled task
 * POST /api/scheduler/schedule
 */
export async function createScheduledTask(req, res) {
  try {
    const { taskType, scheduledTime, patchIds, hostIds, osType, createdBy } =
      req.body;

    // Validation
    if (!taskType || !scheduledTime || !osType) {
      return res.status(400).json({
        success: false,
        error: "taskType, scheduledTime, and osType are required",
      });
    }

    if (taskType === "patch" && (!patchIds || patchIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "patchIds are required for patch scheduling",
      });
    }

    if (taskType === "update" && (!hostIds || hostIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "hostIds are required for update scheduling",
      });
    }

    // Validate scheduled time is in the future
    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: "Scheduled time must be in the future",
      });
    }

    // For patch scheduling: Validate all patches exist and match OS type
    if (taskType === "patch") {
      const patches = await Patch.find({ _id: { $in: patchIds } });
      if (patches.length !== patchIds.length) {
        return res.status(400).json({
          success: false,
          error: "One or more patches not found",
        });
      }

      // Check if all patches are compatible with the OS type
      const incompatiblePatches = patches.filter(
        (patch) => !patch.affectedOS.includes(osType)
      );
      if (incompatiblePatches.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Some patches are not compatible with ${osType}`,
        });
      }
    }

    // For update scheduling: Validate all hosts exist and match OS type
    if (taskType === "update") {
      const hosts = await Host.find({ _id: { $in: hostIds } });
      if (hosts.length !== hostIds.length) {
        return res.status(400).json({
          success: false,
          error: "One or more hosts not found",
        });
      }

      // Check if all hosts match the OS type
      const incompatibleHosts = hosts.filter((host) => host.osName !== osType);
      if (incompatibleHosts.length > 0) {
        return res.status(400).json({
          success: false,
          error: `All hosts must be ${osType}. Cannot mix OS types.`,
        });
      }
    }

    // Create scheduled task
    const scheduledTask = await ScheduledTask.create({
      taskType,
      scheduledTime: scheduleDate,
      patchIds: taskType === "patch" ? patchIds : [],
      hostIds: hostIds || [],
      osType,
      createdBy: createdBy || "Admin",
      status: "pending",
    });

    // Get patch/host details for logging
    let patchIdsForLog = [];
    let hostIPsForLog = [];

    if (taskType === "patch") {
      const patches = await Patch.find({ _id: { $in: patchIds } });
      patchIdsForLog = patches.map((p) => p.patchId);
    }

    if (taskType === "update") {
      const hosts = await Host.find({ _id: { $in: hostIds } });
      hostIPsForLog = hosts.map((h) => h.ip);
    }

    // Create schedule log
    await ScheduleLog.create({
      action: "schedule_created",
      taskType,
      taskId: scheduledTask._id,
      scheduledTime: scheduleDate,
      patchIds: patchIdsForLog,
      hostIPs: hostIPsForLog,
      osType,
      performedBy: createdBy || "Admin",
      message: `Scheduled ${taskType} task created for ${scheduleDate.toLocaleString()}`,
    });

    // Populate the response
    const populatedTask = await ScheduledTask.findById(scheduledTask._id)
      .populate("patchIds", "patchId name")
      .populate("hostIds", "ip osName osVersion");

    res.status(201).json({
      success: true,
      data: populatedTask,
      message: "Task scheduled successfully",
    });
  } catch (error) {
    console.error("Error creating scheduled task:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create scheduled task",
    });
  }
}

/**
 * Get all scheduled tasks with filters
 * GET /api/scheduler/tasks?status=pending&taskType=patch
 */
export async function getScheduledTasks(req, res) {
  try {
    const { status, taskType, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (taskType) filter.taskType = taskType;
    if (startDate || endDate) {
      filter.scheduledTime = {};
      if (startDate) filter.scheduledTime.$gte = new Date(startDate);
      if (endDate) filter.scheduledTime.$lte = new Date(endDate);
    }

    const tasks = await ScheduledTask.find(filter)
      .populate("patchIds", "patchId name severity category")
      .populate("hostIds", "ip osName osVersion patchCount")
      .sort({ scheduledTime: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scheduled tasks",
    });
  }
}

/**
 * Get single scheduled task by ID
 * GET /api/scheduler/tasks/:id
 */
export async function getScheduledTaskById(req, res) {
  try {
    const { id } = req.params;

    const task = await ScheduledTask.findById(id)
      .populate("patchIds", "patchId name severity category affectedOS")
      .populate("hostIds", "ip osName osVersion patchCount");

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Scheduled task not found",
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Error fetching scheduled task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scheduled task",
    });
  }
}

/**
 * Cancel a scheduled task
 * PUT /api/scheduler/tasks/:id/cancel
 */
export async function cancelScheduledTask(req, res) {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;

    const task = await ScheduledTask.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Scheduled task not found",
      });
    }

    if (task.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel task with status: ${task.status}`,
      });
    }

    task.status = "cancelled";
    await task.save();

    // Create cancellation log
    await ScheduleLog.create({
      action: "schedule_cancelled",
      taskType: task.taskType,
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      osType: task.osType,
      performedBy: cancelledBy || "Admin",
      message: `Scheduled ${task.taskType} task cancelled`,
    });

    res.status(200).json({
      success: true,
      data: task,
      message: "Task cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling scheduled task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel scheduled task",
    });
  }
}

/**
 * Delete a scheduled task
 * DELETE /api/scheduler/tasks/:id
 */
export async function deleteScheduledTask(req, res) {
  try {
    const { id } = req.params;

    const task = await ScheduledTask.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Scheduled task not found",
      });
    }

    // Only allow deletion of cancelled, completed, or failed tasks
    if (!["cancelled", "completed", "failed"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete task with status: ${task.status}. Please cancel it first.`,
      });
    }

    await ScheduledTask.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scheduled task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete scheduled task",
    });
  }
}

/**
 * Get schedule logs
 * GET /api/scheduler/logs?taskId=xxx
 */
export async function getScheduleLogs(req, res) {
  try {
    const { taskId, action, startDate, endDate } = req.query;

    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await ScheduleLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching schedule logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch schedule logs",
    });
  }
}
