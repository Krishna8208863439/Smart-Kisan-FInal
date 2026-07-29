import mongoose from "mongoose";
import { UserMock } from "../config/memoryDb.js";


/**
 * User Schema — Smart Kisan
 * Supports: Email/Password, Google OAuth, Phone OTP
 * Roles: farmer | expert | admin | govt_officer | seller | buyer | merchant
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"]
    },

    password: {
      type: String,
      minlength: 6,
      select: false // never returned in queries by default
    },
    role: {
      type: String,
      enum: ["farmer", "expert", "admin", "govt_officer", "seller", "buyer", "merchant"],
      default: "farmer"
    },

    // ── Email verification ──
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // ── Phone OTP ──
    phoneVerified: { type: Boolean, default: false },
    phoneOtp: { type: String, select: false },
    phoneOtpExpires: { type: Date, select: false },

    // ── OAuth ──
    googleId: { type: String, sparse: true },


    // ── Multi-device refresh token rotation ──
    // Each entry: { token: <hashed>, device: <string>, createdAt: <Date> }
    refreshTokens: {
      type: [
        {
          token: { type: String, required: true },
          device: { type: String, default: "unknown" },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      select: false,
      default: []
    },

    // ── Profile & Location ──
    avatar: String,
    location: {
      state: String,
      district: String,
      village: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },

    // ── Account state ──
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerifyToken;
        delete ret.phoneOtp;
        return ret;
      }
    }
  }
);

// ── Compound Indexes ──
userSchema.index({ role: 1, "location.state": 1 });
userSchema.index({ createdAt: -1 });


const UserModel = mongoose.model("User", userSchema);

// Proxy: route to UserMock when MongoDB is unavailable (fallback mode)
// Note: Must bind correctly so UserMock methods are called as standalone functions
const User = new Proxy(UserModel, {
  get(target, prop, receiver) {
    if (global.useMemoryDB && prop in UserMock) {
      const mockProp = UserMock[prop];
      // If it's a function, return it bound to UserMock so `this` context is correct
      return typeof mockProp === "function" ? mockProp.bind(UserMock) : mockProp;
    }
    // For non-function properties (like prototype, schema), return from target
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return value.bind(target);
    }
    return value;
  }
});

export default User;

