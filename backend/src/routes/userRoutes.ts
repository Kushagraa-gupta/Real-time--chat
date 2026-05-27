import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { searchUsers, updateProfile, handleFileUpload } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${uniqueSuffix}-${cleanFileName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

router.get('/', authenticate as any, searchUsers as any);
router.put('/profile', authenticate as any, updateProfile as any);
router.post('/upload', authenticate as any, upload.single('file'), handleFileUpload as any);

export default router;
