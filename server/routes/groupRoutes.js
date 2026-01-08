import express from "express";
import {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  deploySelectivePatchesToGroup,
} from "../controllers/groupController.js";

const router = express.Router();

// GET /api/groups - Get all groups
router.get("/", getAllGroups);

// GET /api/groups/:id - Get group by ID
router.get("/:id", getGroupById);

// POST /api/groups - Create new group
router.post("/", createGroup);

// PUT /api/groups/:id - Update group
router.put("/:id", updateGroup);

// DELETE /api/groups/:id - Delete group
router.delete("/:id", deleteGroup);

router.post("/:id/deploy-selective-patches", deploySelectivePatchesToGroup);

export default router;
