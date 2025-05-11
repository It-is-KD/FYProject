import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import {connectDB} from './lib/db.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js'; 
import uploadRoutes from './routes/upload.routes.js';
import resultRoutes from './routes/result.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log("JWT_SECRET from .env in server.js:", process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the .env file");
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:5173", // Allow requests from the frontend (localhost:5173)
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  credentials: true, // Allow cookies to be sent if needed
}));


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes) ;
app.use("/api/results", resultRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});