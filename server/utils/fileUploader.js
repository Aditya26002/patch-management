import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a temp folder for initial writes, then move in controller
const tempDir = path.join(__dirname, '../.tmpUploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Windows formats: .exe, .msi, .wsi
  // Linux formats: .deb, .rpm, .tar.gz, .tar.bz2, .tar.xz, .sh
  const allowed = [
    '.exe',      // Windows executable
    '.msi',      // Windows installer
    '.wsi',      // Windows installer
    '.deb',      // Debian/Ubuntu package
    '.rpm',      // RedHat/CentOS/Fedora package
    '.tar.gz',   // Compressed tarball
    '.tgz',      // Compressed tarball (short)
    '.tar.bz2',  // Compressed tarball
    '.tar.xz',   // Compressed tarball
    '.sh',       // Shell script installer
    '.bin',      // Binary installer
    '.run',      // Binary installer (NVIDIA, etc.)
    '.AppImage', // Linux AppImage
  ];

  const filename = file.originalname.toLowerCase();
  
  // Check for compound extensions like .tar.gz
  const hasCompoundExt = allowed.some(ext => filename.endsWith(ext.toLowerCase()));
  
  // Check for simple extension
  const ext = path.extname(filename).toLowerCase();
  const hasSimpleExt = allowed.includes(ext);

  if (hasCompoundExt || hasSimpleExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed formats:\n` +
        `Windows: .exe, .msi, .wsi\n` +
        `Linux: .deb, .rpm, .tar.gz, .tgz, .tar.bz2, .tar.xz, .sh, .bin, .run, .AppImage`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB (increased for Linux packages)
});

export const uploadPatchFile = upload.single('patchFile');
export default upload;