import axios from "axios";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sk_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const geminiKey = localStorage.getItem("sk_gemini_key");
  if (geminiKey) {
    config.headers["x-gemini-key"] = geminiKey.trim();
  }
  return config;
});

export default api;
