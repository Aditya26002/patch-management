import Patch from "../models/Patch.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { deployPatchToHosts } from "../utils/ansibleScanner.js";
import { ErrorLog } from "../models/ErrorLog.js";
import SelectiveApplicationInstallLog from "../models/SelectiveApplicationInstallLog.js";
import { PatchDeleteLog } from "../models/PatchDeleteLog.js";
import { PatchAddLog } from "../models/PatchAddLog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute target dir
const TARGET_UPLOAD_DIR = "/home/support/ansible_project/uploadedPatches";
if (!fs.existsSync(TARGET_UPLOAD_DIR)) {
  fs.mkdirSync(TARGET_UPLOAD_DIR, { recursive: true });
}

export const getAllPatches = async (req, res) => {
  try {
    const patches = await Patch.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, data: patches, count: patches.length });
  } catch (error) {
    console.error("Error fetching patches:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patches" });
  }
};

export const addPatch = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No patch file uploaded" });
    }

    const {
      patchId,
      patchName,
      description,
      severity,
      category,
      affectedOS,
      applicableOS,
      size,
      overwriteExisting,
      uploadedBy,
      releaseDate,
    } = req.body;

    // Check for duplicate patch ID
    const existingPatchById = await Patch.findOne({ patchId });
    if (existingPatchById) {
      // Clean up uploaded temp file
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        error: `Patch ID "${patchId}" already exists. Please use a unique Patch ID.`,
      });
    }

    // Check for duplicate patch name
    const existingPatchByName = await Patch.findOne({ name: patchName });
    if (existingPatchByName) {
      // Clean up uploaded temp file
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        error: `Patch Name "${patchName}" already exists. Please use a unique Patch Name.`,
      });
    }

    // Check for duplicate file name
    const existingPatchByFile = await Patch.findOne({ fileName: req.file.originalname });
    if (existingPatchByFile) {
      // Clean up uploaded temp file
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        error: `A patch with filename "${req.file.originalname}" already exists. Please rename the file or use a different file.`,
      });
    }

    const existingPatch = await Patch.findOne({ patchId });
    if (existingPatch) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(409).json({
        success: false,
        error: "PATCH_ID_EXISTS",
        message: `Patch with ID ${patchId} already exists`,
      });
    }

    const originalName = req.file.originalname.replace(/^\d+_/, "");
    const targetPath = path.join(TARGET_UPLOAD_DIR, originalName);

    if (fs.existsSync(targetPath) && overwriteExisting !== "true") {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(409).json({
        success: false,
        error: "FILE_EXISTS",
        filename: originalName,
      });
    }

    if (fs.existsSync(targetPath) && overwriteExisting === "true") {
      fs.unlinkSync(targetPath);
    }

    fs.renameSync(req.file.path, targetPath);

    let affectedOSArray = [];
    if (affectedOS) {
      try {
        affectedOSArray = Array.isArray(affectedOS)
          ? affectedOS
          : JSON.parse(affectedOS);
      } catch {
        affectedOSArray = [affectedOS];
      }
    } else if (applicableOS) {
      affectedOSArray = Array.isArray(applicableOS)
        ? applicableOS
        : [applicableOS];
    }

    // Calculate file size from uploaded file
    const fileSizeInBytes = req.file.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    const fileSize = `${fileSizeInMB} MB`;

    const uploadHistoryEntry = {
      uploadedAt: new Date(),
      uploadedBy: uploadedBy || "Admin",
      fileName: originalName,
      fileSize: fileSize,
      status: "success",
    };

    const newPatch = new Patch({
      patchId,
      name: patchName,
      description,
      severity,
      category,
      affectedOS: affectedOSArray,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      size: fileSize,
      filePath: `/uploadedPatches/${originalName}`,
      fileName: originalName,
      uploadHistory: [uploadHistoryEntry],
    });

    await newPatch.save();

    // Create patch addition log
    await PatchAddLog.create({
      patchId,
      patchName,
      fileName: originalName,
      affectedOS: affectedOSArray,
      category,
      severity,
      size: fileSize,
      performedBy: uploadedBy || "Admin",
      timestamp: new Date(),
      type: "patch_added",
    });

    console.log(`? Patch "${patchId}" added successfully by ${uploadedBy || "Admin"}`);

    res.status(201).json({
      success: true,
      message: `Patch ${patchId} added successfully`,
      data: newPatch,
    });
  } catch (error) {
    console.error("Error adding patch:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    res
      .status(500)
      .json({ success: false, error: error.message || "Failed to add patch" });
  }
};

export const getPatchById = async (req, res) => {
  try {
    const patch = await Patch.findById(req.params.id);
    if (!patch)
      return res.status(404).json({ success: false, error: "Patch not found" });
    res.status(200).json({ success: true, data: patch });
  } catch (error) {
    console.error("Error fetching patch:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patch" });
  }
};

