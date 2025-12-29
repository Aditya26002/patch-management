import fs from "fs/promises";
import path from "path";
import { ScanLog } from "../models/ScanLog.js";
import { InstallLog } from "../models/InstallLog.js";
import { SelectiveInstallLog } from "../models/SelectiveInstallLog.js";

const SCAN_LOGS_DIR = "/home/support/ansible_project/logs/scan_logs";
const INSTALL_LOGS_DIR = "/home/support/ansible_project/logs/installation_logs";

/**
 * Convert Ansible timestamp format to JavaScript Date
 * Converts: "2025-12-03T08-29-01Z" → Date object
 * @param {string} timestamp - Timestamp string from Ansible
 * @returns {Date} - Parsed Date object
 */
function parseAnsibleTimestamp(timestamp) {
  try {
    // Replace hyphens in time portion with colons
    // "2025-12-03T08-29-01Z" → "2025-12-03T08:29:01Z"
    const fixedTimestamp = timestamp.replace(
      /T(\d{2})-(\d{2})-(\d{2})Z?$/,
      "T$1:$2:$3Z"
    );

    const date = new Date(fixedTimestamp);

    // Validate the date is valid
    if (isNaN(date.getTime())) {
      console.warn(
        `[Log Reader] Invalid timestamp: ${timestamp}, using current time`
      );
      return new Date();
    }

    return date;
  } catch (error) {
    console.error(`[Log Reader] Error parsing timestamp ${timestamp}:`, error);
    return new Date(); // Fallback to current time
  }
}

/**
 * Wait for file to exist with retry logic
 * @param {string} filePath - Full path to file
 * @param {number} maxRetries - Maximum number of retries (default: 5)
 * @param {number} delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns {Promise<boolean>} - True if file exists, false otherwise
 */
