import mongoose from "mongoose";

/**
 * AuditLog Schema — Smart Kisan
 * Immutable trail of important actions for admin auditing.
 * Never deleted — only read by Admin RBAC role.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    userEmail: String,  // denormalized for fast read without join
    userRole: String,
    action: {
      type: String,
      required: true,
      // e.g. "USER_LOGIN", "USER_REGISTER", "DISEASE_DETECT", "PRODUCT_CREATE"
      index: true
    },
    resource: String,   // e.g. "user", "farm", "product", "order"
    resourceId: String, // ObjectId as string
    method: String,     // HTTP method
    path: String,       // Request path
    ip: String,
    userAgent: String,
    status: { type: Number },  // HTTP response status
    durationMs: Number,        // Request duration
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false, // use custom `timestamp` field
    // Prevent modifications to audit records
    strict: true
  }
);

// Index for admin queries
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
