import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("sk_token");
    const name = localStorage.getItem("sk_name");
    const email = localStorage.getItem("sk_email");
    const role = localStorage.getItem("sk_role");
    if (token && name && email) {
      setUser({ name, email, role: role || "farmer" });
    }
  }, []);

  const saveAuth = ({ token, name, email, role }) => {
    localStorage.setItem("sk_token", token);
    localStorage.setItem("sk_name", name);
    localStorage.setItem("sk_email", email);
    localStorage.setItem("sk_role", role || "farmer");
    setUser({ name, email, role: role || "farmer" });
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    saveAuth(res.data);
  };

  const register = async (name, email, password, role) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    saveAuth(res.data);
  };

  // ⭐ New: Google login
  const loginWithGoogle = async (idToken) => {
    const res = await api.post("/auth/google", { idToken });
    saveAuth(res.data);
  };

  const logout = () => {
    localStorage.removeItem("sk_token");
    localStorage.removeItem("sk_name");
    localStorage.removeItem("sk_email");
    localStorage.removeItem("sk_role");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
