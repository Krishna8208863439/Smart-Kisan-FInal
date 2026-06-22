import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Recommendations from "./pages/Recommendations";
import Weather from "./pages/Weather";
import Market from "./pages/Market";
import Forum from "./pages/Forum";
import AITools from "./pages/AITools";
import Marketplace from "./pages/Marketplace";
import KisanChat from "./pages/KisanChat";
import AgriHealthPortal from "./pages/AgriHealthPortal";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { useAuth } from "./context/AuthContext";

// Offline notification banner rendered inside router context
const OfflineBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (isOnline) return null;
  return (
    <div className="offline-bar" role="alert">
      📡 No internet connection. Some features may be unavailable.
    </div>
  );
};

const RootRoute = () => {
  const { user } = useAuth();
  return user ? <Home /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Navbar />
          <OfflineBar />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
            <Route path="/weather" element={<ProtectedRoute><Weather /></ProtectedRoute>} />
            <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
            <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
            <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
            <Route path="/agri-health" element={<ProtectedRoute><AgriHealthPortal /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><KisanChat /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
