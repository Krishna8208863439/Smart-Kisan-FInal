import mongoose from "mongoose";

global.useMemoryDB = false;

// Disable Mongoose command buffering to prevent hanging queries on connection failures
mongoose.set("bufferCommands", false);

export const connectDB = async () => {
  try {
    // Attempt connecting to mongoose with a fast timeout (3 seconds)
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed. Falling back to local file-based database (db_fallback.json)...");
    global.useMemoryDB = true;
  }
};

