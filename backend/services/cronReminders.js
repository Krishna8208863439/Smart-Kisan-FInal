/**
 * Smart Kisan — Cron Reminder Service (Phase 2 + Phase 3)
 * Scheduled jobs: task reminders, harvest reminders, fertilizer reminders
 * Runs on server startup (imported by server.js)
 * Notifies via: console log + in-memory notification store (nodemailer if EMAIL vars set)
 */
import cron from "node-cron";
import nodemailer from "nodemailer";
import CropCalendar from "../models/CropCalendar.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ── Email transport (optional — graceful fallback if not configured) ───────
let transporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log("[cron] Email reminders configured via", process.env.EMAIL_SERVICE || "gmail");
  } else {
    console.log("[cron] EMAIL_USER / EMAIL_PASS not set — email reminders disabled. Notifications stored in DB only.");
  }
} catch (e) {
  console.warn("[cron] Email setup failed:", e.message);
}

async function sendReminder(userId, subject, bodyText) {
  // 1. Always store in Notification collection
  try {
    await Notification.create({
      user: userId,
      type: "reminder",
      title: subject,
      message: bodyText,
      read: false
    });
  } catch (e) {
    console.warn("[cron] Notification store failed:", e.message);
  }

  // 2. Email if configured
  if (!transporter) return;
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;
    await transporter.sendMail({
      from: `"Smart Kisan 🌾" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject,
      text: bodyText,
      html: `<div style="font-family:sans-serif;padding:20px;background:#f0fdf4;border-radius:8px">
        <h2 style="color:#15803d">🌾 Smart Kisan Reminder</h2>
        <p>${bodyText}</p>
        <p style="color:#666;font-size:12px">Visit <a href="https://krishna3114.pythonanywhere.com">Smart Kisan</a> for details.</p>
      </div>`
    });
    console.log(`[cron] Email reminder sent to ${user.email}: ${subject}`);
  } catch (e) {
    console.warn("[cron] Email send failed:", e.message);
  }
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ── Main reminder job: runs daily at 7:00 AM IST (01:30 UTC) ──────────────
async function runDailyReminders() {
  console.log("[cron] Running daily reminder check...");
  try {
    const calendars = await CropCalendar.find({});
    let totalSent = 0;

    for (const cal of calendars) {
      if (!cal.tasks || !cal.tasks.length) continue;

      for (const task of cal.tasks) {
        if (task.completed) continue;

        const days = daysUntil(task.date || task.dueDate);

        // Task reminder: 1 day before
        if (days === 1) {
          await sendReminder(
            cal.user,
            `📋 Tomorrow: ${task.title}`,
            `Your farm task "${task.title}" is scheduled for tomorrow (${task.date || task.dueDate}). Crop: ${cal.cropName || "N/A"} | Priority: ${task.priority || "Normal"}`
          );
          totalSent++;
        }

        // Harvest reminder: 3 days before harvest tasks
        if (days === 3 && task.type === "harvest") {
          await sendReminder(
            cal.user,
            `🌾 Harvest in 3 Days: ${cal.cropName || task.title}`,
            `Your harvest is scheduled in 3 days. Task: "${task.title}". Make sure your equipment and storage are ready.`
          );
          totalSent++;
        }

        // Fertilizer reminder: 2 days before fertilizer tasks
        if (days === 2 && task.type === "fertilizer") {
          await sendReminder(
            cal.user,
            `🧪 Fertilizer Application in 2 Days`,
            `Scheduled fertilizer application in 2 days: "${task.title}". Check soil moisture before applying.`
          );
          totalSent++;
        }

        // Overdue reminder: tasks past due not completed
        if (days < 0 && days >= -1) {
          await sendReminder(
            cal.user,
            `⚠️ Overdue Task: ${task.title}`,
            `The task "${task.title}" was due on ${task.date || task.dueDate} and is not yet marked complete. Please review.`
          );
          totalSent++;
        }
      }
    }

    console.log(`[cron] Daily reminders sent: ${totalSent}`);
  } catch (err) {
    console.error("[cron] Daily reminder job error:", err.message);
  }
}

// ── Cron scheduler ────────────────────────────────────────────────────────
export function startCronJobs() {
  // Daily at 7:00 AM IST = 01:30 UTC
  cron.schedule("30 1 * * *", runDailyReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Also check every 6 hours for real-time responsiveness
  cron.schedule("0 */6 * * *", runDailyReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log("[cron] Smart Kisan reminder service started (daily 7:00 AM IST + every 6h)");
}
