import express from 'express';
import {
  getAllPatches,
  addPatch,
  getPatchById,
  installPatch,
  updatePatch,
  deletePatch,
  deployToSelectedHosts
} from '../controllers/patchController.js';
import { uploadPatchFile } from '../utils/fileUploader.js';

const router = express.Router();

// Get all patches
router.get('/', getAllPatches);

// Add new patch with file upload
router.post('/', uploadPatchFile, addPatch);

// Get patch by ID
router.get('/:id', getPatchById);

// Install patch on hosts
router.post('/:id/install', installPatch);

// Route for selective deployment
router.post('/selectedApplicationDeployed', deployToSelectedHosts);

// Update patch
router.put('/:id', updatePatch);

// Delete patch
router.delete('/:id', deletePatch);

export default router;