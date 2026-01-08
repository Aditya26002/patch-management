
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execPromise = promisify(exec);

// Platform-specific shell configuration
const SHELL_CONFIG = {
  shell: os.platform() === "win32" ? "cmd.exe" : "/bin/bash",
  maxBuffer: 1024 * 1024 * 10,
};

/**
 * Run Ansible scan command for Windows host
 * Uses: windows_patch_scan.yml
 * Output: "10.10.10.247 has 5 updates available"
 */
export async function scanWindowsHost(hostIP) {
  const command = `ansible-playbook /home/support/ansible_project/playbooks/windows_host_scan.yml -i /home/support/ansible_project/inventory/windows_hosts -e "target_hosts=${hostIP}"`;

  try {
    console.log(`[Windows Scan] Starting scan for ${hostIP}`);
    console.log(`[Windows Scan] Command: ${command}`);

    const { stdout, stderr } = await execPromise(command, SHELL_CONFIG);

    const patchCount = parseWindowsOutput(stdout);
    console.log(
      `[Windows Scan] Scan complete for ${hostIP}: ${patchCount} patches found`
    );

    return {
      success: true,
      patchCount,
      output: stdout,
      error: stderr || null,
    };
  } catch (error) {
    console.error(`[Windows Scan] Error for ${hostIP}:`, error);
    throw new Error(`Ansible scan failed: ${error.message}`);
  }
}

/**
 * Run Ansible scan command for Linux host
 * Uses: linux_patch_scan.yml
 * Output: "10.10.8.253 has 158 updates available"
 */
export async function scanLinuxHost(hostIP) {
  const command = `ansible-playbook -i /home/support/ansible_project/inventory/linux_hosts /home/support/ansible_project/playbooks/linux_host_scan.yml -l ${hostIP}`;

  try {
    console.log(`[Linux Scan] Starting scan for ${hostIP}`);
    console.log(`[Linux Scan] Command: ${command}`);

    const { stdout, stderr } = await execPromise(command, SHELL_CONFIG);

    const patchCount = parseLinuxOutput(stdout);
    console.log(
      `[Linux Scan] Scan complete for ${hostIP}: ${patchCount} patches found`
    );

    return {
      success: true,
      patchCount,
      output: stdout,
      error: stderr || null,
    };
  } catch (error) {
    console.error(`[Linux Scan] Error for ${hostIP}:`, error);
    throw new Error(`Ansible scan failed: ${error.message}`);
  }
}

/**
 * Parse Windows Ansible output to extract patch count
 * Pattern: "10.10.10.247 has 5 updates available"
 */
function parseWindowsOutput(output) {
  try {
    const regex = /has (\d+) updates available/i;
    const match = output.match(regex);

    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    console.warn("[Windows Scan] Could not parse patch count, defaulting to 0");
    return 0;
  } catch (error) {
    console.error("[Windows Scan] Error parsing output:", error);
    return 0;
  }
}

/**
 * Parse Linux Ansible output to extract patch count
 * Pattern: "10.10.8.253 has 158 updates available"
 */
function parseLinuxOutput(output) {
  try {
    const regex = /has (\d+) updates available/i;
    const match = output.match(regex);

    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    console.warn("[Linux Scan] Could not parse patch count, defaulting to 0");
    return 0;
  } catch (error) {
    console.error("[Linux Scan] Error parsing output:", error);
    return 0;
  }
}

/**
 * Run Windows patch installation
 * Uses: windows_patch_install.yml
 * CLI Output: "Host 10.10.10.247 | Installed: 5, Remaining: 2, Reboot: true"
 * Generates JSON: /logs/installation_logs/{IP}_windows_patch_report_{timestamp}.json
 */
