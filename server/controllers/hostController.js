import { Host } from "../models/Host.js";
import Group from "../models/Group.js";
import GroupLog from "../models/GroupLog.js";
import bcrypt from "bcrypt";
import {
  addWindowsHost,
  addLinuxHost,
  removeHostFromInventory,
} from "../utils/inventoryWriter.js";
import {
  scanHost,
  patchAndScanHost,
  patchLinuxHostSelective,
  patchWindowsHostSelective,
  scanWindowsHost, // ? ADD THIS
  scanLinuxHost, // ? ADD THIS
} from "../utils/ansibleScanner.js";
import {
  processScanLog,
  processInstallLog,
  processSelectiveInstallLog, // NEW
} from "../utils/logReader.js";
import { refreshDefaultGroups } from "../utils/groupManager.js";
import { ScanLog } from "../models/ScanLog.js";
import { InstallLog } from "../models/InstallLog.js";
import { SelectiveInstallLog } from "../models/SelectiveInstallLog.js";
import Patch from "../models/Patch.js";
import { HostAddLog } from "../models/HostAddLog.js";
import { HostDeleteLog } from "../models/HostDeleteLog.js";
import { ErrorLog } from "../models/ErrorLog.js";

export async function addHost(req, res) {
  const performedBy = req.body.user || req.headers["x-user"] || "Admin"; // keep simple per spec
  try {
    const { ip, osName, osVersion, loginId, password, groupIds } = req.body;

    // Validate required fields
    if (!ip || !osName || !osVersion || !loginId || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Check if IP already exists in database
    const existingHost = await Host.findOne({ ip });
    if (existingHost) {
      return res.status(409).json({
        success: false,
        error: `Host with IP ${ip} already exists`,
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Step 1: Add to Ansible inventory file
    let inventoryResult;
    try {
      if (osName === "Windows") {
        inventoryResult = await addWindowsHost(ip, loginId, password);
      } else if (osName === "Linux") {
        inventoryResult = await addLinuxHost(ip, loginId, password);
      } else {
        return res.status(400).json({
          success: false,
          error: `Unsupported OS: ${osName}`,
        });
      }
    } catch (inventoryError) {
      console.error("Inventory write error:", inventoryError);
      return res.status(500).json({
        success: false,
        error: `Failed to add host to inventory: ${inventoryError.message}`,
      });
    }

    // Step 2: Run Ansible scan to get available patches
    let scanResult;
    try {
      scanResult = await scanHost(ip, osName);
    } catch (scanError) {
      console.error("Ansible scan error:", scanError);

      // If scan fails, we should NOT add the host
      return res.status(500).json({
        success: false,
        error: `Ansible scan failed: ${scanError.message}. Host not added.`,
      });
    }

    // Step 3: Create host document in MongoDB
    const host = await Host.create({
      ip,
      osName,
      osVersion,
      loginId,
      passwordHash,
      patchCount: scanResult.patchCount,
      availablePatches: [], // Will be populated later with actual patch IDs
      installedPatches: [],
    });

    // Refresh default groups to include the new host
    await refreshDefaultGroups();

    // Add host to specified custom groups
    if (groupIds && groupIds.length > 0) {
      for (const groupId of groupIds) {
        try {
          const group = await Group.findById(groupId);
          if (group && !group.hosts.includes(host._id)) {
            group.hosts.push(host._id);
            await group.save();

            // Log group update
            await GroupLog.create({
              type: "group_updated",
              groupId: group.id,
              groupName: group.name,
              os: group.os,
              hostCount: group.hosts.length,
              performedBy,
              timestamp: new Date(),
              details: `Host ${ip} added to group`,
              additionalData: { hostId: host._id, hostIP: ip },
            });
          }
        } catch (groupError) {
          console.error(`Failed to add host to group ${groupId}:`, groupError);
        }
      }
    }

    // Log host added
    await HostAddLog.create({
      hostIP: ip,
      osName,
      osVersion,
      loginId,
      performedBy,
      scanResult: {
        patchCount: scanResult.patchCount,
        output: scanResult.output,
      },
    });

    // Step 4: Process and save scan log to database
    try {
      const scanLog = await processScanLog(
        ip,
        osName.toLowerCase(),
        host._id,
        "initial_scan"
      );

      if (scanLog) {
        console.log(`[Add Host] ? Scan log saved for ${ip}`);
      } else {
        console.warn(
          `[Add Host] ?? Scan log not saved for ${ip} (file not found or read error)`
        );
      }
    } catch (logError) {
      // Don't fail the entire operation if log saving fails
      console.error(
        `[Add Host] ? Failed to save scan log for ${ip}:`,
        logError
      );
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: `Host ${ip} added successfully. Found ${scanResult.patchCount} available patches.`,
      data: {
        host: {
          id: host._id,
          ip: host.ip,
          osName: host.osName,
          osVersion: host.osVersion,
          patchCount: host.patchCount,
          createdAt: host.createdAt,
        },
        scanOutput: scanResult.output,
      },
    });
  } catch (error) {
    console.error("Error in addHost:", error);
    await logError({
      operation: "add_host",
      hostIP: req.body?.ip,
      performedBy,
      error,
      requestData: { ...req.body, password: undefined }, // sanitize password
    });
    removeHostFromInventory(req.body?.ip, req.body?.osName);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

export async function listHosts(req, res) {
  try {
    const hosts = await Host.find()
      .select("-passwordHash") // Exclude password hash from response
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: hosts,
    });
  } catch (error) {
    console.error("Error in listHosts:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch hosts",
    });
  }
}

/**
 * Patch a single host by ID
 * Now includes reboot status in response
 */
export async function patchHost(req, res) {
  try {
    const { id } = req.params;

    console.log(`[Patch Host] Request received for host ID: ${id}`);

    const host = await Host.findById(id);
    if (!host) {
      return res.status(404).json({ success: false, error: "Host not found" });
    }

    console.log(`[Patch Host] Found host: ${host.ip} (${host.osName})`);

    // Step 1: Run patch installation + verification scan
    let result;
    try {
      result = await patchAndScanHost(host.ip, host.osName);
      console.log(
        `[Patch Host] Patch & scan completed for ${host.ip}:`,
        result
      );
    } catch (patchError) {
      console.error(
        `[Patch Host] Patch & scan failed for ${host.ip}:`,
        patchError
      );
      return res.status(500).json({
        success: false,
        error: `Patch installation failed: ${patchError.message}`,
      });
    }

    // Step 2: Update host in database
    host.patchCount = result.remaining;
    host.updatedAt = new Date();
    await host.save();

    console.log(
      `[Patch Host] Database updated for ${host.ip}, new patchCount: ${host.patchCount}`
    );

    // Step 3: Process and save installation log
    try {
      const installLog = await processInstallLog(
        host.ip,
        host.osName.toLowerCase(),
        host._id
      );

      if (installLog) {
        console.log(`[Patch Host] ? Install log saved for ${host.ip}`);
      } else {
        console.warn(`[Patch Host] ?? Install log not saved for ${host.ip}`);
      }
    } catch (logError) {
      console.error(
        `[Patch Host] ? Failed to save install log for ${host.ip}:`,
        logError
      );
    }

    // Step 4: Process and save post-patch verification scan log
    if (result.scanSuccess) {
      try {
        const scanLog = await processScanLog(
          host.ip,
          host.osName.toLowerCase(),
          host._id,
          "post_patch_scan"
        );

        if (scanLog) {
          console.log(
            `[Patch Host] ? Post-patch scan log saved for ${host.ip}`
          );
        } else {
          console.warn(
            `[Patch Host] ?? Post-patch scan log not saved for ${host.ip}`
          );
        }
      } catch (logError) {
        console.error(
          `[Patch Host] ? Failed to save post-patch scan log for ${host.ip}:`,
          logError
        );
      }
    }

    // Build success message
    let message = `? Patched ${host.ip} successfully! Installed: ${result.installed} patches`;

    if (result.scanSuccess) {
      message += `, Verified: ${result.scanRemaining} patches remaining`;
    } else {
      message += `, Patch summary: ${result.patchSummaryRemaining} remaining (verification scan failed, using fallback)`;
    }

    if (result.reboot) {
      message += `. ?? Host rebooted during patching.`;
    } else {
      message += `. ? No reboot required.`;
    }

    return res.json({
      success: true,
      message,
      data: {
        id: host._id,
        ip: host.ip,
        osName: host.osName,
        installed: result.installed,
        remaining: result.remaining,
        patchSummaryRemaining: result.patchSummaryRemaining,
        scanRemaining: result.scanRemaining,
        scanSuccess: result.scanSuccess,
        reboot: result.reboot,
        patchCount: host.patchCount,
      },
    });
  } catch (err) {
    console.error("[Patch Host] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to patch host",
    });
  }
}

/**
 * Bulk patch multiple hosts by IDs
 * Processes sequentially with detailed progress logging
 */
export async function bulkPatchHosts(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No host IDs provided" });
    }

    console.log(`[Bulk Patch] Starting bulk patch for ${ids.length} hosts`);

    const results = {
      total: ids.length,
      success: 0,
      failed: 0,
      rebooted: 0,
      details: [],
    };

    // Process sequentially to avoid overload
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      console.log(`[Bulk Patch] Processing host ${i + 1}/${ids.length}: ${id}`);

      try {
        const host = await Host.findById(id);
        if (!host) {
          results.failed++;
          results.details.push({ id, error: "Host not found" });
          console.warn(`[Bulk Patch] Host not found: ${id}`);
          continue;
        }

        console.log(
          `[Bulk Patch] Patching ${host.ip} (${host.osName}) - ${i + 1}/${
            ids.length
          }`
        );

        // Run patch + verification scan
        const r = await patchAndScanHost(host.ip, host.osName);

        // Update database
        host.patchCount = r.remaining;
        host.updatedAt = new Date();
        await host.save();

        results.success++;
        if (r.reboot) results.rebooted++;

        results.details.push({
          id: host._id,
          ip: host.ip,
          osName: host.osName,
          installed: r.installed,
          remaining: r.remaining,
          patchSummaryRemaining: r.patchSummaryRemaining,
          scanRemaining: r.scanRemaining,
          scanSuccess: r.scanSuccess,
          reboot: r.reboot,
        });

        // Save logs
        try {
          await processInstallLog(host.ip, host.osName.toLowerCase(), host._id);

          if (r.scanSuccess) {
            await processScanLog(
              host.ip,
              host.osName.toLowerCase(),
              host._id,
              "post_patch_scan"
            );
          }

          console.log(`[Bulk Patch] ? Logs saved for ${host.ip}`);
        } catch (logError) {
          console.error(
            `[Bulk Patch] ?? Log saving failed for ${host.ip}:`,
            logError
          );
        }

        console.log(
          `[Bulk Patch] ? Success for ${host.ip}: Installed ${r.installed}, Verified ${r.scanRemaining} remaining, Reboot: ${r.reboot}`
        );
      } catch (e) {
        results.failed++;
        results.details.push({ id, error: e.message });
        console.error(`[Bulk Patch] ? Failed for host ${id}:`, e.message);
      }
    }

    console.log(
      `[Bulk Patch] Completed. Success: ${results.success}, Failed: ${results.failed}, Rebooted: ${results.rebooted}`
    );

    return res.json({
      success: true,
      ...results,
      message: `Bulk patch complete. Success: ${results.success}, Failed: ${results.failed}, Rebooted: ${results.rebooted}`,
    });
  } catch (err) {
    console.error("[Bulk Patch] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to bulk patch hosts",
    });
  }
}

