import mongoose from "mongoose";

global.useMemoryDB = false;

// Disable Mongoose command buffering to prevent hanging queries on connection failures
mongoose.set("bufferCommands", false);

export const connectDB = async () => {
  try {
    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_kisan";
    const mongoUri = rawUri.replace("localhost", "127.0.0.1");
    // Attempt connecting to mongoose with a fast timeout (1.5 seconds)
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed. Falling back to local file-based database (db_fallback.json)...");
    global.useMemoryDB = true;
  }
};

