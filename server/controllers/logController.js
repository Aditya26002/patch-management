import { ScanLog } from "../models/ScanLog.js";
import { InstallLog } from "../models/InstallLog.js";
import { SelectiveInstallLog } from "../models/SelectiveInstallLog.js";
import { HostAddLog } from "../models/HostAddLog.js";
import { HostDeleteLog } from "../models/HostDeleteLog.js";
import { PatchDeleteLog } from "../models/PatchDeleteLog.js";
import { PatchAddLog } from "../models/PatchAddLog.js";
import { ErrorLog } from "../models/ErrorLog.js";
import SelectiveApplicationInstallLog from "../models/SelectiveApplicationInstallLog.js";
import { ScheduleLog } from "../models/ScheduleLog.js";
import GroupLog from "../models/GroupLog.js";

/**
 * Get combined logs (scan + install) with filters and pagination
 * GET /api/logs?hostIP=X&os=linux&logType=scan&startDate=X&endDate=X&page=1&limit=25
 */
export async function getLogs(req, res) {
  try {
    const {
      hostIP,
      os,
      logType,
      installType,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let combinedLogs = [];

    // Scan logs
    if (!logType || logType === "scan") {
      const filter = {};
      if (hostIP) filter.hostIP = hostIP;
      if (os) filter.os = os;
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await ScanLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({ ...l, type: "scan", timestamp: l.timestamp }))
      );
    }

    // Install logs (full/selective)
    if (!logType || logType === "install") {
      const filter = {};
      if (hostIP) filter.hostIP = hostIP;
      if (os) filter.os = os;
      if (installType) filter.installType = installType;
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await InstallLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({ ...l, type: "install", timestamp: l.timestamp }))
      );
    }

    // Selective install logs
    if (!logType || logType === "selective") {
      const filter = {};
      if (hostIP) filter.hostIP = hostIP;
      if (os) filter.os = os;
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await SelectiveInstallLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({
          ...l,
          type: "selective",
          timestamp: l.timestamp,
        }))
      );
    }

    // Patch install (SelectiveApplicationInstallLog) => label as "patch_install"
    if (!logType || logType === "patch_install") {
      const filter = {};
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await SelectiveApplicationInstallLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({
          ...l,
          type: "patch_install",
          timestamp: l.timestamp,
        }))
      );
    }

    // Host activity logs
    if (!logType || logType === "host_activity") {
      const filter = {};
      if (hostIP) filter.hostIP = hostIP;
      if (startDate || endDate) filter.timestamp = dateFilter;
      const adds = await HostAddLog.find(filter).lean();
      const dels = await HostDeleteLog.find(filter).lean();
      const patchAdds = await PatchAddLog.find(
        startDate || endDate ? { timestamp: dateFilter } : {}
      ).lean();
      const patchDels = await PatchDeleteLog.find(
        startDate || endDate ? { timestamp: dateFilter } : {}
      ).lean();
      combinedLogs.push(
        ...adds.map((l) => ({
          ...l,
          type: "host_added",
          timestamp: l.timestamp,
        })),
        ...dels.map((l) => ({
          ...l,
          type: "host_deleted",
          timestamp: l.timestamp,
        })),
        ...patchAdds.map((l) => ({
          ...l,
          type: "patch_added",
          timestamp: l.timestamp,
        })),
        ...patchDels.map((l) => ({
          ...l,
          type: "patch_deleted",
          timestamp: l.timestamp,
        }))
      );
    }

    // Schedule logs
    if (!logType || logType === "schedule") {
      const filter = {};
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await ScheduleLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({
          ...l,
          type: "schedule",
          timestamp: l.timestamp,
        }))
      );
    }

    // Error logs
    if (!logType || logType === "error") {
      const filter = {};
      if (hostIP) filter.hostIP = hostIP;
      if (startDate || endDate) filter.timestamp = dateFilter;
      const logs = await ErrorLog.find(filter).lean();
      combinedLogs.push(
        ...logs.map((l) => ({ ...l, type: "error", timestamp: l.timestamp }))
      );
    }

    // Sort and paginate
    combinedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const totalLogs = combinedLogs.length;
    const totalPages = Math.ceil(totalLogs / limit);
    const currentPage = parseInt(page);
    const startIndex = (currentPage - 1) * limit;
    const paginatedLogs = combinedLogs.slice(
      startIndex,
      startIndex + parseInt(limit)
    );

    return res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        currentPage,
        totalPages,
        totalLogs,
        limit: parseInt(limit),
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("[Logs API] Error fetching logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch logs",
      message: error.message,
    });
  }
}

/**
 * Get single log by ID and type
 * GET /api/logs/:type/:id
 */
