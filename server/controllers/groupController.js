import Group from "../models/Group.js";
import GroupLog from "../models/GroupLog.js";
import { Host } from "../models/Host.js";
import {
  patchLinuxHostSelective,
  patchWindowsHostSelective,
  scanLinuxHost,
  scanWindowsHost,
} from "../utils/ansibleScanner.js";
import { processSelectiveInstallLog } from "../utils/logReader.js";

// Get next available group ID
async function getNextGroupId() {
  const lastGroup = await Group.findOne().sort({ id: -1 });
  return lastGroup ? lastGroup.id + 1 : 1;
}

// Get all groups
export async function getAllGroups(req, res) {
  try {
    const {
      page = 1,
      limit = 25,
      search = "",
      os = "",
      type = "", // 'default' or 'custom'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    let filter = {};

    // Search filter
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // OS filter
    if (os) {
      filter.os = os;
    }

    // Type filter (default/custom)
    if (type === "default") {
      filter.isDefault = true;
    } else if (type === "custom") {
      filter.isDefault = false;
    }

    // Get total count for pagination
    const totalGroups = await Group.countDocuments(filter);

    // Get groups with pagination
    const groups = await Group.find(filter)
      .populate("hosts", "ip osName osVersion loginId")
      .sort({ id: 1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalGroups / limitNum);

    res.json({
      success: true,
      data: groups,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalGroups,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
      error: error.message,
    });
  }
}

// Get group by ID
export async function getGroupById(req, res) {
  try {
    const { id } = req.params;

    const group = await Group.findOne({ id: parseInt(id) }).populate(
      "hosts",
      "ip osName osVersion loginId"
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch group",
      error: error.message,
    });
  }
}

// Create new group
export async function createGroup(req, res) {
  try {
    const { name, os, hostIds } = req.body;

    // Validate required fields
    if (!name || !os || !hostIds || hostIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Group name, OS, and at least one host are required",
      });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "Group name already exists",
      });
    }

    // Validate that all hosts exist and match the OS
    const hosts = await Host.find({ _id: { $in: hostIds } });
    if (hosts.length !== hostIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more hosts not found",
      });
    }

    // Check OS consistency
    const invalidHosts = hosts.filter((host) => host.osName !== os);
    if (invalidHosts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `All hosts must be ${os} systems`,
      });
    }

    // Get next group ID
    const groupId = await getNextGroupId();

    // Create group
    const group = new Group({
      id: groupId,
      name: name.trim(),
      os,
      hosts: hostIds,
      isDefault: false,
    });

    await group.save();

    // Update hosts to include this group
    await Host.updateMany(
      { _id: { $in: hostIds } },
      { $addToSet: { groups: group._id } }
    );

    // Log the creation
    await GroupLog.create({
      type: "group_created",
      groupId,
      groupName: name.trim(),
      os,
      hostCount: hostIds.length,
      performedBy: req.user?.username || "Admin",
    });

    // Populate hosts for response
    await group.populate("hosts", "ip osName osVersion loginId");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: group,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create group",
      error: error.message,
    });
  }
}

// Update group
export async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, hostIds } = req.body;

    const group = await Group.findOne({ id: parseInt(id) });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Don't allow updating default groups
    if (group.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot update default groups",
      });
    }

    // Validate name uniqueness if changed
    if (name && name.trim() !== group.name) {
      const existingGroup = await Group.findOne({
        name: name.trim(),
        id: { $ne: group.id },
      });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "Group name already exists",
        });
      }
    }

    // Validate hosts if provided
    let validatedHostIds = group.hosts;
    if (hostIds) {
      if (hostIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Group must have at least one host",
        });
      }

      const hosts = await Host.find({ _id: { $in: hostIds } });
      if (hosts.length !== hostIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more hosts not found",
        });
      }

      // Check OS consistency
      const invalidHosts = hosts.filter((host) => host.osName !== group.os);
      if (invalidHosts.length > 0) {
        return res.status(400).json({
          success: false,
          message: `All hosts must be ${group.os} systems`,
        });
      }

      validatedHostIds = hostIds;
    }

    // Track changes for logging
    const oldHostCount = group.hosts.length;
    const nameChanged = name && name.trim() !== group.name;

    // Update group
    if (name) group.name = name.trim();
    if (hostIds) group.hosts = validatedHostIds;

    await group.save();

    // Update host group references
    if (hostIds) {
      // Remove group from old hosts
      await Host.updateMany(
        { groups: group._id, _id: { $nin: validatedHostIds } },
        { $pull: { groups: group._id } }
      );

      // Add group to new hosts
      await Host.updateMany(
        { _id: { $in: validatedHostIds }, groups: { $ne: group._id } },
        { $addToSet: { groups: group._id } }
      );
    }

    // Log the update
    await GroupLog.create({
      type: "group_updated",
      groupId: group.id,
      groupName: group.name,
      os: group.os,
      hostCount: group.hosts.length,
      performedBy: req.user?.username || "Admin",
    });

    // Populate hosts for response
    await group.populate("hosts", "ip osName osVersion loginId");

    res.json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update group",
      error: error.message,
    });
  }
}

