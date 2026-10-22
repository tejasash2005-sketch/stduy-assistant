
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: String,
  score: Number,
  total: Number
});

export default mongoose.model("Test", schema);
