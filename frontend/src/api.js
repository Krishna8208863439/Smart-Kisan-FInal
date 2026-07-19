import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.endsWith("/api") ? import.meta.env.VITE_API_URL : import.meta.env.VITE_API_URL + "/api")
    : "/api"
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("sk_token");
      localStorage.removeItem("sk_name");
      localStorage.removeItem("sk_email");
      localStorage.removeItem("sk_role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
