import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import testRoutes from "./routes/test.js";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// debug logger (optional but useful)
app.use((req, res, next) => {
  console.log("🌐 Request:", req.method, req.url);
  next();
});

// routes
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/test", testRoutes);

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});