export async function patchWindowsHost(hostIP, exeName, exeSrcPath) {
  const installCommand = `ansible-playbook -i /home/support/ansible_project/inventory/windows_hosts /home/support/ansible_project/playbooks/windows_patch_install.yml --limit ${hostIP} -e "exe_name='${exeName}' exe_src_path='${exeSrcPath}'"`;
  const logsDir = "/home/support/ansible_project/logs/installation_logs";

  try {
    const installResult = await execPromise(installCommand, SHELL_CONFIG);

    // run verification playbook (authoritative verification)
    const verifyCommand = `ansible-playbook /home/support/ansible_project/playbooks/windows_patch_verify.yml -i /home/support/ansible_project/inventory/windows_hosts -e "target_hosts=${hostIP}"`;
    let verifyResult;
    try {
      verifyResult = await execPromise(verifyCommand, SHELL_CONFIG);
    } catch (err) {
      // capture verify output even on non-zero exit
      verifyResult = err;
    }

    // Ansbile verify playbook writes: {logs_dir}/{inventory_hostname}_verify.json
    const controllerVerifyPath = path.join(logsDir, `${hostIP}_verify.json`);
    const ts = new Date().toISOString().replace(/[:]/g, "-");
    const savedVerifyName = `${hostIP}_windows_patch_report_${ts}.json`;
    const savedVerifyPath = path.join(logsDir, savedVerifyName);

    try {
      await fs.promises.mkdir(logsDir, { recursive: true });

      if (await fileExists(controllerVerifyPath)) {
        // copy controller-generated verify file to timestamped file we use as install log
        await fs.promises.copyFile(controllerVerifyPath, savedVerifyPath);
      } else {
        // fallback: write verifyResult stdout/stderr as JSON
        const stdout = verifyResult?.stdout || "";
        const stderr = verifyResult?.stderr || "";
        let payload;
        try {
          payload = JSON.parse(stdout);
        } catch {
          payload = {
            stdout,
            stderr,
            note: "verify playbook did not emit JSON",
          };
        }
        await fs.promises.writeFile(
          savedVerifyPath,
          JSON.stringify(payload, null, 2),
          "utf-8"
        );
      }
    } catch (writeErr) {
      console.error(
        "[ansibleScanner] Failed to persist verification log:",
        writeErr
      );
    }

    // Run post-install scan to update remaining count
    let scanResult = { patchCount: null, output: "" };
    try {
      scanResult = await scanWindowsHost(hostIP);
    } catch (scanErr) {
      console.warn(
        "[ansibleScanner] Post-install scan failed:",
        scanErr?.message || scanErr
      );
    }

    const summary = parseWindowsPatchSummary(installResult.stdout || "");

    return {
      success: true,
      installSummary: summary,
      installStdout: installResult.stdout,
      installStderr: installResult.stderr,
      verificationLogPath: savedVerifyPath,
      verificationStdout: verifyResult?.stdout || "",
      verificationStderr: verifyResult?.stderr || "",
      postScan: scanResult,
    };
  } catch (error) {
    console.error("[ansibleScanner] patchWindowsHost error:", error);
    throw error;
  }
}

/**
 * Run Linux patch installation
 * Uses: linux_patch_install.yml
 * CLI Output: "Host 10.10.8.253 | Installed: 10, Remaining: 5, Reboot: true"
 * Generates JSON: /logs/installation_logs/{IP}_linux_patch_report_{timestamp}.json
 */
export async function patchLinuxHost(hostIP) {
  const command = `ansible-playbook -i /home/support/ansible_project/inventory/linux_hosts /home/support/ansible_project/playbooks/linux_patch_install.yml --limit ${hostIP}`;

  try {
    console.log(`[Linux Patch] Starting patch installation for ${hostIP}`);
    console.log(`[Linux Patch] Command: ${command}`);
    console.log(
      `[Linux Patch] This may take 15-45 minutes. Host may reboot during process...`
    );

    const { stdout, stderr } = await execPromise(command, {
      ...SHELL_CONFIG,
      maxBuffer: 1024 * 1024 * 100,
      timeout: 3600000,
    });

    console.log(`[Linux Patch] Installation complete for ${hostIP}`);

    const summary = parseLinuxPatchSummary(stdout);
    console.log(`[Linux Patch] Summary for ${hostIP}:`, summary);

    return {
      success: true,
      ...summary,
      output: stdout,
      error: stderr || null,
    };
  } catch (error) {
    console.error(`[Linux Patch] Error for ${hostIP}:`, error);

    if (error.killed && error.signal === "SIGTERM") {
      throw new Error(`Linux patch timed out after 1 hour for ${hostIP}`);
    }

    throw new Error(`Linux patch failed: ${error.message}`);
  }
}

