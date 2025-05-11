import express from 'express';
import { getUserProfile, getUserUploadHistory, uploadProfileImage, updateUserProfile } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload  from '../middleware/multer.middleware.js'; // Assuming you have a multer middleware for handling file uploads

const router = express.Router();

// Protected routes
router.get('/profile', protect, getUserProfile);
router.get('/history', protect, getUserUploadHistory); 
router.patch('/update-profile', protect, updateUserProfile);
router.put('/profile-image', protect, upload.single('image'), uploadProfileImage);

export default router;
