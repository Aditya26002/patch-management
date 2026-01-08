import express from "express";
import {
  getLogs,
  getLogById,
  getLogStats,
  getScanLogsByIP,
  getHostActivityLogs,
  getErrorLogs,
  createErrorLog,
  getGroupLogs, 
} from "../controllers/logController.js";

const router = express.Router();

// Get all logs with filters and pagination
router.get("/", getLogs);

// Get log statistics
router.get("/stats", getLogStats);

// Get scan logs by hostIP
router.get("/scanlogs", getScanLogsByIP);

// NEW
router.get("/host-activity", getHostActivityLogs);
router.get("/errors", getErrorLogs);
// Optional: allow server-to-server or future client to post errors
router.post("/error", createErrorLog);

// Group logs
router.get("/groups", getGroupLogs);

// Get single log by ID and type
router.get("/:type/:id", getLogById);

export default router;
