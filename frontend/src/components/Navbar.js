import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, CreditCard, Repeat, FileText, Gift, TrendingUp,
  User, Bell, LogOut, Menu, X, MessageCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'My account', icon: Home },
    { path: '/transactions', label: 'Transactions', icon: Repeat },
    { path: '/cards', label: 'Cards', icon: CreditCard },
    { path: '/offers', label: 'Offers', icon: Gift },
    { path: '/investments', label: 'Investments', icon: TrendingUp },
  ];

  const quickActions = [
    { path: '/transfer', label: 'Transfer Money', icon: Repeat },
    { path: '/complaints', label: 'Complaints', icon: FileText },
    { path: '/kyc-status', label: 'KYC Status', icon: CheckCircle },
    { path: '/ai-assistant', label: 'AI Assistant', icon: MessageCircle },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-logo">
            <div className="logo-icon">
              <TrendingUp size={24} />
            </div>
            <span className="logo-text">NevBank</span>
          </div>

          <div className="navbar-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="navbar-right">
          <div className="quick-actions">
            {quickActions.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="icon-btn"
                title={item.label}
              >
                <item.icon size={20} />
              </button>
            ))}
          </div>

          <button className="icon-btn notification-btn">
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </button>

          <div className="profile-menu">
            <button 
              className="profile-btn"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="profile-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="profile-name">{user?.name}</span>
            </button>

            {showProfile && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-avatar-large">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="profile-name-text">{user?.name}</p>
                    <p className="profile-email">{user?.email}</p>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <Link to="/profile" className="dropdown-item">
                  <User size={18} />
                  <span>My Profile</span>
                </Link>
                <button onClick={handleLogout} className="dropdown-item">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="mobile-menu-item"
              onClick={() => setShowMenu(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="mobile-menu-divider"></div>
          {quickActions.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="mobile-menu-item"
              onClick={() => setShowMenu(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

