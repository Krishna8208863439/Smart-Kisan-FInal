import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import api from "../api";

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Forgot password wizard states
  const [forgotView, setForgotView] = useState("login"); // login | forgot | reset
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");
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
    setInfoMessage("");
    let demoEmail = "";
    let demoPassword = "";
    if (role === "farmer") {
      demoEmail = "farmer@smartkisan.com";
      demoPassword = "farmer123";
    } else if (role === "merchant") {
      demoEmail = "merchant@smartkisan.com";
      demoPassword = "merchant123";
    } else if (role === "krishna") {
      demoEmail = "krishnadevadkar@gmail.com";
      demoPassword = "krishna123";
    }
    
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

  // Forgot Password APIs handlers
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotView("reset");
      setInfoMessage(`Code generated successfully! For testing: Enter reset code: ${res.data.otp}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to check email. Verify user exists.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", {
        email: forgotEmail,
        code: otpCode,
        newPassword
      });
      setForm({ email: forgotEmail, password: newPassword });
      setForgotView("login");
      setInfoMessage("Password updated successfully! Please click Log In below to enter.");
      setOtpCode("");
      setNewPassword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password. Check verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="login-split-layout">
        
        {/* Left Side: Farm Landscape Image with Features list and credentials */}
        <div 
          className="login-split-left" 
          style={{ 
            background: "linear-gradient(rgba(21, 128, 61, 0.7), rgba(13, 148, 136, 0.8)), url('http://localhost:5000/uploads/lush_green_farm.png') no-repeat center center",
            backgroundSize: "cover",
            position: "relative",
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px"
          }}
        >
          <div style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            padding: "24px",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)"
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              🌾 Smart Kisan
            </h2>
            <p style={{ fontSize: 13.5, opacity: 0.95, marginBottom: 16 }}>
              Log in to access your agricultural suite and features:
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>📊</span> <strong>Dashboard</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>🤖</span> <strong>Kisan AI Chat</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>🛠️</span> <strong>AI Center</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>🛒</span> <strong>Farmers Bazaar</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>👥</span> <strong>Community Hub</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>☀️</span> <strong>Weather</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>📈</span> <strong>Mandi Prices</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>🌱</span> <strong>Crop Advisor</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <span>🌐</span> <strong>मराठी (Marathi)</strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: 12, fontSize: 12, opacity: 0.9 }}>
              <span style={{ display: "block", marginBottom: 6 }}>📲 PWA support with offline functionality</span>
              <span style={{ display: "block" }}>🌙 Dark Mode & premium theme controls</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth wizard */}
        <div className="login-split-right">
          
          {forgotView === "login" && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome Back</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                Log in to manage your fields and access agricultural insights.
              </p>

              {infoMessage && (
                <div style={{ background: "var(--primary-light)", border: "1.5px solid var(--primary)", color: "var(--primary)", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  ✅ {infoMessage}
                </div>
              )}

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

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6, marginBottom: 18 }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}
                    onClick={() => { setForgotView("forgot"); setError(""); setInfoMessage(""); }}
                  >
                    Forgot Password?
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

              {/* Quick Demo Logins Section */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🔑</span> Quick Demo Logins:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    type="button"
                    className="button"
                    style={{ 
                      background: "linear-gradient(135deg, #059669, #10b981)", 
                      color: "white", 
                      padding: "10px 14px", 
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      border: "none",
                      cursor: "pointer"
                    }}
                    onClick={() => handleDemoLogin("krishna")}
                    disabled={loading}
                  >
                    <span>👨‍🌾</span> Log In as Krishna Devadkar (krishnadevadkar@gmail.com)
                  </button>
                  
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ flex: 1, padding: "8px 12px", fontSize: 12.5 }}
                      onClick={() => handleDemoLogin("farmer")}
                      disabled={loading}
                    >
                      🌾 Demo Farmer
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ flex: 1, padding: "8px 12px", fontSize: 12.5 }}
                      onClick={() => handleDemoLogin("merchant")}
                      disabled={loading}
                    >
                      🛒 Demo Merchant
                    </button>
                  </div>
                </div>
              </div>


              <div style={{ margin: "20px 0" }}></div>


              <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)" }}>
                New to Smart Kisan? <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>Create an account</Link>
              </p>


            </>
          )}

          {forgotView === "forgot" && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Reset Password</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                Enter your email address to request a password reset verification code.
              </p>

              <form onSubmit={handleForgotPasswordSubmit}>
                <label>Email Address</label>
                <input
                  className="input"
                  placeholder="farmer@kisan.com"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />

                {error && (
                  <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    ⚠️ {error}
                  </p>
                )}

                <button className="button" style={{ width: "100%", padding: 12, marginBottom: 12 }} disabled={loading}>
                  {loading ? "Verifying Account..." : "Send Verification OTP 🔑"}
                </button>
                
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "100%", padding: 12 }}
                  onClick={() => { setForgotView("login"); setError(""); }}
                >
                  Back to Login
                </button>
              </form>
            </>
          )}

          {forgotView === "reset" && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>New Password Wizard</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
                Enter the verification code sent to <strong>{forgotEmail}</strong> to change your password.
              </p>

              {infoMessage && (
                <div style={{ background: "var(--primary-light)", border: "1.5px solid var(--primary)", color: "var(--primary)", padding: 12, borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                  💡 {infoMessage}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit}>
                <label>6-Digit Reset Code (OTP)</label>
                <input
                  className="input"
                  placeholder="e.g. 123456"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />

                <label>Enter New Password</label>
                <input
                  className="input"
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                {error && (
                  <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    ⚠️ {error}
                  </p>
                )}

                <button className="button" style={{ width: "100%", padding: 12, marginBottom: 12 }} disabled={loading}>
                  {loading ? "Saving Password..." : "Submit & Reset Password 🔐"}
                </button>
                
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "100%", padding: 12 }}
                  onClick={() => { setForgotView("forgot"); setError(""); }}
                >
                  Request New Reset Code
                </button>
              </form>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default Login;
