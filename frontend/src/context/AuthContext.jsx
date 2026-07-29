/**
 * Smart Kisan — AuthContext
 * Supports: Email/Password, Google OAuth2
 * Token model: accessToken (15m) + refreshToken (7d, rotated)
 * Multi-device: each device gets its own refresh token
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api";

const AuthContext = createContext(null);

// Storage keys
const KEYS = {
  TOKEN: "sk_token",
  REFRESH: "sk_refresh_token",
  USER_ID: "sk_user_id",
  NAME: "sk_name",
  EMAIL: "sk_email",
  ROLE: "sk_role"
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ──
  useEffect(() => {
    const token = localStorage.getItem(KEYS.TOKEN);
    const userId = localStorage.getItem(KEYS.USER_ID);
    const name = localStorage.getItem(KEYS.NAME);
    const email = localStorage.getItem(KEYS.EMAIL);
    const role = localStorage.getItem(KEYS.ROLE);

    if (token && name && email) {
      setUser({ _id: userId, name, email, role: role || "farmer" });
    }
    setLoading(false);
  }, []);

  // ── Persist auth state ──
  const saveAuth = useCallback(({ user: u, accessToken, refreshToken, token, name, email, role, _id }) => {
    // Support both old (token, name, email, role) and new (user, accessToken, refreshToken) shapes
    const userData = u || { _id, name, email, role };
    const access = accessToken || token;
    const refresh = refreshToken;

    if (access) localStorage.setItem(KEYS.TOKEN, access);
    if (refresh) localStorage.setItem(KEYS.REFRESH, refresh);
    if (userData._id) localStorage.setItem(KEYS.USER_ID, userData._id);
    if (userData.name) localStorage.setItem(KEYS.NAME, userData.name);
    if (userData.email) localStorage.setItem(KEYS.EMAIL, userData.email);
    localStorage.setItem(KEYS.ROLE, userData.role || "farmer");

    setUser({
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      role: userData.role || "farmer",
      emailVerified: userData.emailVerified
    });
  }, []);

  // ── Email + Password Login ──
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    // New API returns { success, data: { user, accessToken, refreshToken } }
    // Old API returned flat { token, name, email, role }
    const payload = res.data?.data || res.data;
    saveAuth(payload);
    return payload;
  };

  // ── Register ──
  const register = async (name, email, password, role = "farmer") => {
    const res = await api.post("/auth/register", { name, email, password, role });
    const payload = res.data?.data || res.data;
    saveAuth(payload);
    return payload;
  };

  // ── Google Sign-In ──
  const loginWithGoogle = async (idToken) => {
    const res = await api.post("/auth/google", { idToken, credential: idToken });
    const payload = res.data?.data || res.data;
    saveAuth(payload);
    return payload;
  };

  // ── Logout (revoke current device session) ──
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(KEYS.REFRESH);
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (_) {
      // Always clear locally even if server call fails
    } finally {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
      setUser(null);
    }
  }, []);

  // ── Logout All Devices ──
  const logoutAll = useCallback(async () => {
    try {
      await api.post("/auth/logout-all");
    } catch (_) {
      // ignore
    } finally {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
      setUser(null);
    }
  }, []);

  // ── Update local user state (e.g., after profile edit) ──
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      if (updates.name) localStorage.setItem(KEYS.NAME, updates.name);
      if (updates.email) localStorage.setItem(KEYS.EMAIL, updates.email);
      if (updates.role) localStorage.setItem(KEYS.ROLE, updates.role);
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    logoutAll,
    updateUser,
    isAdmin: user?.role === "admin",
    isExpert: user?.role === "expert",
    isFarmer: user?.role === "farmer",
    isMerchant: user?.role === "merchant"
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
