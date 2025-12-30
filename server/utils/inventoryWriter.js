import fs from "fs/promises";
import path from "path";

const INVENTORY_BASE_PATH = "/home/support/ansible_project/inventory";
const WINDOWS_HOSTS_FILE = path.join(INVENTORY_BASE_PATH, "windows_hosts");
const LINUX_HOSTS_FILE = path.join(INVENTORY_BASE_PATH, "linux_hosts");

/**
 * Check if IP already exists in inventory file
 */
async function checkDuplicateIP(filePath, ip) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments and empty lines
      if (
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith("[") ||
        !trimmedLine
      ) {
        continue;
      }
      // Check if line starts with the IP
      if (trimmedLine.startsWith(ip + " ") || trimmedLine === ip) {
        return true;
      }
    }
    return false;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false; // File doesn't exist, so no duplicate
    }
    throw error;
  }
}

/**
 * Add Windows host to inventory
 */
export async function addWindowsHost(ip, username, password) {
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateIP(WINDOWS_HOSTS_FILE, ip);
    if (isDuplicate) {
      throw new Error(`IP ${ip} already exists in Windows inventory`);
    }

    const entry = `${ip} ansible_user='${username}' ansible_password='${password}' ansible_connection='winrm' ansible_winrm_transport='ntlm' ansible_winrm_scheme='http' ansible_port='5985' ansible_winrm_server_cert_validation='ignore'\n`;

    // Read current content
    let content = "";
    try {
      content = await fs.readFile(WINDOWS_HOSTS_FILE, "utf-8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // File doesn't exist, create with [windows] section
      content = "[windows]\n";
    }

    // Find [windows] section and add entry after it
    const lines = content.split("\n");
    let insertIndex = -1;
    let inWindowsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "[windows]") {
        inWindowsSection = true;
        insertIndex = i + 1;
        continue;
      }

      // If we hit another section header while in windows section, insert before it
      if (inWindowsSection && line.startsWith("[") && line !== "[windows]") {
        insertIndex = i;
        break;
      }
    }

    // If [windows] section not found, add it at the beginning
    if (insertIndex === -1) {
      content = `[windows]\n${entry}\n${content}`;
    } else {
      lines.splice(insertIndex, 0, entry.trim());
      content = lines.join("\n");
    }

    // Write back to file
    await fs.writeFile(WINDOWS_HOSTS_FILE, content, "utf-8");

    return {
      success: true,
      message: `Windows host ${ip} added to inventory`,
      file: WINDOWS_HOSTS_FILE,
    };
  } catch (error) {
    console.error("Error adding Windows host to inventory:", error);
    throw error;
  }
}

/**
 * Add Linux host to inventory (UPDATED - Simplified structure)
 */
export async function addLinuxHost(ip, username, password) {
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateIP(LINUX_HOSTS_FILE, ip);
    if (isDuplicate) {
      throw new Error(`IP ${ip} already exists in Linux inventory`);
    }

    // Format: IP ansible_user=USER ansible_password=PASS ansible_connection=ssh ansible_become=yes ansible_become_pass=PASS
    const entry = `${ip} ansible_user=${username} ansible_password=${password} ansible_become_pass=${password} ansible_connection=ssh ansible_become=yes ansible_become_method=sudo\n`;

    // Read current content
    let content = "";
    try {
      content = await fs.readFile(LINUX_HOSTS_FILE, "utf-8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // File doesn't exist, create with basic [linux] section only
      content = "[linux]\n";
    }

    const lines = content.split("\n");
    let insertIndex = -1;
    let inLinuxSection = false;

    // Find insertion point for [linux] section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "[linux]") {
        inLinuxSection = true;
        insertIndex = i + 1;
        continue;
      }

      // If we hit another section header while in [linux], insert before it
      if (inLinuxSection && line.startsWith("[") && line !== "[linux]") {
        insertIndex = i;
        break;
      }
    }

    // If [linux] section not found, create it at the beginning
    if (insertIndex === -1) {
      content = `[linux]\n${entry}\n${content}`;
    } else {
      lines.splice(insertIndex, 0, entry.trim());
      content = lines.join("\n");
    }

    // Write back to file
    await fs.writeFile(LINUX_HOSTS_FILE, content, "utf-8");

    return {
      success: true,
      message: `Linux host ${ip} added to inventory`,
      file: LINUX_HOSTS_FILE,
    };
  } catch (error) {
    console.error("Error adding Linux host to inventory:", error);
    throw error;
  }
}

/**
 * Remove host from inventory file
 */
export async function removeHostFromInventory(ip, osName) {
  try {
    const inventoryFile =
      osName === "Windows" ? WINDOWS_HOSTS_FILE : LINUX_HOSTS_FILE;

    console.log(
      `[Inventory Writer] Removing ${ip} from ${
        osName === "Windows" ? "Windows" : "Linux"
      } inventory`
    );

    // Read current content
    let content = "";
    try {
      content = await fs.readFile(inventoryFile, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(
          `[Inventory Writer] Inventory file not found: ${inventoryFile}`
        );
        return {
          success: true,
          message: "Inventory file not found, nothing to remove",
        };
      }
      throw error;
    }

    // Split into lines and filter out the host entry
    const lines = content.split("\n");
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      // Keep comments, section headers, and empty lines
      if (
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith("[") ||
        !trimmedLine
      ) {
        return true;
      }
      // Filter out lines starting with the IP
      return !(trimmedLine.startsWith(ip + " ") || trimmedLine === ip);
    });

    // Write back to file
    await fs.writeFile(inventoryFile, filteredLines.join("\n"), "utf-8");

    console.log(`[Inventory Writer] Successfully removed ${ip} from inventory`);

    return {
      success: true,
      message: `Host ${ip} removed from ${osName} inventory`,
      file: inventoryFile,
    };
  } catch (error) {
    console.error("[Inventory Writer] Error removing host:", error);
    throw error;
  }
}
