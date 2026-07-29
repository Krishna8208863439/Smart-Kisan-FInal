import mongoose from "mongoose";

/**
 * Notification Schema — Smart Kisan
 * Stores all FCM push notifications sent to users.
 * Supports: targeted (userId) + broadcast (userId = null)
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,  // null = broadcast to all
      index: true
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: [
        "weather_alert",
        "disease_outbreak",
        "scheme_deadline",
        "order_update",
        "market_price",
        "expert_reply",
        "system"
      ],
      default: "system"
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    fcmMessageId: String,
    isRead: { type: Boolean, default: false },
    isBroadcast: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, sentAt: -1 });
notificationSchema.index({ type: 1, sentAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