/**
 * Parse Windows patch summary from CLI output
 * Pattern: "Host 10.10.10.247 | Installed: 5, Remaining: 2, Reboot: true"
 */
function parseWindowsPatchSummary(output) {
  try {
    const regex =
      /Installed:\s*(\d+)\s*,\s*Remaining:\s*(\d+)\s*,\s*Reboot:\s*(true|false)/i;
    const match = output.match(regex);

    if (match) {
      return {
        installed: parseInt(match[1], 10),
        remaining: parseInt(match[2], 10),
        reboot: match[3].toLowerCase() === "true",
      };
    }

    console.warn("[Windows Patch] Could not parse summary, using defaults");
    return { installed: 0, remaining: 0, reboot: false };
  } catch (error) {
    console.error("[Windows Patch] Error parsing summary:", error);
    return { installed: 0, remaining: 0, reboot: false };
  }
}

/**
 * Parse Linux patch summary from CLI output
 * Pattern: "Host 10.10.8.253 | Installed: 10, Remaining: 5, Reboot: true"
 */
function parseLinuxPatchSummary(output) {
  try {
    const regex =
      /Installed:\s*(\d+)\s*,\s*Remaining:\s*(\d+)\s*,\s*Reboot:\s*(true|false)/i;
    const match = output.match(regex);

    if (match) {
      return {
        installed: parseInt(match[1], 10),
        remaining: parseInt(match[2], 10),
        reboot: match[3].toLowerCase() === "true",
      };
    }

    console.warn("[Linux Patch] Could not parse summary, using defaults");
    return { installed: 0, remaining: 0, reboot: false };
  } catch (error) {
    console.error("[Linux Patch] Error parsing summary:", error);
    return { installed: 0, remaining: 0, reboot: false };
  }
}

/**
 * Patch host and then run post-patch scan for accurate remaining count
 * This ensures we have the most up-to-date patch count after installation
 */
export async function patchAndScanHost(hostIP, osName) {
  console.log(`[Patch & Scan] Starting full process for ${hostIP} (${osName})`);

  // Step 1: Run patch installation (includes internal before/after scan)
  let patchResult;
  try {
    if (osName === "Windows") {
      patchResult = await patchWindowsHost(hostIP);
    } else if (osName === "Linux") {
      patchResult = await patchLinuxHost(hostIP);
    } else {
      throw new Error(`Unsupported OS type: ${osName}`);
    }
    console.log(`[Patch & Scan] Patch completed for ${hostIP}:`, patchResult);
  } catch (patchError) {
    console.error(`[Patch & Scan] Patch failed for ${hostIP}:`, patchError);
    throw patchError;
  }

  // Step 2: Run post-patch scan for verification
  let scanResult;
  let finalRemaining = patchResult.remaining; // Fallback to patch summary

  try {
    console.log(`[Patch & Scan] Running verification scan for ${hostIP}`);

    if (osName === "Windows") {
      scanResult = await scanWindowsHost(hostIP);
    } else if (osName === "Linux") {
      scanResult = await scanLinuxHost(hostIP);
    }

    finalRemaining = scanResult.patchCount;
    console.log(
      `[Patch & Scan] Verification complete for ${hostIP}. Scan found ${finalRemaining} remaining patches`
    );
  } catch (scanError) {
    console.warn(
      `[Patch & Scan] Verification scan failed for ${hostIP}. Using patch summary count (${finalRemaining}):`,
      scanError.message
    );
    // Don't throw - use patch summary as fallback
  }

  return {
    success: true,
    installed: patchResult.installed,
    remaining: finalRemaining, // Use scan result (or fallback to patch summary)
    reboot: patchResult.reboot,
    patchSummaryRemaining: patchResult.remaining, // Keep original for reference
    scanRemaining: scanResult?.patchCount ?? null, // null if scan failed
    scanSuccess: !!scanResult,
  };
}