// Delete group
export async function deleteGroup(req, res) {
  try {
    const { id } = req.params;

    const group = await Group.findOne({ id: parseInt(id) });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Don't allow deleting default groups
    if (group.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default groups",
      });
    }

    // Log before deletion
    await GroupLog.create({
      type: "group_deleted",
      groupId: group.id,
      groupName: group.name,
      os: group.os,
      hostCount: group.hosts.length,
      performedBy: req.user?.username || "Admin",
    });

    // Remove group from all hosts
    await Host.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    // Delete the group
    await Group.findByIdAndDelete(group._id);

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete group",
      error: error.message,
    });
  }
}

export async function deploySelectivePatchesToGroup(req, res) {
  try {
    const { id } = req.params;
    const { selectedPatches } = req.body;

    if (!selectedPatches || typeof selectedPatches !== "object") {
      return res.status(400).json({
        success: false,
        error:
          "selectedPatches must be an object mapping hostIP to patch array",
      });
    }

    const group = await Group.findById(id).populate("hosts");
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }

    if (group.hosts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No hosts in this group",
      });
    }

    // FIX: Use correct property name - check which one your Group model uses
    const osType = group.osType || group.os;

    if (!osType) {
      console.error(
        "[Group Selective Patch] Group OS type is undefined:",
        group
      );
      return res.status(400).json({
        success: false,
        error: "Group OS type is not defined",
      });
    }

    console.log(
      `[Group Selective Patch] Starting for group: ${group.name} (${osType})`
    );

    const results = {
      total: group.hosts.length,
      success: 0,
      failed: 0,
      details: [],
    };

    const hostsToUpdate = group.hosts.filter(
      (host) => selectedPatches[host.ip] && selectedPatches[host.ip].length > 0
    );

    if (hostsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No patches selected for any host",
      });
    }

    // FIX: Use the osType variable consistently
    if (osType === "Windows") {
      // Windows processing...
      for (const host of hostsToUpdate) {
        const kbList = selectedPatches[host.ip];

        try {
          console.log(
            `[Group Selective Patch] Processing ${host.ip} with ${kbList.length} patches`
          );

          const patchResult = await patchWindowsHostSelective(host.ip, kbList);

          let selectiveLogDoc = null;
          try {
            selectiveLogDoc = await processSelectiveInstallLog(
              host.ip,
              "windows",
              host._id
            );
          } catch (logErr) {
            console.warn(
              `[Group Selective Patch] Log processing failed for ${host.ip}:`,
              logErr.message
            );
          }

          try {
            const scanResult = await scanWindowsHost(host.ip);
            if (scanResult?.patchCount != null) {
              host.patchCount = scanResult.patchCount;
              host.updatedAt = new Date();
              await host.save();
            }
          } catch (scanErr) {
            console.warn(
              `[Group Selective Patch] Post-scan failed for ${host.ip}:`,
              scanErr.message
            );
          }

          results.success++;
          results.details.push({
            hostIP: host.ip,
            success: true,
            installed: patchResult.installSummary?.installed || kbList.length,
            remaining: host.patchCount,
            reboot: patchResult.installSummary?.reboot || false,
            selectiveLogId: selectiveLogDoc?._id || null,
          });
        } catch (error) {
          console.error(
            `[Group Selective Patch] Failed for ${host.ip}:`,
            error
          );
          results.failed++;
          results.details.push({
            hostIP: host.ip,
            success: false,
            error: error.message,
          });
        }
      }
    } else if (osType === "Linux") {
      // Linux processing...
      try {
        const hostPackagesMap = {};
        hostsToUpdate.forEach((host) => {
          hostPackagesMap[host.ip] = selectedPatches[host.ip];
        });

        console.log(
          `[Group Selective Patch] Processing ${hostsToUpdate.length} Linux hosts`
        );

        const patchResult = await patchLinuxHostSelective(hostPackagesMap);

        for (const host of hostsToUpdate) {
          try {
            await processSelectiveInstallLog(host.ip, "linux", host._id);

            const scanResult = await scanLinuxHost(host.ip);
            if (scanResult?.patchCount != null) {
              host.patchCount = scanResult.patchCount;
              host.updatedAt = new Date();
              await host.save();
            }

            results.success++;
            results.details.push({
              hostIP: host.ip,
              success: true,
              installed: selectedPatches[host.ip].length,
              remaining: host.patchCount,
            });
          } catch (error) {
            console.error(
              `[Group Selective Patch] Post-processing failed for ${host.ip}:`,
              error
            );
            results.failed++;
            results.details.push({
              hostIP: host.ip,
              success: false,
              error: error.message,
            });
          }
        }
      } catch (error) {
        console.error(`[Group Selective Patch] Linux batch failed:`, error);
        hostsToUpdate.forEach((host) => {
          results.failed++;
          results.details.push({
            hostIP: host.ip,
            success: false,
            error: error.message,
          });
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported OS type: ${osType}`,
      });
    }

    res.json({
      success: true,
      message: `Selective patch deployment completed for group ${group.name}`,
      data: results,
    });
  } catch (error) {
    console.error("[Group Selective Patch] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to deploy selective patches",
    });
  }
}