export async function getLogById(req, res) {
  try {
    const { type, id } = req.params;
    let log;

    if (type === "scan") log = await ScanLog.findById(id);
    else if (type === "install") log = await InstallLog.findById(id);
    else if (type === "selective") log = await SelectiveInstallLog.findById(id);
    else if (type === "patch_install")
      log = await SelectiveApplicationInstallLog.findById(id);
    else if (type === "host_added") log = await HostAddLog.findById(id);
    else if (type === "host_deleted") log = await HostDeleteLog.findById(id);
    else if (type === "error") log = await ErrorLog.findById(id);

    if (!log) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    res.json({ success: true, data: { ...log.toObject(), type } });
  } catch (error) {
    console.error("[Logs API] Error fetching log:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch log",
      message: error.message,
    });
  }
}

/**
 * Get log statistics
 * GET /api/logs/stats
 */
export async function getLogStats(req, res) {
  try {
    const totalScanLogs = await ScanLog.countDocuments();
    const totalInstallLogsFull = await InstallLog.countDocuments();
    const totalInstallLogsSelective =
      await SelectiveInstallLog.countDocuments();
    const totalInstallLogs = totalInstallLogsFull + totalInstallLogsSelective;

    const installsByOSFull = await InstallLog.aggregate([
      { $group: { _id: "$os", count: { $sum: 1 } } },
    ]);
    const installsByOSSel = await SelectiveInstallLog.aggregate([
      { $group: { _id: "$os", count: { $sum: 1 } } },
    ]);
    const installsByOS = [...installsByOSFull, ...installsByOSSel];

    const successfulInstalls =
      (await InstallLog.countDocuments({ success: true })) +
      (await SelectiveInstallLog.countDocuments({ success: true }));
    const failedInstalls =
      (await InstallLog.countDocuments({ success: false })) +
      (await SelectiveInstallLog.countDocuments({ success: false }));
    const rebootsRequired =
      (await InstallLog.countDocuments({ rebootRequired: true })) +
      (await SelectiveInstallLog.countDocuments({ rebootRequired: true }));

    res.json({
      success: true,
      data: {
        totalLogs: totalScanLogs + totalInstallLogs,
        totalScanLogs,
        totalInstallLogs,
        scansByOS,
        installsByOS,
        successfulInstalls,
        failedInstalls,
        rebootsRequired,
      },
    });
  } catch (error) {
    console.error("[Logs API] Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch log statistics",
      message: error.message,
    });
  }
}

// Get scan logs by hostIP
export async function getScanLogsByIP(req, res) {
  try {
    const { hostIP } = req.query;

    if (!hostIP) {
      return res.status(400).json({
        success: false,
        error: "hostIP query parameter is required",
      });
    }

    console.log(`[logController] Fetching scan logs for IP: ${hostIP}`);

    // Find the latest scan log for the given hostIP
    const scanLog = await ScanLog.findOne({ hostIP }).sort({ timestamp: -1 });

    if (!scanLog) {
      console.log(`[logController] No scan logs found for IP: ${hostIP}`);
      return res.status(200).json({
        success: true,
        message: "No scan logs found for this host",
        hostIP,
        updates: [],
        totalUpdates: 0,
      });
    }

    console.log(
      `[logController] Found scan log with ${
        scanLog.updates?.length || 0
      } updates`
    );

    return res.status(200).json({
      success: true,
      hostIP: scanLog.hostIP,
      os: scanLog.os,
      scanType: scanLog.scanType,
      timestamp: scanLog.timestamp,
      totalUpdates: scanLog.totalUpdates || 0,
      updates: scanLog.updates || [],
    });
  } catch (error) {
    console.error("[logController] Error fetching scan logs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch scan logs",
    });
  }
}

// New dedicated endpoints
export async function getHostActivityLogs(req, res) {
  try {
    const logs = [
      ...(await HostAddLog.find().lean()),
      ...(await HostDeleteLog.find().lean()),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, data: logs });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch host activity logs" });
  }
}

export async function getErrorLogs(req, res) {
  try {
    const logs = await ErrorLog.find().sort({ timestamp: -1 }).lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch error logs" });
  }
}

export async function createErrorLog(req, res) {
  try {
    const log = await ErrorLog.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to create error log" });
  }
}

export async function getGroupLogs(req, res) {
  try {
    const { type, startDate, endDate, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (type) filter.type = type;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    if (startDate || endDate) filter.timestamp = dateFilter;

    const totalLogs = await GroupLog.countDocuments(filter);
    const totalPages = Math.ceil(totalLogs / limit);

    const logs = await GroupLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      logs,
      totalLogs,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching group logs:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch group logs" });
  }
}
