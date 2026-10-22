
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

export default mongoose.model("User", schema);
