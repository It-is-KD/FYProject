import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    console.error("Token missing in cookies");
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    console.log("Token from cookies:", token);
    console.log("JWT_SECRET in middleware:", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token payload:", decoded);

    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      console.error("User not found for decoded ID:", decoded.id);
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    console.log("Authenticated user:", req.user);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
