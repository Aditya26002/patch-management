import cron from "node-cron";
import { ScheduledTask } from "../models/ScheduledTask.js";
import { ScheduleLog } from "../models/ScheduleLog.js";
import { Host } from "../models/Host.js";
import Patch from "../models/Patch.js";
import {
  deployPatchToHosts,
  patchLinuxHostSelective,
  patchWindowsHostSelective,
} from "./ansibleScanner.js";
import {
  processSelectiveInstallLog,
  processSelectiveApplicationInstallLog,
} from "./logReader.js";

/**
 * Execute a scheduled patch deployment task
 */
async function executePatchTask(task) {
  console.log(`[Scheduler] Executing patch task ${task._id}`);

  try {
    // Update task status to running
    task.status = "running";
    task.executedAt = new Date();
    await task.save();

    // Log execution start
    await ScheduleLog.create({
      action: "schedule_started",
      taskType: "patch",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Started executing scheduled patch deployment`,
    });

    // Get patches and hosts
    const patches = await Patch.find({ _id: { $in: task.patchIds } });
    const hosts = await Host.find({
      osName: task.osType,
      availablePatches: { $in: patches.map((p) => p.patchId) },
    });

    if (hosts.length === 0) {
      throw new Error("No compatible hosts found for patch deployment");
    }

    // Deploy patches using the deployPatchToHosts function
    const hostIPs = hosts.map((h) => h.ip);
    const patchIds = patches.map((p) => p.patchId);

    console.log(
      `[Scheduler] Deploying patches ${patchIds.join(", ")} to hosts ${hostIPs.join(", ")}`
    );

    // Call the deployment function
    const result = await deployPatchToHosts(
      hostIPs,
      patchIds,
      task.osType.toLowerCase()
    );

    // Process logs
    for (const hostIP of hostIPs) {
      try {
        await processSelectiveApplicationInstallLog(hostIP, task.osType.toLowerCase());
      } catch (logError) {
        console.error(`[Scheduler] Error processing log for ${hostIP}:`, logError);
      }
    }

    // Update task status to completed
    task.status = "completed";
    task.completedAt = new Date();
    task.results = {
      deployedPatches: patchIds,
      targetHosts: hostIPs,
      success: result.success || true,
    };
    await task.save();

    // Log completion
    await ScheduleLog.create({
      action: "schedule_completed",
      taskType: "patch",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      patchIds: patchIds,
      hostIPs: hostIPs,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Successfully deployed ${patchIds.length} patches to ${hostIPs.length} hosts`,
    });

    console.log(`[Scheduler] Patch task ${task._id} completed successfully`);
  } catch (error) {
    console.error(`[Scheduler] Error executing patch task ${task._id}:`, error);

    // Update task status to failed
    task.status = "failed";
    task.completedAt = new Date();
    task.error = error.message;
    await task.save();

    // Log failure
    await ScheduleLog.create({
      action: "schedule_failed",
      taskType: "patch",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Failed to execute scheduled patch deployment`,
      error: error.message,
    });
  }
}

/**
 * Execute a scheduled host update task
 */
async function executeUpdateTask(task) {
  console.log(`[Scheduler] Executing update task ${task._id}`);

  try {
    // Update task status to running
    task.status = "running";
    task.executedAt = new Date();
    await task.save();

    // Log execution start
    await ScheduleLog.create({
      action: "schedule_started",
      taskType: "update",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Started executing scheduled host updates`,
    });

    // Get hosts
    const hosts = await Host.find({ _id: { $in: task.hostIds } });
    const hostIPs = hosts.map((h) => h.ip);

    console.log(
      `[Scheduler] Updating hosts ${hostIPs.join(", ")} (${task.osType})`
    );

    const results = [];

    // Execute selective patching for each host
    for (const host of hosts) {
      try {
        let patchResult;

        if (task.osType === "Linux") {
          patchResult = await patchLinuxHostSelective(host.ip);
        } else if (task.osType === "Windows") {
          patchResult = await patchWindowsHostSelective(host.ip);
        }

        // Process the install log
        await processSelectiveInstallLog(host.ip, task.osType.toLowerCase());

        results.push({
          hostIP: host.ip,
          success: true,
          message: "Updates applied successfully",
        });
      } catch (error) {
        console.error(
          `[Scheduler] Error updating host ${host.ip}:`,
          error
        );
        results.push({
          hostIP: host.ip,
          success: false,
          error: error.message,
        });
      }
    }

    // Check if any updates succeeded
    const successCount = results.filter((r) => r.success).length;
    const isSuccess = successCount > 0;

    // Update task status
    task.status = isSuccess ? "completed" : "failed";
    task.completedAt = new Date();
    task.results = {
      totalHosts: hosts.length,
      successfulHosts: successCount,
      failedHosts: hosts.length - successCount,
      details: results,
    };
    await task.save();

    // Log completion
    await ScheduleLog.create({
      action: isSuccess ? "schedule_completed" : "schedule_failed",
      taskType: "update",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      hostIPs: hostIPs,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Updated ${successCount}/${hosts.length} hosts successfully`,
      error: isSuccess ? undefined : `${hosts.length - successCount} hosts failed`,
    });

    console.log(`[Scheduler] Update task ${task._id} completed`);
  } catch (error) {
    console.error(`[Scheduler] Error executing update task ${task._id}:`, error);

    // Update task status to failed
    task.status = "failed";
    task.completedAt = new Date();
    task.error = error.message;
    await task.save();

    // Log failure
    await ScheduleLog.create({
      action: "schedule_failed",
      taskType: "update",
      taskId: task._id,
      scheduledTime: task.scheduledTime,
      osType: task.osType,
      performedBy: task.createdBy,
      message: `Failed to execute scheduled host updates`,
      error: error.message,
    });
  }
}

/**
 * Check and execute pending scheduled tasks
 * Runs every minute
 */
async function checkAndExecuteTasks() {
  try {
    const now = new Date();

    // Find all pending tasks that should be executed
    const pendingTasks = await ScheduledTask.find({
      status: "pending",
      scheduledTime: { $lte: now },
    })
      .populate("patchIds", "patchId name")
      .populate("hostIds", "ip osName");

    if (pendingTasks.length > 0) {
      console.log(
        `[Scheduler] Found ${pendingTasks.length} pending tasks to execute`
      );
    }

    // Execute each task
    for (const task of pendingTasks) {
      if (task.taskType === "patch") {
        await executePatchTask(task);
      } else if (task.taskType === "update") {
        await executeUpdateTask(task);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error checking scheduled tasks:", error);
  }
}

/**
 * Initialize the scheduler
 * Checks for pending tasks every minute
 */
export function initializeScheduler() {
  console.log("[Scheduler] Initializing task scheduler...");

  // Run every minute: '* * * * *'
  cron.schedule("* * * * *", () => {
    checkAndExecuteTasks();
  });

  // Also check for pending tasks on startup (tasks that should have run while server was down)
  setTimeout(() => {
    console.log("[Scheduler] Checking for pending tasks on startup...");
    checkAndExecuteTasks();
  }, 5000); // Wait 5 seconds after startup

  console.log("[Scheduler] Task scheduler initialized successfully");
}
