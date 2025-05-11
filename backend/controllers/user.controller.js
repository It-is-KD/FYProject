import Photo from "../models/photo.model.js";

export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      username: user.username,
      email: user.email,
      profileImage: user.profilePicUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    user.username = username || user.username;
    user.email = email || user.email;    
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const uploadProfileImage = async (req, res) => { 
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadedImage = await cloudinary.v2.uploader.upload(req.file.path, {
      folder: "profile_images",
      public_id: user._id.toString(),
    });
    user.profilePicUrl = uploadedImage.secure_url;
    user.profilePicPublicId = uploadedImage.public_id;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePicUrl: user.profilePicUrl,
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    res.status(500).json({ message: "Server error while updating profile image" });
  }
};
    

export const getUserUploadHistory = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetching reference images
    const referenceImages = await Photo.find({ userId: user._id, imageType: 'reference' }).sort({ createdAt: -1 });

    // Fetching pool images
    const poolImages = await Photo.find({ userId: user._id, imageType: 'pool' }).sort({ createdAt: -1 });

    res.status(200).json({
      totalReferences: referenceImages.length,
      totalPools: poolImages.length,
      referenceImages,
      poolImages,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching upload history" });
  }
};
