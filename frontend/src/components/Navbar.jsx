import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import usePWAInstall from '../hooks/usePWAInstall';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => setMenuOpen(false), [location]);

  // Detect scroll for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <>
      <nav className={`nav-bar ${scrolled ? 'nav-bar-scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
            🌾 Smart Kisan
          </Link>

          {/* Desktop Links */}
          <div className="nav-links nav-links-desktop">
            <NavLink to="/" className={navLinkClass} end>Home</NavLink>
            {user && (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/chat" className={navLinkClass}>🤖 Chat</NavLink>
                <NavLink to="/ai-tools" className={navLinkClass}>🛠️ AI Center</NavLink>
                <NavLink to="/marketplace" className={navLinkClass}>🛒 Bazaar</NavLink>
                <NavLink to="/forum" className={navLinkClass}>👥 Community</NavLink>
              </>
            )}
            {!user && (
              <>
                <NavLink to="/login" className={navLinkClass}>Login</NavLink>
                <NavLink to="/register" className={navLinkClass}>Register</NavLink>
              </>
            )}
          </div>

          {/* Right Controls */}
          <div className="nav-actions">
            {/* Dark Mode Toggle */}
            <button
              className="nav-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Install App Button (desktop) */}
            {!isInstalled && (
              <button
                className="nav-install-btn nav-install-btn-desktop"
                onClick={installApp}
                aria-label="Install Smart Kisan App"
              >
                📲 Install App
              </button>
            )}

            {/* User info (desktop) */}
            {user && (
              <div className="nav-user nav-user-desktop">
                <span className="nav-user-name">Hi, {user.name?.split(' ')[0]}</span>
                <button
                  className="button nav-logout-btn"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            )}

            {/* Hamburger Button (mobile) */}
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={menuOpen}
            >
              <span className={`hamburger-line ${menuOpen ? 'ham-open-1' : ''}`} />
              <span className={`hamburger-line ${menuOpen ? 'ham-open-2' : ''}`} />
              <span className={`hamburger-line ${menuOpen ? 'ham-open-3' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {menuOpen && (
        <div
          className="nav-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Side Drawer */}
      <aside className={`nav-drawer ${menuOpen ? 'nav-drawer-open' : ''}`} aria-label="Mobile menu">
        <div className="nav-drawer-header">
          <span className="nav-logo" style={{ color: 'white', fontSize: 18 }}>🌾 Smart Kisan</span>
          <button className="nav-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="nav-drawer-body">
          {user && (
            <div className="nav-drawer-user">
              <div style={{ fontSize: 36 }}>👨‍🌾</div>
              <div className="nav-drawer-user-name">{user.name}</div>
              <div className="nav-drawer-user-role" style={{ fontSize: 12, opacity: 0.7 }}>{user.email}</div>
            </div>
          )}

          <nav className="nav-drawer-links">
            <NavLink to="/" className={navLinkClass} end>🏠 Home</NavLink>
            {user && (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>📊 Dashboard</NavLink>
                <NavLink to="/chat" className={navLinkClass}>🤖 Kisan Chat</NavLink>
                <NavLink to="/ai-tools" className={navLinkClass}>🛠️ AI Center</NavLink>
                <NavLink to="/marketplace" className={navLinkClass}>🛒 Bazaar</NavLink>
                <NavLink to="/forum" className={navLinkClass}>👥 Community</NavLink>
                <NavLink to="/weather" className={navLinkClass}>☀️ Weather</NavLink>
                <NavLink to="/market" className={navLinkClass}>📈 Mandi Prices</NavLink>
              </>
            )}
            {!user && (
              <>
                <NavLink to="/login" className={navLinkClass}>🔑 Login</NavLink>
                <NavLink to="/register" className={navLinkClass}>✍️ Register</NavLink>
              </>
            )}
          </nav>

          <div className="nav-drawer-footer">
            <button
              className="nav-icon-btn"
              onClick={toggleTheme}
              style={{ gap: 8, fontSize: 14 }}
            >
              {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>

            {!isInstalled && (
              <button
                className="button"
                onClick={installApp}
                style={{ width: '100%', marginTop: 8, background: '#f59e0b' }}
              >
                📲 Install App
              </button>
            )}

            {user && (
              <button
                className="button button-secondary"
                onClick={logout}
                style={{ width: '100%', marginTop: 8 }}
              >
                🚪 Logout
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