/**
 * Main function to scan host based on OS type
 */
export async function scanHost(hostIP, osName) {
  if (osName === "Windows") {
    return await scanWindowsHost(hostIP);
  } else if (osName === "Linux") {
    return await scanLinuxHost(hostIP);
  } else {
    throw new Error(`Unsupported OS type: ${osName}`);
  }
}

export async function patchLinuxHostSelective(hostPackagesMap) {
  // Handle backward compatibility: if called with (hostIP, packageNames)
  if (typeof hostPackagesMap === "string") {
    const hostIP = hostPackagesMap;
    const packageNames = arguments[1];
    hostPackagesMap = { [hostIP]: packageNames };
  }

  const extraVars = {
    target_hosts: Object.keys(hostPackagesMap).join(","),
    host_packages: hostPackagesMap,
  };

  const command = `ansible-playbook /home/support/ansible_project/playbooks/linux_selective_patch4.yml -i /home/support/ansible_project/inventory/linux_hosts -e '${JSON.stringify(
    extraVars
  )}'`;

  try {
    const hostIPs = Object.keys(hostPackagesMap);
    console.log(
      `[Linux Patch Selective] Starting selective patch for ${hostIPs.length} host(s)`
    );
    console.log(`[Linux Patch Selective] Hosts: ${hostIPs.join(", ")}`);
    console.log(
      `[Linux Patch Selective] Host-Package mapping:`,
      hostPackagesMap
    );
    console.log(`[Linux Patch Selective] Command: ${command}`);

    const { stdout, stderr } = await execPromise(command, {
      ...SHELL_CONFIG,
      maxBuffer: 1024 * 1024 * 100,
      timeout: 3600000,
    });

    console.log(
      `[Linux Patch Selective] Installation complete for ${hostIPs.join(", ")}`
    );

    const summary = parseLinuxPatchSummary(stdout);
    console.log(`[Linux Patch Selective] Summary:`, summary);

    return {
      success: true,
      hostCount: hostIPs.length,
      hostPackagesMap,
      ...summary,
      output: stdout,
      error: stderr || null,
    };
  } catch (error) {
    console.error(
      `[Linux Patch Selective] Error for hosts:`,
      Object.keys(hostPackagesMap),
      error
    );
    throw new Error(`Linux selective patch failed: ${error.message}`);
  }
}

