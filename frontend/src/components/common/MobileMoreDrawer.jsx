import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Calendar, FlaskConical, Sprout, ShoppingCart, Landmark, BarChart3, Sun } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Mobile More Drawer Modal Component
 * Slide-up bottom sheet containing secondary tools & pages for quick access
 */
export default function MobileMoreDrawer({ isOpen, onClose }) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
              {language === 'mr' ? 'कृषी साधने व सेवा' : 'Agri Tools & Services'}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {language === 'mr' ? 'अतिरिक्त साधने निवडा' : 'Select any tool to launch'}
            </span>
          </div>
          <button type="button" className="mobile-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Grid Items */}
        <div className="mobile-drawer-grid">
          <NavLink to="/ai-tools?tab=calendar" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <Calendar size={22} />
            </div>
            <span>{language === 'mr' ? 'पेरणी दिनदर्शिका' : 'Sowing Calendar'}</span>
          </NavLink>

          <NavLink to="/ai-tools?tab=npk" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
              <FlaskConical size={22} />
            </div>
            <span>{language === 'mr' ? 'NPK खत सल्ला' : 'NPK Advisor'}</span>
          </NavLink>

          <NavLink to="/recommendations" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <Sprout size={22} />
            </div>
            <span>{language === 'mr' ? 'पीक शिफारसी' : 'Crop Recommendations'}</span>
          </NavLink>

          <NavLink to="/predictive-yield" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <BarChart3 size={22} />
            </div>
            <span>{language === 'mr' ? 'उत्पादन अंदाज' : 'Predictive Yield'}</span>
          </NavLink>

          <NavLink to="/marketplace" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
              <ShoppingCart size={22} />
            </div>
            <span>{language === 'mr' ? 'शेतकरी बाजार' : 'Farmers Bazaar'}</span>
          </NavLink>

          <NavLink to="/forum" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <Landmark size={22} />
            </div>
            <span>{language === 'mr' ? 'शासकीय योजना' : 'Govt Schemes'}</span>
          </NavLink>

          <NavLink to="/weather" className="drawer-item" onClick={onClose}>
            <div className="drawer-item-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
              <Sun size={22} />
            </div>
            <span>{language === 'mr' ? 'हवामान' : 'Weather'}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