export const installPatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostIds } = req.body;
    if (!hostIds || hostIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No host IDs provided" });
    }
    const patch = await Patch.findById(id);
    if (!patch)
      return res.status(404).json({ success: false, error: "Patch not found" });

    const newInstallations = hostIds.map((hostId) => ({
      hostId,
      installedAt: new Date(),
      status: "success",
    }));
    const existingHostIds = patch.installedOnHosts.map((h) =>
      h.hostId.toString()
    );
    const uniqueInstallations = newInstallations.filter(
      (i) => !existingHostIds.includes(i.hostId)
    );
    patch.installedOnHosts.push(...uniqueInstallations);
    await patch.save();

    res.status(200).json({
      success: true,
      message: `Patch deployed to ${uniqueInstallations.length} host(s)`,
      data: patch,
    });
  } catch (error) {
    console.error("Error installing patch:", error);
    res.status(500).json({ success: false, error: "Failed to install patch" });
  }
};

export const updatePatch = async (req, res) => {
  try {
    const patch = await Patch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!patch)
      return res.status(404).json({ success: false, error: "Patch not found" });
    res.status(200).json({ success: true, data: patch });
  } catch (error) {
    console.error("Error updating patch:", error);
    res.status(500).json({ success: false, error: "Failed to update patch" });
  }
};

export const deletePatch = async (req, res) => {
  try {
    const patch = await Patch.findById(req.params.id);
    if (!patch)
      return res.status(404).json({ success: false, error: "Patch not found" });

    // Get user info from request body or default to Admin
    const performedBy = req.body?.performedBy || "Admin";

    // Delete file from file system
    const filePathAbs = path.join(TARGET_UPLOAD_DIR, patch.fileName);
    let fileDeleted = false;
    if (fs.existsSync(filePathAbs)) {
      try {
        fs.unlinkSync(filePathAbs);
        fileDeleted = true;
        console.log(`? Deleted file: ${filePathAbs}`);
      } catch (err) {
        console.error(`? Failed to delete file: ${filePathAbs}`, err);
      }
    }

    // Create deletion log before deleting from database
    await PatchDeleteLog.create({
      patchId: patch.patchId,
      patchName: patch.name,
      fileName: patch.fileName,
      affectedOS: patch.affectedOS,
      category: patch.category,
      severity: patch.severity,
      performedBy: performedBy,
      timestamp: new Date(),
      type: "patch_deleted",
    });

    // Delete from database
    await Patch.findByIdAndDelete(req.params.id);

    console.log(`? Patch "${patch.patchId}" deleted successfully by ${performedBy}`);

    res.status(200).json({
      success: true,
      message: "Patch deleted successfully",
      data: {
        patchId: patch.patchId,
        patchName: patch.name,
        fileDeleted,
      },
    });
  } catch (error) {
    console.error("Error deleting patch:", error);
    res.status(500).json({ success: false, error: "Failed to delete patch" });
  }
};

export const deployToSelectedHosts = async (req, res) => {
  try {
    const { patchId, patchName, patchFile, hostIPs, osType, performedBy } =
      req.body;

    console.log("=== DEPLOYMENT REQUEST ===");
    console.log("Patch ID:", patchId);
    console.log("Patch Name:", patchName);
    console.log("Patch File:", patchFile);
    console.log("Target Hosts:", hostIPs);
    console.log("OS Type:", osType);
    console.log("========================");

    if (
      !patchId ||
      !patchName ||
      !patchFile ||
      !hostIPs ||
      !Array.isArray(hostIPs)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: patchId, patchName, patchFile, hostIPs",
      });
    }

    if (hostIPs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hosts selected for deployment",
      });
    }

    if (!osType || !["windows", "linux"].includes(osType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid OS type. Must be 'windows' or 'linux'",
      });
    }

    const deploymentResult = await deployPatchToHosts(
      hostIPs,
      patchFile,
      osType.toLowerCase()
    );

    // Save a SelectiveApplicationInstallLog (aggregate)
    const selLog = await SelectiveApplicationInstallLog.create({
      patchId,
      patchName,
      hostIPs,
      results: deploymentResult.results || [],
      successCount: deploymentResult.successCount || 0,
      failureCount: deploymentResult.failureCount || 0,
    });

    // Per-host error logs
    if (deploymentResult.results?.length) {
      for (const r of deploymentResult.results) {
        if (!r.success) {
          await ErrorLog.create({
            operation:
              hostIPs.length > 1 ? "bulk_deploy_patch" : "deploy_patch",
            hostIP: r.hostIP,
            patchId,
            performedBy: performedBy || "Admin",
            errorMessage: r.error || r.message || "Deployment failed",
            stdout: r.stdout,
            stderr: r.stderr,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Deployment completed",
      data: deploymentResult,
      logId: selLog._id,
    });
  } catch (error) {
    console.error("Error deploying to selected hosts:", error);
    await ErrorLog.create({
      operation: "deploy_patch",
      patchId: req.body?.patchId,
      performedBy: req.body?.performedBy || "Admin",
      errorMessage: error.message || "Deployment failed",
      errorStack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to deploy patch",
    });
  }
};
