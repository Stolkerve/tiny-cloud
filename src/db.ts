import mongoose from "mongoose";

const DB_NAME = "tiny_cloud";
const URL = `mongodb://localhost/${DB_NAME}`;

export const connectDB = async () => {
  await mongoose.connect(URL);
  console.log("MongoDB connected");
};
