import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (passwordStrength.label === "Too Short") {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password, form.role);
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength logic
  const passwordStrength = useMemo(() => {
    const pwd = form.password;
    if (!pwd) return { percent: 0, color: "#e5e7eb", label: "Empty" };
    if (pwd.length < 6) return { percent: 25, color: "#ef4444", label: "Too Short (Min 6)" };
    
    let score = 0;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-zA-Z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score === 1) return { percent: 50, color: "#f97316", label: "Weak" };
    if (score === 2) return { percent: 75, color: "#3b82f6", label: "Moderate" };
    return { percent: 100, color: "#22c55e", label: "Strong & Secure" };
  }, [form.password]);

  return (
    <div className="app-container">
      <div className="login-split-layout">
        
        <div 
          className="login-split-left"
          style={{
            backgroundImage: `linear-gradient(var(--login-overlay), var(--login-overlay)), url('/farmer.png')`
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
          <h1 className="login-tagline text-primary">
            Cultivate Success with Precision AI
          </h1>
          <p className="text-secondary" style={{ fontSize: 16, marginBottom: 20 }}>
            "Smart Kisan has transformed how I manage my tomato fields. The AI calendar and watering advices are a lifesaver!"
          </p>
          <div className="text-secondary" style={{ fontStyle: "italic", fontSize: 14 }}>
            — Suresh K., Progressive Farmer, Maharashtra
          </div>

          <ul className="login-features-list text-secondary" style={{ marginTop: 24 }}>
            <li>✔️ Join a thriving community of local agriculturalists</li>
            <li>✔️ Gain access to custom regional mandi crop updates</li>
            <li>✔️ Track dynamic progress timelines for your fields</li>
          </ul>
        </div>

        {/* Right Side: Register form details */}
        <div className="login-split-right">
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Create Account</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            Register to set up your agricultural dashboard profile.
          </p>

          <form onSubmit={onSubmit}>
            <label>Select User Role</label>
            <div className="role-picker-container">
              <div
                className={`role-card ${form.role === "farmer" ? "role-card-active" : ""}`}
                onClick={() => setForm({ ...form, role: "farmer" })}
              >
                <span style={{ fontSize: 20 }}>🌾</span>
                <strong>Farmer</strong>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: "normal" }}>Cultivate & Sell</span>
              </div>
              <div
                className={`role-card ${form.role === "merchant" ? "role-card-active" : ""}`}
                onClick={() => setForm({ ...form, role: "merchant" })}
              >
                <span style={{ fontSize: 20 }}>💼</span>
                <strong>Merchant</strong>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: "normal" }}>Trade & Purchase</span>
              </div>
            </div>

            <label>Full Name</label>
            <input
              className="input"
              placeholder="Ram Singh"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <label>Email Address</label>
            <input
              className="input"
              placeholder="ram@gmail.com"
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

            {/* Live Password Strength Meter */}
            {form.password && (
              <div className="strength-meter-container">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="strength-label">Password Strength:</span>
                  <strong style={{ fontSize: 11.5, color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </strong>
                </div>
                <div className="strength-bar-bg">
                  <div
                    className="strength-bar-fill"
                    style={{
                      width: `${passwordStrength.percent}%`,
                      background: passwordStrength.color
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                ⚠️ {error}
              </p>
            )}

            <button className="button" style={{ width: "100%", padding: 12 }} disabled={loading}>
              {loading ? "Creating Profile..." : "Register Account 🚀"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)", marginTop: 20 }}>
            Already have an account? <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>Log In here</Link>
          </p>

        </div>

      </div>
    </div>
  );
};

export default Register;