export async function patchWindowsHostSelective(hostKbsMap) {
  // Handle backward compatibility: if called with (hostIP, packageNames)
  if (typeof hostKbsMap === "string") {
    const hostIP = hostKbsMap;
    const packageNames = arguments[1];
    hostKbsMap = { [hostIP]: packageNames };
  }

  const extraVars = {
    target_hosts: Object.keys(hostKbsMap).join(","),
    patch_selection: "selective",
    host_kbs: hostKbsMap,
  };

  const command = `ansible-playbook /home/support/ansible_project/playbooks/windows_patch_selective2.yml -i /home/support/ansible_project/inventory/windows_hosts -e '${JSON.stringify(
    extraVars
  )}'`;
  const logsDir = "/home/support/ansible_project/logs/installation_logs";

  try {
    const hostIPs = Object.keys(hostKbsMap);
    console.log(
      `[Windows Patch Selective] Starting selective patch for ${hostIPs.length} host(s)`
    );
    console.log(`[Windows Patch Selective] Hosts: ${hostIPs.join(", ")}`);
    console.log(`[Windows Patch Selective] Host-KB mapping:`, hostKbsMap);
    console.log(`[Windows Patch Selective] Command: ${command}`);

    const installResult = await execPromise(command, {
      ...SHELL_CONFIG,
      maxBuffer: 1024 * 1024 * 100,
      timeout: 3600000,
    });

    console.log(
      `[Windows Patch Selective] Installation complete for ${hostIPs.join(
        ", "
      )}`
    );

    // Verification and post-processing for each host
    const hostResults = [];
    for (const hostIP of hostIPs) {
      try {
        // Verification step
        const verifyCommand = `ansible-playbook /home/support/ansible_project/playbooks/windows_patch_verify.yml -i /home/support/ansible_project/inventory/windows_hosts -e "target_hosts=${hostIP}"`;
        let verifyResult;
        try {
          verifyResult = await execPromise(verifyCommand, SHELL_CONFIG);
        } catch (err) {
          verifyResult = err;
        }

        // Persist verification JSON
        const controllerVerifyPath = path.join(
          logsDir,
          `${hostIP}_verify.json`
        );
        const ts = new Date().toISOString().replace(/[:]/g, "-");
        const savedVerifyName = `${hostIP}_windows_patch_report_${ts}.json`;
        const savedVerifyPath = path.join(logsDir, savedVerifyName);

        try {
          await fs.promises.mkdir(logsDir, { recursive: true });

          if (await fileExists(controllerVerifyPath)) {
            await fs.promises.copyFile(controllerVerifyPath, savedVerifyPath);
          } else {
            const stdout = verifyResult?.stdout || "";
            const stderr = verifyResult?.stderr || "";
            let payload;
            try {
              payload = JSON.parse(stdout);
            } catch {
              payload = {
                stdout,
                stderr,
                note: "verify playbook did not emit JSON",
              };
            }
            await fs.promises.writeFile(
              savedVerifyPath,
              JSON.stringify(payload, null, 2),
              "utf-8"
            );
          }
        } catch (writeErr) {
          console.error(
            `[Windows Patch Selective] Failed to persist verification log for ${hostIP}:`,
            writeErr
          );
        }

        // Post-install scan
        let scanResult = { patchCount: null, output: "" };
        try {
          scanResult = await scanWindowsHost(hostIP);
        } catch (scanErr) {
          console.warn(
            `[Windows Patch Selective] Post-install scan failed for ${hostIP}:`,
            scanErr?.message || scanErr
          );
        }

        hostResults.push({
          hostIP,
          success: true,
          verificationLogPath: savedVerifyPath,
          patchCount: scanResult.patchCount,
        });
      } catch (hostErr) {
        console.error(
          `[Windows Patch Selective] Error processing ${hostIP}:`,
          hostErr
        );
        hostResults.push({
          hostIP,
          success: false,
          error: hostErr.message,
        });
      }
    }

    const summary = parseWindowsPatchSummary(installResult.stdout || "");

    return {
      success: true,
      hostCount: hostIPs.length,
      hostKbsMap,
      installSummary: summary,
      installStdout: installResult.stdout,
      installStderr: installResult.stderr,
      hostResults,
    };
  } catch (error) {
    console.error(
      `[Windows Patch Selective] Error for hosts:`,
      Object.keys(hostKbsMap),
      error
    );
    throw new Error(`Windows selective patch failed: ${error.message}`);
  }
}

