/**
 * Redis Client — Smart Kisan
 * Optional Redis connection with graceful fallback to in-memory Map.
 * This means the app still runs correctly even when Redis is not available,
 * but refresh token rotation will not persist across server restarts.
 */
import Redis from "ioredis";

// ── In-memory fallback (used when Redis is unavailable) ──
class MemoryStore {
  constructor() {
    this._store = new Map();
    this._expiry = new Map();
  }

  async get(key) {
    if (this._expiry.has(key) && Date.now() > this._expiry.get(key)) {
      this._store.delete(key);
      this._expiry.delete(key);
      return null;
    }
    return this._store.get(key) ?? null;
  }

  async set(key, value, exMode, exSeconds) {
    this._store.set(key, value);
    if (exMode === "EX" && exSeconds) {
      this._expiry.set(key, Date.now() + exSeconds * 1000);
    }
    return "OK";
  }

  async del(key) {
    this._store.delete(key);
    this._expiry.delete(key);
    return 1;
  }

  async exists(key) {
    if (this._expiry.has(key) && Date.now() > this._expiry.get(key)) {
      this._store.delete(key);
      return 0;
    }
    return this._store.has(key) ? 1 : 0;
  }

  async ttl(key) {
    if (!this._expiry.has(key)) return -1;
    const remaining = Math.ceil((this._expiry.get(key) - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern) {
    // Simplified: return keys matching glob-style pattern with *
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return [...this._store.keys()].filter(k => regex.test(k));
  }
}

let redisClient = null;
let usingFallback = false;

export const getRedis = () => {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL not set. Using in-memory fallback (non-persistent).");
    redisClient = new MemoryStore();
    usingFallback = true;
    return redisClient;
  }

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn("[Redis] Cannot connect after 3 retries. Switching to in-memory fallback.");
          redisClient = new MemoryStore();
          usingFallback = true;
          return null;
        }
        return Math.min(times * 200, 1000);
      }
    });

    client.on("connect", () => console.log("[Redis] Connected successfully."));
    client.on("error", (err) => {
      if (!usingFallback) {
        console.warn("[Redis] Connection error:", err.message);
      }
    });

    redisClient = client;
    return redisClient;
  } catch (err) {
    console.warn("[Redis] Init failed. Using in-memory fallback.", err.message);
    redisClient = new MemoryStore();
    usingFallback = true;
    return redisClient;
  }
};

export const isUsingFallback = () => usingFallback;
