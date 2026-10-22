
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: String,
  name: String,
  path: String,
  size: Number
});

export default mongoose.model("File", schema);
