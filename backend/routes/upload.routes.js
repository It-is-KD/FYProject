import express from 'express';
import multer from 'multer'; 
import { uploadReferenceImage, uploadPoolImages } from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.middleware.js';// Assuming you have a multer middleware for file validation

const router = express.Router();

// Multer configuration (in-memory storage)
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

// Route to upload reference image (single file upload)
router.post('/reference', protect, upload.single('file'), uploadReferenceImage);

// Route to upload pool images (multiple files upload)
router.post('/pool', protect, upload.array('files', 10), uploadPoolImages);

export default router;
