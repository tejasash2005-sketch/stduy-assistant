import express from "express";
import Test from "../models/Test.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ ADD THIS (for testing backend)
router.get("/", (req, res) => {
  res.json({ msg: "test works" });
});

// existing route
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