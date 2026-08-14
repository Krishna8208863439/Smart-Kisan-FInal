import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Camera, TrendingUp, Grid } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Mobile Bottom Navigation Bar (Persistent for < 768px screens)
 * Features: 4 primary navigation tabs + raised focal camera scan button
 */
export default function BottomNav({ onOpenScan, onOpenMore }) {
  const location = useLocation();
  const { language } = useLanguage();

  return (
    <nav className="mobile-bottom-nav">
      {/* Tab 1: Home */}
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`}
      >
        <Home size={20} />
        <span>{language === 'mr' ? 'मुख्य' : 'Home'}</span>
      </NavLink>

      {/* Tab 2: Chat */}
      <NavLink
        to="/chat"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`}
      >
        <MessageSquare size={20} />
        <span>{language === 'mr' ? 'चॅट' : 'Chat'}</span>
      </NavLink>

      {/* Tab 3: Raised Camera Scan Button (Center Focal CTA) */}
      <button
        type="button"
        className="bottom-nav-scan-btn"
        onClick={onOpenScan}
        aria-label="Scan crop leaf"
        title="Scan Crop Leaf"
      >
        <div className="bottom-nav-scan-icon">
          <Camera size={24} color="#FFFFFF" />
        </div>
        <span>{language === 'mr' ? 'स्कॅन' : 'Scan'}</span>
      </button>

      {/* Tab 4: Mandi Prices */}
      <NavLink
        to="/market"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`}
      >
        <TrendingUp size={20} />
        <span>{language === 'mr' ? 'मंडी' : 'Mandi'}</span>
      </NavLink>

      {/* Tab 5: More Drawer */}
      <button
        type="button"
        className={`bottom-nav-item ${location.pathname.includes('/ai-tools') || location.pathname.includes('/forum') || location.pathname.includes('/marketplace') ? 'bottom-nav-active' : ''}`}
        onClick={onOpenMore}
      >
        <Grid size={20} />
        <span>{language === 'mr' ? 'अधिक' : 'More'}</span>
      </button>
    </nav>
  );
}