export async function deploySelectivePatches(req, res) {
  try {
    const { id } = req.params;
    const { selectedPatches } = req.body;

    console.log(
      "[Deploy Patches] Raw selectedPatches received:",
      JSON.stringify(selectedPatches, null, 2)
    );

    if (
      !selectedPatches ||
      !Array.isArray(selectedPatches) ||
      selectedPatches.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, error: "No patches selected" });
    }

    const host = await Host.findById(id);
    if (!host) {
      return res.status(404).json({ success: false, error: "Host not found" });
    }

    console.log(`[Deploy Patches] Found host: ${host.ip} (${host.osName})`);

    let patchResult;
    let kbNumbers;

    if (host.osName === "Windows") {
      kbNumbers = selectedPatches
        .map((p) => {
          console.log(
            "[Deploy Patches] Processing patch:",
            JSON.stringify(p, null, 2)
          );

          // ? Check `kb` field first
          if (p.kb) {
            const normalized = p.kb.startsWith("KB") ? p.kb : `KB${p.kb}`;
            console.log(
              `[Deploy Patches] Found kb field: ${p.kb} -> ${normalized}`
            );
            return normalized;
          }

          // ? Try to extract from `name` OR `packageName` field
          const textToSearch = p.name || p.packageName || "";
          const match = textToSearch.match(/KB(\d+)/i);

          if (match) {
            console.log(
              `[Deploy Patches] Extracted from ${
                p.name ? "name" : "packageName"
              }: ${textToSearch} -> KB${match[1]}`
            );
            return `KB${match[1]}`;
          }

          console.warn(`[Deploy Patches] No KB found in:`, p);
          return null;
        })
        .filter(Boolean);

      console.log(
        `[Deploy Patches] Final KB numbers array: ${JSON.stringify(kbNumbers)}`
      );

      if (kbNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "No valid KB numbers found in selected patches. Please check frontend data structure.",
        });
      }

      try {
        patchResult = await patchWindowsHostSelective(host.ip, kbNumbers);
      } catch (patchError) {
        console.error(`[Deploy Patches] Windows patch failed:`, patchError);
        return res
          .status(500)
          .json({ success: false, error: patchError.message });
      }
    } else {
      // Linux uses package names
      const packageNames = selectedPatches.map((p) => p.packageName);
      console.log(
        `[Deploy Patches] Linux packages: ${packageNames.join(", ")}`
      );

      try {
        patchResult = await patchLinuxHostSelective(host.ip, packageNames);
      } catch (patchError) {
        console.error(`[Deploy Patches] Linux patch failed:`, patchError);
        return res
          .status(500)
          .json({ success: false, error: patchError.message });
      }
    }

    // Step 2: Update host patch count
    host.patchCount = patchResult.remaining || 0;
    await host.save();

    // Step 3: Save selective install log
    try {
      await processSelectiveInstallLog(
        host.ip,
        host.osName.toLowerCase(),
        host._id
      );
    } catch (logError) {
      console.warn(`[Deploy Patches] Log save warning:`, logError.message);
    }

    // Step 4: Post-patch scan
    let scanResult = null;
    try {
      if (host.osName === "Windows") {
        scanResult = await scanWindowsHost(host.ip);
      } else {
        scanResult = await scanLinuxHost(host.ip);
      }

      if (scanResult?.success) {
        host.patchCount = scanResult.patchCount;
        await host.save();
        await processScanLog(
          host.ip,
          host.osName.toLowerCase(),
          host._id,
          "post_patch_scan"
        );
      }
    } catch (scanError) {
      console.warn(`[Deploy Patches] Post-scan warning:`, scanError.message);
    }

    return res.json({
      success: true,
      message: `Successfully deployed ${selectedPatches.length} patch(es) to ${host.ip}`,
      data: {
        hostIP: host.ip,
        osName: host.osName,
        packagesDeployed:
          host.osName === "Windows"
            ? kbNumbers
            : selectedPatches.map((p) => p.packageName),
        installed: patchResult.installed || 0,
        remaining: patchResult.remaining || 0,
        reboot: patchResult.reboot || false,
        scanVerified: scanResult?.success || false,
        scanRemaining: scanResult?.patchCount || null,
      },
    });
  } catch (error) {
    console.error(`[Deploy Patches] Unexpected error:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function scanHostAfterPatch(req, res) {
  try {
    const { id } = req.params;

    console.log(`[Scan After Patch] Request received for host ID: ${id}`);

    // Fetch host from database
    const host = await Host.findById(id);
    if (!host) {
      return res.status(404).json({
        success: false,
        error: "Host not found",
      });
    }

    console.log(`[Scan After Patch] Found host: ${host.ip} (${host.osName})`);

    // Step 1: Run Ansible scan
    let scanResult;
    try {
      scanResult = await scanHost(host.ip, host.osName);
      console.log(
        `[Scan After Patch] Scan completed for ${host.ip}:`,
        scanResult
      );
    } catch (scanError) {
      console.error(
        `[Scan After Patch] Scan failed for ${host.ip}:`,
        scanError
      );
      return res.status(500).json({
        success: false,
        error: `Scan failed: ${scanError.message}`,
      });
    }

    // Step 2: Update host patch count in database
    host.patchCount = scanResult.patchCount;
    host.updatedAt = new Date();
    await host.save();

    console.log(
      `[Scan After Patch] Host updated. New patchCount: ${host.patchCount}`
    );

    // Step 3: Save scan log to database
    try {
      const scanLog = await processScanLog(
        host.ip,
        host.osName.toLowerCase(),
        host._id,
        "post_patch_scan"
      );

      if (scanLog) {
        console.log(`[Scan After Patch] ? Scan log saved for ${host.ip}`);
      } else {
        console.warn(`[Scan After Patch] ?? Scan log not saved for ${host.ip}`);
      }
    } catch (logError) {
      console.error(
        `[Scan After Patch] ?? Failed to save scan log for ${host.ip}:`,
        logError
      );
    }

    // Return success response
    return res.json({
      success: true,
      message: `Scan completed for ${host.ip}. Found ${scanResult.patchCount} available patches.`,
      data: {
        hostIP: host.ip,
        hostId: host._id,
        osName: host.osName,
        patchCount: host.patchCount,
        lastScanned: host.updatedAt,
      },
    });
  } catch (error) {
    console.error(`[Scan After Patch] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to scan host",
    });
  }
}

