import express from "express";
import {
  createScheduledTask,
  getScheduledTasks,
  getScheduledTaskById,
  cancelScheduledTask,
  deleteScheduledTask,
  getScheduleLogs,
} from "../controllers/schedulerController.js";

const router = express.Router();

// Create a new scheduled task
router.post("/schedule", createScheduledTask);

// Get all scheduled tasks
router.get("/tasks", getScheduledTasks);

// Get single scheduled task
router.get("/tasks/:id", getScheduledTaskById);

// Cancel a scheduled task
router.put("/tasks/:id/cancel", cancelScheduledTask);

// Delete a scheduled task
router.delete("/tasks/:id", deleteScheduledTask);

// Get schedule logs
router.get("/logs", getScheduleLogs);

export default router;
