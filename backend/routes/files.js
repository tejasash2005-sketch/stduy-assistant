
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
