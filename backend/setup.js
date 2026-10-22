import fs from "fs";
import path from "path";

const write = (file, content) => {
  const dir = path.dirname(file);

  // only create folder if it's not root
  if (dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(file, content);
};

// server.js
write("server.js", `
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import fileRoutes from "./routes/files.js";
import testRoutes from "./routes/test.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/test", testRoutes);

app.listen(5000, () => console.log("🚀 Server running"));
`);

// db
write("config/db.js", `
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err);
  }
};
`);

// models
write("models/User.js", `
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

export default mongoose.model("User", schema);
`);

write("models/File.js", `
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: String,
  name: String,
  path: String,
  size: Number
});

export default mongoose.model("File", schema);
`);

write("models/Test.js", `
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: String,
  score: Number,
  total: Number
});

export default mongoose.model("Test", schema);
`);

// middleware
write("middleware/authMiddleware.js", `
import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};
`);

// auth route
write("routes/auth.js", `
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  res.json(user);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ msg: "Wrong password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

export default router;
`);

// ai route
write("routes/ai.js", `
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message, system } = req.body;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await r.json();
    const text = data.content?.map(b => b.text).join("") || "";

    res.json({ reply: text });

  } catch {
    res.status(500).json({ msg: "AI error" });
  }
});

export default router;
`);

// files
write("routes/files.js", `
import express from "express";
import multer from "multer";
import File from "../models/File.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  const file = await File.create({
    userId: req.user.id,
    name: req.file.originalname,
    path: req.file.path,
    size: req.file.size
  });

  res.json(file);
});

router.get("/", auth, async (req, res) => {
  const files = await File.find({ userId: req.user.id });
  res.json(files);
});

export default router;
`);

// test
write("routes/test.js", `
import express from "express";
import Test from "../models/Test.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/submit", auth, async (req, res) => {
  const { score, total } = req.body;

  const test = await Test.create({
    userId: req.user.id,
    score,
    total
  });

  res.json(test);
});

export default router;
`);

// env
write(".env", `
MONGO_URI=your_mongodb_uri
JWT_SECRET=supersecret
CLAUDE_API_KEY=your_key
`);

console.log("✅ Backend created successfully!");