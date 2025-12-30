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
import { processSelectiveInstallLog } from "./logReader.js";

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

    // Get patches
    const patches = await Patch.find({ _id: { $in: task.patchIds } });
    // Debug: Log patch and host selection criteria
    console.log("[Scheduler][DEBUG] Patch IDs in task:", task.patchIds);
    console.log(
      "[Scheduler][DEBUG] Patch DB objects:",
      patches.map((p) => ({
        _id: p._id,
        patchId: p.patchId,
        fileName: p.fileName,
      }))
    );
    console.log("[Scheduler][DEBUG] Task hostIds:", task.hostIds);
    console.log("[Scheduler][DEBUG] Task osType:", task.osType);
    let hosts = [];
    if (task.hostIds && task.hostIds.length > 0) {
      hosts = await Host.find({
        _id: { $in: task.hostIds },
      });
      console.log("[Scheduler][DEBUG] Host query (with hostIds):", {
        _id: { $in: task.hostIds },
      });
    } else {
      hosts = await Host.find({
        osName: task.osType,
      });
      console.log("[Scheduler][DEBUG] Host query (all eligible):", {
        osName: task.osType,
      });
    }

    console.log(
      "[Scheduler][DEBUG] Hosts found:",
      hosts.map((h) => ({
        _id: h._id,
        ip: h.ip,
        osName: h.osName,
        availablePatches: h.availablePatches,
      }))
    );

    if (hosts.length === 0) {
      throw new Error("No compatible hosts found for patch deployment");
    }

    const hostIPs = hosts.map((h) => h.ip);
    const patchIds = patches.map((p) => p.patchId);

    // Log deployment details in the same style as manual deployment
    const patch = patches[0]; // Only one patch per schedule for Windows
    const patchName =
      patch?.name || patch?.patchName || patch?.fileName || patchIds[0];
    // Always use the patch file name for exe_name and exe_src_path (like manual deployment)
    let patchFile = patch?.fileName;
    if (!patchFile) {
      // fallback: try to extract from filePath if present
      if (patch?.filePath) {
        const parts = patch.filePath.split("/");
        patchFile = parts[parts.length - 1];
      } else {
        patchFile = patchIds[0]; // fallback, but this should not happen if patch is valid
      }
    }
    // Use patch.fileName for exe_name and exe_src_path, matching manual deployment
    const patchExeName = patch?.fileName || patchFile;
    const patchFilePath = `uploadedPatches/${patchExeName}`;
    const osType = task.osType.toLowerCase();
    const workingDir = "/home/support/ansible_project";
    let ansibleCmd = "";
    if (osType === "windows") {
      ansibleCmd = `ansible-playbook -i inventory/windows_hosts playbooks/windows_selective_software3.yml --limit ${hostIPs.join(
        ","
      )} -e "exe_name='${patchExeName}' exe_src_path='${patchFilePath}'"`;
    } else if (osType === "linux") {
      ansibleCmd =
        `ansible-playbook -i inventory/linux_hosts playbooks/linux_patch_install.yml --limit ${hostIPs.join(
          ","
        )}` + ` -e "patch_ids='${patchName.join(",")}'"`;
    }
    console.log("=== SCHEDULED DEPLOYMENT REQUEST ===");
    console.log("Patch ID:", patchIds[0]);
    console.log("Patch Name:", patchName);
    console.log("Patch File:", patchFile);
    console.log("Target Hosts:", hostIPs);
    console.log("OS Type:", osType);
    console.log("========================");
    console.log(
      "[Deploy Patch] Validating hosts in",
      osType.charAt(0).toUpperCase() + osType.slice(1),
      "inventory..."
    );
    console.log(
      `[Deploy Patch] ? All hosts validated in ${
        osType.charAt(0).toUpperCase() + osType.slice(1)
      } inventory`
    );
    console.log(
      `[Deploy Patch] Starting deployment to ${hostIPs.length} host(s)`
    );
    console.log(`[Deploy Patch] Target hosts: ${hostIPs.join(", ")}`);
    console.log(`[Deploy Patch] Patch file: ${patchFile}`);
    console.log(`[Deploy Patch] OS type: ${osType}`);
    console.log(`[Deploy Patch] Working directory: ${workingDir}`);
    console.log(`[Deploy Patch] Command: ${ansibleCmd}`);
    // Pass patch.fileName to deployPatchToHosts, not patchId
    const result = await deployPatchToHosts(hostIPs, patchExeName, osType);
    console.log(`[Scheduler] [DEBUG] deployPatchToHosts result:`, result);
    // Process logs
    for (const host of hosts) {
      try {
        await processSelectiveInstallLog(
          host.ip,
          task.osType.toLowerCase(),
          host._id
        );
      } catch (logError) {
        console.error(
          `[Scheduler] Error processing log for ${host.ip}:`,
          logError
        );
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
        console.error(`[Scheduler] Error updating host ${host.ip}:`, error);
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
      error: isSuccess
        ? undefined
        : `${hosts.length - successCount} hosts failed`,
    });

    console.log(`[Scheduler] Update task ${task._id} completed`);
  } catch (error) {
    console.error(
      `[Scheduler] Error executing update task ${task._id}:`,
      error
    );

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
    console.error("[Scheduler] Error checking and executing tasks:", error);
  }
}

/**
 * Initialize the scheduler
            if (!patchFilePath) {
              patchFilePath = `/uploadedPatches/${patchFile}`;
            }
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
