import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🌾 Smart Kisan
        </Link>
        
        <div className="nav-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            end
          >
            Home
          </NavLink>
          
          {user && (
            <>
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                Dashboard
              </NavLink>
              
              <NavLink 
                to="/chat" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                🤖 Kisan Chat
              </NavLink>

              <NavLink 
                to="/ai-tools" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                🛠️ AI Center
              </NavLink>

              <NavLink 
                to="/marketplace" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                🛒 Marketplace
              </NavLink>

              <NavLink 
                to="/forum" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                👥 Community
              </NavLink>
            </>
          )}

          {!user && (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                Login
              </NavLink>
              <NavLink 
                to="/register" 
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                Register
              </NavLink>
            </>
          )}

          {user && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dcfce7" }}>Hi, {user.name}</span>
              <button 
                className="button" 
                onClick={logout} 
                style={{ 
                  background: "rgba(255,255,255,0.2)", 
                  padding: "6px 12px", 
                  fontSize: 12,
                  border: "1px solid rgba(255,255,255,0.4)" 
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
