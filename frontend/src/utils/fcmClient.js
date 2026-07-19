// frontend/src/utils/fcmClient.js
import axios from "axios";

const API_URL = import.meta.env.VITE_PY_API_URL || "/pyapi";

/**
 * Requests browser permission for showing high-priority alerts
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }
  if (Notification.permission === "granted") return true;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

/**
 * Subscribes to regional push topics (e.g. outbreak_pune, outbreak_nashik)
 */
export const subscribeToTopic = async (topic) => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    throw new Error("Notification permission denied");
  }

  // Standardized topic naming e.g., outbreak_pune
  const cleanTopicName = topic.trim().toLowerCase().replace(/[\s_]+/g, "");
  const normalizedTopic = cleanTopicName.startsWith("outbreak_") ? cleanTopicName : `outbreak_${cleanTopicName}`;
  
  // Persistence in local storage
  const subs = JSON.parse(localStorage.getItem("sk_push_subscriptions") || "[]");
  if (!subs.includes(normalizedTopic)) {
    subs.push(normalizedTopic);
    localStorage.setItem("sk_push_subscriptions", JSON.stringify(subs));
  }

  // Register the subscription on the backend API
  const token = localStorage.getItem("sk_fcm_token") || `mock_fcm_${Math.random().toString(36).substring(2)}`;
  localStorage.setItem("sk_fcm_token", token);

  const pyBaseUrl = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  await axios.post(`${pyBaseUrl}/api/alerts/subscribe`, {
    topic: normalizedTopic,
    token: token
  });

  return normalizedTopic;
};

/**
 * Retrieves list of subscribed outbreak alert channels
 */
export const getSubscribedTopics = () => {
  return JSON.parse(localStorage.getItem("sk_push_subscriptions") || "[]");
};

/**
 * Unsubscribes from regional push topics
 */
export const unsubscribeFromTopic = async (topic) => {
  const cleanTopicName = topic.trim().toLowerCase().replace(/[\s_]+/g, "");
  const normalizedTopic = cleanTopicName.startsWith("outbreak_") ? cleanTopicName : `outbreak_${cleanTopicName}`;
  
  const subs = JSON.parse(localStorage.getItem("sk_push_subscriptions") || "[]");
  const filtered = subs.filter(s => s !== normalizedTopic);
  localStorage.setItem("sk_push_subscriptions", JSON.stringify(filtered));

  const token = localStorage.getItem("sk_fcm_token") || "mock_fcm_token";
  const pyBaseUrl = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  try {
    await axios.post(`${pyBaseUrl}/api/alerts/unsubscribe`, {
      topic: normalizedTopic,
      token: token
    });
  } catch (err) {
    console.warn("Backend unsubscribe failed, local state updated", err);
  }

  return normalizedTopic;
};