/**
 * Delete host with password verification and full cleanup
 * POST /api/hosts/:id
 * Body: { password: "host_password" }
 */
export async function deleteHost(req, res) {
  const performedBy = req.body.user || req.headers["x-user"] || "Admin";
  try {
    const { id } = req.params;
    const { password } = req.body;

    console.log(`[Delete Host] Request received for host ID: ${id}`);

    // Step 1: Find host
    const host = await Host.findById(id);
    if (!host) {
      return res.status(404).json({
        success: false,
        error: "Host not found",
      });
    }

    console.log(`[Delete Host] Found host: ${host.ip} (${host.osName})`);

    // Step 2: Verify password
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required for host deletion",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, host.passwordHash);
    if (!isPasswordValid) {
      console.log(`[Delete Host] Invalid password for ${host.ip}`);
      return res.status(401).json({
        success: false,
        error: "Invalid password",
      });
    }

    console.log(`[Delete Host] Password verified for ${host.ip}`);

    // Step 3: Remove from Ansible inventory
    try {
      await removeHostFromInventory(host.ip, host.osName);
      console.log(`[Delete Host] Removed ${host.ip} from Ansible inventory`);
    } catch (invError) {
      console.error(`[Delete Host] Failed to remove from inventory:`, invError);
      // Continue with deletion even if inventory removal fails
    }

    // Step 4: Delete all scan logs
    const scanLogsDeleted = await ScanLog.deleteMany({ hostId: id });
    console.log(
      `[Delete Host] Deleted ${scanLogsDeleted.deletedCount} scan logs`
    );

    // Step 5: Delete all install logs
    const installLogsDeleted = await InstallLog.deleteMany({ hostId: id });
    console.log(
      `[Delete Host] Deleted ${installLogsDeleted.deletedCount} install logs`
    );

    // Step 6: Delete all selective install logs
    const selectiveLogsDeleted = await SelectiveInstallLog.deleteMany({
      hostId: id,
    });
    console.log(
      `[Delete Host] Deleted ${selectiveLogsDeleted.deletedCount} selective install logs`
    );

    // Step 7: Remove host from Patch.installedOnHosts
    const patchesUpdated = await Patch.updateMany(
      { "installedOnHosts.hostId": id },
      { $pull: { installedOnHosts: { hostId: id } } }
    );
    console.log(
      `[Delete Host] Removed host from ${patchesUpdated.modifiedCount} patch records`
    );

    // Step 8: Remove host from all groups
    const groupsUpdated = await Group.updateMany(
      { hosts: id },
      { $pull: { hosts: id } }
    );
    console.log(
      `[Delete Host] Removed host from ${groupsUpdated.modifiedCount} groups`
    );

    // Step 9: Delete host document
    await Host.findByIdAndDelete(id);
    console.log(`[Delete Host] Deleted host document for ${host.ip}`);

    // capture state before delete
    await HostDeleteLog.create({
      hostIP: host.ip,
      osName: host.osName,
      osVersion: host.osVersion,
      performedBy,
      patchCountAtDeletion: host.patchCount || 0,
      installedPatchesAtDeletion: host.installedPatches || [],
    });

    return res.json({
      success: true,
      message: `Host ${host.ip} and all associated data deleted successfully`,
      data: {
        ip: host.ip,
        osName: host.osName,
        deletedRecords: {
          scanLogs: scanLogsDeleted.deletedCount,
          installLogs: installLogsDeleted.deletedCount,
          selectiveLogs: selectiveLogsDeleted.deletedCount,
          patchReferences: patchesUpdated.modifiedCount,
        },
      },
    });
  } catch (error) {
    console.error("Error in deleteHost:", error);
    await logError({
      operation: "delete_host",
      hostIP: req.body?.ip,
      performedBy,
      error,
      requestData: { ...req.body, password: undefined },
    });
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

// helper to safely log errors (no passwords)
async function logError({
  operation,
  hostIP,
  patchId,
  performedBy,
  statusCode,
  error,
  stdout,
  stderr,
  requestData,
}) {
  try {
    await ErrorLog.create({
      operation,
      hostIP,
      patchId,
      performedBy: performedBy || "Admin",
      statusCode,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      stdout,
      stderr,
      requestData,
    });
  } catch (e) {
    console.warn("[ErrorLog] failed to write:", e.message);
  }
}
