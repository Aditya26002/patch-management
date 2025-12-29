import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not set in .env");
  }
  try {
    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("? MongoDB connected");
  } catch (err) {
    console.error("? MongoDB connection error:", err.message);
    process.exit(1);
  }
}
