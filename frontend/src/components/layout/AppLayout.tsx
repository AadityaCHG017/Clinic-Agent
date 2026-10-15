import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Stethoscope,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Heart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HealthStatus from '../ui/HealthStatus';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant', highlight: true },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/profile', icon: User, label: 'My Profile' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Heart className="sidebar-logo-icon" size={24} />
          <span className="sidebar-logo-text">MANIPAL</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, highlight }) => (
            <Link
              key={to}
              to={to}
              className={`sidebar-nav-item${location.pathname === to ? ' active' : ''}${highlight ? ' highlighted' : ''}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <HealthStatus />
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} aria-label="Log out">
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-left">
          <Heart size={20} className="mobile-logo-icon" />
          <span className="mobile-logo-text">MANIPAL</span>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Heart size={20} className="mobile-logo-icon" />
              <span className="mobile-logo-text">MANIPAL</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={24} />
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              {navItems.map(({ to, icon: Icon, label, highlight }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`mobile-nav-item${location.pathname === to ? ' active' : ''}${highlight ? ' highlighted' : ''}`}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </Link>
              ))}
              <button className="mobile-logout" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, highlight }) => (
          <Link
            key={to}
            to={to}
            className={`mobile-bottom-item${location.pathname === to ? ' active' : ''}${highlight ? ' highlighted' : ''}`}
            aria-label={label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
