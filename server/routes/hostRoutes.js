import express from "express";
import {
  addHost,
  listHosts,
  patchHost,
  deploySelectivePatches,
  bulkPatchHosts,
  scanHostAfterPatch,
  deleteHost,
} from "../controllers/hostController.js";
import { validateHost } from "../middleware/validation.js";

const router = express.Router();

router.get("/", listHosts);
router.post("/", validateHost, addHost);
router.post("/:id/patch", patchHost);
router.post("/:id/deploy-patches", deploySelectivePatches);
router.post("/:id/scanafterpatchdeployed", scanHostAfterPatch); // NEW
router.post("/bulk-patch", bulkPatchHosts);
router.delete("/:id", deleteHost);

export default router;
