import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Clock3,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  SunMedium,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import brandLogo from '../assets/images/me-moo-logo-pro.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'MAIN' },
  { to: '/products', icon: Package, label: 'Products', section: 'INVENTORY' },
  { to: '/stock-in', icon: Warehouse, label: 'Stock In', section: 'INVENTORY' },
  { to: '/sales', icon: ShoppingCart, label: 'New Sale', section: 'SALES' },
  { to: '/sales-list', icon: ReceiptText, label: 'Sales History', section: 'SALES' },
  { to: '/pending', icon: Clock3, label: 'Pay Pending', section: 'SALES' },
  { to: '/reports', icon: BarChart3, label: 'Reports', section: 'REPORTS' },
  { to: '/settings', icon: Settings, label: 'Admin Settings', section: 'ADMIN' },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const userPermissions = user?.permissions || {};
  const isRegularUser = user?.role === 'user';
  const visibleItems = isRegularUser
    ? navItems.filter((item) => {
      if (item.to === '/sales') return Boolean(userPermissions.createSale);
      if (item.to === '/sales-list') return Boolean(userPermissions.viewSalesHistory);
      if (item.to === '/products' || item.to === '/stock-in') {
        return Boolean(userPermissions.addProducts || userPermissions.editProducts || userPermissions.deleteProducts);
      }
      if (item.to === '/reports') return Boolean(userPermissions.viewReports);
      if (item.to === '/pending') return Boolean(userPermissions.viewPendingPayments);
      if (item.to === '/settings') return Boolean(userPermissions.manageUsers);
      if (item.to === '/') return false;
      return false;
    })
    : navItems;
  const sections = [...new Set(visibleItems.map((item) => item.section))];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div>
            <img src={brandLogo} alt="ME-MOO STOCK" className="sidebar-brand-logo" />
            <div className="logo-sub">Inventory Control Center</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {visibleItems.filter((item) => item.section === section).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
          <div>
            <div className="nav-section">ACCOUNT</div>
            <button
              className="nav-item"
              onClick={toggleTheme}
              style={{ width: '100%', background: 'transparent' }}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === 'dark' ? <Moon size={18} strokeWidth={2} /> : <SunMedium size={18} strokeWidth={2} />}
              </span>
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ width: '100%', background: 'transparent' }}
            >
              <span className="nav-icon" aria-hidden="true">
                <LogOut size={18} strokeWidth={2} />
              </span>
              <span>Logout</span>
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
