import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard', section: 'MAIN' },
  { to: '/products', icon: '📦', label: 'Products', section: 'INVENTORY' },
  { to: '/stock-in', icon: '📥', label: 'Stock In', section: 'INVENTORY' },
  { to: '/sales', icon: '🛒', label: 'New Sale', section: 'SALES' },
  { to: '/sales-list', icon: '📋', label: 'Sales History', section: 'SALES' },
  { to: '/pending', icon: '⏳', label: 'Pay Pending', section: 'SALES' },
  { to: '/reports', icon: '📈', label: 'Reports', section: 'REPORTS' },
  { to: '/settings', icon: '⚙️', label: 'Admin Settings', section: 'ADMIN' },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sections = [...new Set(navItems.map(i => i.section))];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">🏪</div>
        <div>
          <div className="logo-text">StockPro</div>
          <div className="logo-sub">Stock Management</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {navItems.filter(i => i.section === section).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
        <div>
          <div className="nav-section">ACCOUNT</div>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ width: '100%', background: 'transparent' }}
          >
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
    {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
    </>
  );
}
