import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard', authRequired: true },
  { to: '/chat', icon: '🤖', label: 'Chat', authRequired: true },
  { to: '/ai-tools', icon: '🛠️', label: 'AI', authRequired: true },
  { to: '/agri-health', icon: '🏥', label: 'Health', authRequired: true },
  { to: '/marketplace', icon: '🛒', label: 'Market', authRequired: true },
  { to: '/forum', icon: '👥', label: 'Community', authRequired: true },
];

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Hide bottom nav on login/register pages
  const hiddenPaths = ['/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const visibleItems = NAV_ITEMS.filter(item => !item.authRequired || user);

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Mobile navigation">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
          }
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