async function fileExists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function deployPatchToHosts(hostIPs, patchFile, osType) {
  // Validate inputs
  if (!hostIPs || !Array.isArray(hostIPs) || hostIPs.length === 0) {
    throw new Error("No host IPs provided for deployment");
  }

  if (!patchFile) {
    throw new Error("No patch file specified for deployment");
  }

  // Construct the installer path (absolute path on controller)
  const installerPath = `/home/support/ansible_project/uploadedPatches/${patchFile}`;

  // Join host IPs with commas for --limit parameter
  const hostLimit = hostIPs.join(",");

  // Determine playbook and inventory based on OS type
  let playbookPath;
  let inventoryPath;
  let extraVars;
  let command;

  if (osType === "windows") {
    playbookPath = "playbooks/windows_selective_software3.yml";
    inventoryPath = "inventory/windows_hosts";

    // Validate: Check if ALL hosts exist in Windows inventory
    console.log(`[Deploy Patch] Validating hosts in Windows inventory...`);
    for (const ip of hostIPs) {
      const exists = await checkHostInInventory(inventoryPath, ip);
      if (!exists) {
        throw new Error(
          `Host ${ip} not found in Windows inventory (${inventoryPath}). ` +
            `This host may be a Linux system or not yet added to inventory.`
        );
      }
    }
    console.log(`[Deploy Patch] ✓ All hosts validated in Windows inventory`);

    // Set exe_name and exe_src_path dynamically from patchFile
    const exeName = patchFile;
    const exeSrcPath = `uploadedPatches/${patchFile}`;
    extraVars = `exe_name='${exeName}' exe_src_path='${exeSrcPath}'`;
    command = `ansible-playbook -i ${inventoryPath} ${playbookPath} --limit ${hostLimit} -e \"${extraVars}\"`;
  } else if (osType === "linux") {
    playbookPath = "instal_broswer2.yml";
    inventoryPath = "inventory/linux_hosts";

    // Validate: Check if ALL hosts exist in Linux inventory
    console.log(`[Deploy Patch] Validating hosts in Linux inventory...`);
    for (const ip of hostIPs) {
      const exists = await checkHostInInventory(inventoryPath, ip);
      if (!exists) {
        throw new Error(
          `Host ${ip} not found in Linux inventory (${inventoryPath}). ` +
            `This host may be a Windows system or not yet added to inventory.`
        );
      }
    }
    console.log(`[Deploy Patch] ✓ All hosts validated in Linux inventory`);

    // Determine the variable name based on file extension
    const fileName = patchFile.toLowerCase();
    let varName;

    if (fileName.endsWith(".deb")) {
      varName = "deb_file";
    } else if (fileName.endsWith(".rpm")) {
      varName = "rpm_file";
    } else if (fileName.endsWith(".tar.gz") || fileName.endsWith(".tgz")) {
      varName = "tar_file";
    } else if (fileName.endsWith(".tar.bz2")) {
      varName = "tar_bz2_file";
    } else if (fileName.endsWith(".tar.xz")) {
      varName = "tar_xz_file";
    } else if (fileName.endsWith(".sh")) {
      varName = "script_file";
    } else if (fileName.endsWith(".bin") || fileName.endsWith(".run")) {
      varName = "bin_file";
    } else if (fileName.endsWith(".appimage")) {
      varName = "appimage_file";
    } else {
      varName = "installer_file";
    }

    extraVars = `${varName}=${installerPath}`;
    command = `ansible-playbook -i ${inventoryPath} ${playbookPath} --limit ${hostLimit} -e "${extraVars}"`;
  } else {
    throw new Error(`Invalid OS type: ${osType}. Must be 'windows' or 'linux'`);
  }

  try {
    console.log(
      `[Deploy Patch] Starting deployment to ${hostIPs.length} host(s)`
    );
    console.log(`[Deploy Patch] Target hosts: ${hostLimit}`);
    console.log(`[Deploy Patch] Patch file: ${patchFile}`);
    console.log(`[Deploy Patch] OS type: ${osType}`);
    console.log(
      `[Deploy Patch] Working directory: /home/support/ansible_project`
    );
    console.log(`[Deploy Patch] Command: ${command}`);
    console.log(`[Deploy Patch] This may take several minutes per host...`);

    const { stdout, stderr } = await execPromise(command, {
      cwd: "/home/support/ansible_project",
      ...SHELL_CONFIG,
      maxBuffer: 1024 * 1024 * 10,
      timeout: 1800000,
    });

    console.log(`[Deploy Patch] Deployment command completed`);
    console.log(`[Deploy Patch] Ansible output (first 1000 chars):`);
    console.log(stdout.substring(0, 1000));

    if (stderr) {
      console.log(`[Deploy Patch] Ansible stderr (first 500 chars):`);
      console.log(stderr.substring(0, 500));
    }

    const results = parseDeploymentResults(stdout, hostIPs);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[Deploy Patch] Deployment complete: ${successCount} succeeded, ${failureCount} failed`
    );

    return {
      success: true,
      successCount,
      failureCount,
      results,
      stdout: stdout.substring(0, 2000),
      stderr: stderr ? stderr.substring(0, 1000) : null,
    };
  } catch (error) {
    console.error(`[Deploy Patch] Deployment error:`, error.message);
    console.error(`[Deploy Patch] Error stack:`, error.stack);

    if (error.killed && error.signal === "SIGTERM") {
      throw new Error(`Deployment timed out after 30 minutes`);
    }

    throw new Error(`Deployment failed: ${error.message}`);
  }
}

function parseDeploymentResults(output, hostIPs) {
  const results = [];

  for (const ip of hostIPs) {
    let success = false;
    let message = "Deployment status unknown";
    let error = null;

    // Escape dots in IP for regex
    const escapedIP = ip.replace(/\./g, "\\.");

    const recapRegex = new RegExp(
      `${escapedIP}\\s*:\\s*ok=(\\d+)\\s+changed=(\\d+)\\s+unreachable=(\\d+)\\s+failed=(\\d+)`,
      "i"
    );
    const recapMatch = output.match(recapRegex);

    if (recapMatch) {
      const [, ok, changed, unreachable, failed] = recapMatch;

      if (failed === "0" && unreachable === "0") {
        success = true;
        message =
          changed === "0"
            ? "Patch already installed or no changes needed"
            : `Patch deployed successfully (${changed} change${
                changed === "1" ? "" : "s"
              } applied)`;
      } else if (unreachable !== "0") {
        success = false;
        message = "Host unreachable";
        error = "Unable to connect to host";
      } else {
        success = false;
        message = `Deployment failed (${failed} task${
          failed === "1" ? "" : "s"
        } failed)`;

        // Try to extract detailed error message from task output
        const taskErrorRegex = new RegExp(
          `${escapedIP}[\\s\\S]{0,500}?(?:fatal|failed)[\\s\\S]{0,300}?msg[\"']?:\\s*[\"']?([^\"'\\n]{1,200})`,
          "i"
        );
        const taskError = output.match(taskErrorRegex);
        if (taskError && taskError[1]) {
          error = taskError[1].trim();
        } else {
          error = "Check Ansible logs for detailed error";
        }
      }
    } else if (output.includes(ip) && /UNREACHABLE/i.test(output)) {
      success = false;
      message = "Host unreachable";
      error = "Unable to connect to host";
    } else if (!output.includes(ip)) {
      success = false;
      message = "Host not found in inventory";
      error = "Host IP not present in Ansible inventory or output";
    } else {
      success = false;
      message = "Deployment failed";
      error = "Could not determine deployment status from Ansible output";
    }

    results.push({
      hostIP: ip,
      success,
      message,
      error,
      timestamp: new Date(),
    });
  }

  return results;
}

async function checkHostInInventory(inventoryPath, hostIP) {
  try {
    const fullPath = `/home/support/ansible_project/${inventoryPath}`;
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments, empty lines, and section headers
      if (
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith("[") ||
        !trimmedLine
      ) {
        continue;
      }
      // Check if line starts with the IP
      if (trimmedLine.startsWith(hostIP + " ") || trimmedLine === hostIP) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`[Inventory Check] Error reading ${inventoryPath}:`, error);
    return false;
  }
}
