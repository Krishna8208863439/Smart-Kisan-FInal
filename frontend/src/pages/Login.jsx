import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError("");
    const demoEmail = role === "farmer" ? "farmer@smartkisan.com" : "merchant@smartkisan.com";
    const demoPassword = role === "farmer" ? "farmer123" : "merchant123";
    
    setForm({ email: demoEmail, password: demoPassword });

    try {
      await login(demoEmail, demoPassword);
      nav("/dashboard");
    } catch (err) {
      setError("Demo login failed. Make sure your backend server is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      await loginWithGoogle(idToken);
      nav("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Google login failed");
    }
  };

  const handleGoogleError = () => {
    setError("Google login was cancelled or failed");
  };

  const handleSimulatedGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await loginWithGoogle("mock_google_token_" + Date.now());
      nav("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Simulated Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="login-split-layout">
        
        {/* Left Side: Farm Landscape Image */}
        <div 
          className="login-split-left" 
          style={{ 
            background: "url('http://localhost:5000/uploads/lush_green_farm.png') no-repeat center center",
            backgroundSize: "cover",
            position: "relative",
            minHeight: "100%"
          }}
        >
          {/* Subtle branding overlay at the bottom of the photo */}
          <div style={{ 
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0, 
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))", 
            padding: "40px 24px 24px 24px",
            color: "white" 
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Smart Kisan Platform</h2>
            <p style={{ opacity: 0.95, fontSize: 13.5, marginTop: 4 }}>Connecting traditional farming with modern AI intelligence.</p>
          </div>
        </div>

        {/* Right Side: Glassmorphic form */}
        <div className="login-split-right">
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome Back</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
            Log in to manage your fields and access agricultural insights.
          </p>

          <form onSubmit={onSubmit}>
            <label>Email Address</label>
            <input
              className="input"
              placeholder="farmer@kisan.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                className="input"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-peek-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                ⚠️ {error}
              </p>
            )}

            <button className="button" style={{ width: "100%", padding: 12 }} disabled={loading}>
              {loading ? "Verifying Credentials..." : "Log In Securely 🚀"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <hr style={{ flex: 1, borderColor: "var(--border-color)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>OR SIGN IN WITH</span>
            <hr style={{ flex: 1, borderColor: "var(--border-color)" }} />
          </div>

          {/* SSO Google login */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginBottom: 24 }}>
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>
            
            <button
              type="button"
              className="button button-secondary"
              style={{ width: "100%", fontSize: 13, borderColor: "#4285f4", color: "#4285f4", padding: "8px 16px" }}
              onClick={handleSimulatedGoogleLogin}
            >
              🌐 Simulated Google Login (Bypass)
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)" }}>
            New to Smart Kisan? <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>Create an account</Link>
          </p>

          {/* Quick trial accounts section */}
          <div className="demo-accounts-box">
            <div className="demo-accounts-title">🔑 Quick Trial demo logins</div>
            <div className="demo-buttons-row">
              <button 
                type="button" 
                className="demo-btn"
                onClick={() => handleDemoLogin("farmer")}
              >
                <span>🌾 Demo Farmer</span>
                <span style={{ fontSize: 9, opacity: 0.8 }}>Single-click login</span>
              </button>
              <button 
                type="button" 
                className="demo-btn"
                onClick={() => handleDemoLogin("merchant")}
              >
                <span>🛒 Demo Merchant</span>
                <span style={{ fontSize: 9, opacity: 0.8 }}>Single-click login</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