async function waitForFile(filePath, maxRetries = 5, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      console.log(`[Log Reader] File found: ${filePath}`);
      return true;
    } catch (error) {
      console.log(
        `[Log Reader] File not found (attempt ${
          i + 1
        }/${maxRetries}): ${filePath}`
      );
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

/**
 * Find the latest log file for a host using pattern matching
 * @param {string} directory - Directory to search in
 * @param {string} pattern - Glob pattern (e.g., "10.10.8.253_linux_patch_scan_*.json")
 * @returns {Promise<string|null>} - Full path to latest file or null
 */
async function findLatestLogFile(directory, hostIP, osType, logType) {
  try {
    const files = await fs.readdir(directory);
    let pattern;
    if (logType === "scan") {
      pattern = `${hostIP}_${osType}_host_scan_`;
    } else if (logType === "install") {
      pattern = `${hostIP}_${osType}_patch_install_`;
    } else if (logType === "selective_install") {
      pattern = `${hostIP}_${osType}_selective_patch_install_`;
    } else {
      throw new Error(`Unknown logType: ${logType}`);
    }
    const matchingFiles = files.filter(
      (file) => file.startsWith(pattern) && file.endsWith(".json")
    );
    if (matchingFiles.length === 0) {
      console.warn(`[Log Reader] No ${logType} logs for ${hostIP} (${osType})`);
      return null;
    }
    matchingFiles.sort().reverse();
    return path.join(directory, matchingFiles[0]);
  } catch (error) {
    console.error(`[Log Reader] Error finding log file:`, error);
    return null;
  }
}

/**
 * Read and parse JSON log file with retry
 * @param {string} filePath - Full path to JSON file
 * @returns {Promise<Object|null>} - Parsed JSON object or null
 */
async function readLogFile(filePath) {
  try {
    // Wait for file to exist
    const fileExists = await waitForFile(filePath);
    if (!fileExists) {
      console.warn(`[Log Reader] File not found after retries: ${filePath}`);
      return null;
    }

    // Read and parse JSON
    const content = await fs.readFile(filePath, "utf-8");
    const parsedData = JSON.parse(content);

    console.log(`[Log Reader] Successfully read log file: ${filePath}`);
    return parsedData;
  } catch (error) {
    console.error(`[Log Reader] Error reading log file ${filePath}:`, error);
    return null;
  }
}

/**
 * Save scan log to MongoDB
 * @param {Object} logData - Parsed JSON data from scan log
 * @param {string} hostId - MongoDB ObjectId of host
 * @param {string} logFilePath - Full path to log file
 * @param {string} scanType - Type of scan ("initial_scan" or "post_patch_scan")
 * @returns {Promise<Object>} - Saved ScanLog document
 */
export async function saveScanLog(
  logData,
  hostId,
  logFilePath,
  scanType = "initial_scan"
) {
  try {
    console.log(`[Log Reader] Saving scan log to database for ${logData.host}`);

    // Transform updates array to match schema
    const transformedUpdates = logData.updates.map((update) => ({
      name: update.name || update.title || null,
      kb: Array.isArray(update.kb) ? update.kb[0] : update.kb || null, // ✅ FIX: Extract first element if array
      category: update.category || null,
      currentVersion: update.current_version || null,
      newVersion: update.new_version || null,
      isSecurity: update.is_security || false,
      supportUrl: update.support_url || null,
    }));

    const scanLog = new ScanLog({
      hostIP: logData.host,
      hostId,
      os: logData.os,
      timestamp: parseAnsibleTimestamp(logData.timestamp),
      scanType,
      totalUpdates: parseInt(logData.total_updates) || 0,
      updates: transformedUpdates,
      logFilePath,
    });

    await scanLog.save();

    console.log(`[Log Reader] ✅ Scan log saved to database: ${scanLog._id}`);
    return scanLog;
  } catch (error) {
    console.error(`[Log Reader] ❌ Error saving scan log to database:`, error);
    throw error;
  }
}

/**
 * Save installation log to MongoDB
 * @param {Object} logData - Parsed JSON data from install log
 * @param {string} hostId - MongoDB ObjectId of host
 * @param {string} logFilePath - Full path to log file
 * @returns {Promise<Object>} - Saved InstallLog document
 */
export async function saveInstallLog(
  logData,
  hostId,
  logFilePath,
  osType,
  installType = "full"
) {
  try {
    console.log(
      `[Log Reader] Saving install log to database for ${logData.host}`
    );

    // Extract installation details if available
    let installationDetails = [];
    if (
      logData.installation_details &&
      Array.isArray(logData.installation_details)
    ) {
      installationDetails = logData.installation_details.map((detail) => ({
        name: detail.name || null,
        kb: detail.kb || null,
        category: detail.category || null,
        currentVersion: detail.current_version || null,
        newVersion: detail.new_version || null,
        isSecurity: detail.is_security || false,
        status: detail.status || "installed",
      }));
    }

    const installLog = new InstallLog({
      hostIP: logData.host,
      hostId,
      os: osType || logData.os || "linux",
      installType,
      timestamp: parseAnsibleTimestamp(logData.timestamp),
      success: logData.success !== undefined ? logData.success : true,
      rebootRequired:
        logData.reboot_required || logData.summary?.reboot_required || false,
      rebootPerformed:
        logData.reboot_performed || logData.reboot_required || false,
      installedCount: parseInt(
        logData.installed_count ||
          logData.summary?.installed ||
          logData.install?.installed_update_count ||
          0
      ),
      remainingCount: parseInt(
        logData.remaining_count ||
          logData.summary?.remaining ||
          logData.after?.remaining_updates ||
          0
      ),
      errors: logData.errors || [],
      installationDetails,
      rawOutput: {
        stdout: logData.raw_output?.stdout || "",
        stderr: logData.raw_output?.stderr || "",
      },
      rawLog: logData, // full blob
      logFilePath,
    });

    await installLog.save();

    console.log(`[Log Reader] ✅ Install log saved: ${installLog._id}`);
    return installLog;
  } catch (error) {
    console.error(`[Log Reader] ❌ Error saving install log:`, error);
    throw error;
  }
}

export async function saveSelectiveInstallLog(
  logData,
  hostId,
  logFilePath,
  osType
) {
  try {
    const success = (logData.install?.failed_count || 0) === 0;
    const selectiveLog = new SelectiveInstallLog({
      hostIP: logData.host,
      hostId,
      os: osType || logData.os || "linux",
      installType: "selective",
      timestamp: parseAnsibleTimestamp(logData.timestamp),
      success,
      rebootRequired:
        logData.install?.reboot_required ??
        logData.summary?.reboot_required ??
        false,
      selection: logData.selection,
      install: logData.install,
      summary: logData.summary,
      rawLog: logData,
      logFilePath,
    });
    await selectiveLog.save();
    console.log(
      `[Log Reader] ✅ Selective install log saved: ${selectiveLog._id}`
    );
    return selectiveLog;
  } catch (error) {
    console.error(`[Log Reader] ❌ Error saving selective install log:`, error);
    throw error;
  }
}

/**
 * Process and save scan log
 * @param {string} hostIP - Host IP address
 * @param {string} osType - OS type ("linux" or "windows")
 * @param {string} hostId - MongoDB ObjectId of host
 * @param {string} scanType - Type of scan ("initial_scan" or "post_patch_scan")
 * @returns {Promise<Object|null>} - Saved ScanLog document or null
 */
export async function processScanLog(
  hostIP,
  osType,
  hostId,
  scanType = "initial_scan"
) {
  try {
    console.log(
      `[Log Reader] Processing scan log for ${hostIP} (${osType}) - ${scanType}`
    );

    // Find latest scan log file
    const logFilePath = await findLatestLogFile(
      SCAN_LOGS_DIR,
      hostIP,
      osType,
      "scan"
    );

    if (!logFilePath) {
      console.warn(`[Log Reader] No scan log file found for ${hostIP}`);
      return null;
    }

    // Read log file
    const logData = await readLogFile(logFilePath);
    if (!logData) {
      console.warn(`[Log Reader] Failed to read scan log file for ${hostIP}`);
      return null;
    }

    // Save to database
    const savedLog = await saveScanLog(logData, hostId, logFilePath, scanType);
    return savedLog;
  } catch (error) {
    console.error(
      `[Log Reader] Error processing scan log for ${hostIP}:`,
      error
    );
    return null;
  }
}

/**
 * Process and save installation log
 * @param {string} hostIP - Host IP address
 * @param {string} osType - OS type ("linux" or "windows")
 * @param {string} hostId - MongoDB ObjectId of host
 * @returns {Promise<Object|null>} - Saved InstallLog document or null
 */
export async function processInstallLog(hostIP, osType, hostId) {
  try {
    console.log(
      `[Log Reader] Processing install log for ${hostIP} (${osType})`
    );

    // Find latest install log file
    const logFilePath = await findLatestLogFile(
      INSTALL_LOGS_DIR,
      hostIP,
      osType,
      "install"
    );

    if (!logFilePath) {
      console.warn(`[Log Reader] No install log file found for ${hostIP}`);
      return null;
    }

    // Read log file
    const logData = await readLogFile(logFilePath);
    if (!logData) {
      console.warn(
        `[Log Reader] Failed to read install log file for ${hostIP}`
      );
      return null;
    }

    // Save to database
    const savedLog = await saveInstallLog(
      logData,
      hostId,
      logFilePath,
      osType,
      "full"
    );
    return savedLog;
  } catch (error) {
    console.error(
      `[Log Reader] Error processing install log for ${hostIP}:`,
      error
    );
    return null;
  }
}

/**
 * Process and save selective install log
 * @param {string} hostIP - Host IP address
 * @param {string} osType - OS type ("linux" or "windows")
 * @param {string} hostId - MongoDB ObjectId of host
 * @returns {Promise<Object|null>} - Saved SelectiveInstallLog document or null
 */
export async function processSelectiveInstallLog(hostIP, osType, hostId) {
  try {
    console.log(
      `[Log Reader] Processing selective install log for ${hostIP} (${osType})`
    );

    // Find latest selective install log file
    const logFilePath = await findLatestLogFile(
      INSTALL_LOGS_DIR,
      hostIP,
      osType,
      "selective_install"
    );

    if (!logFilePath) {
      console.warn(
        `[Log Reader] No selective install log file found for ${hostIP}`
      );
      return null;
    }

    // Read log file
    const logData = await readLogFile(logFilePath);
    if (!logData) {
      console.warn(
        `[Log Reader] Failed to read selective install log file for ${hostIP}`
      );
      return null;
    }

    // Save to database
    const savedLog = await saveSelectiveInstallLog(
      logData,
      hostId,
      logFilePath,
      osType
    );
    return savedLog;
  } catch (error) {
    console.error(
      `[Log Reader] Error processing selective install log for ${hostIP}:`,
      error
    );
    return null;
  }
}
