import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
import { ThemeProvider } from './context/ThemeProvider';
import { useTheme } from './context/useTheme';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import StockInPage from './pages/StockInPage';
import SalesPage from './pages/SalesPage';
import SalesListPage from './pages/SalesListPage';
import PendingPage from './pages/PendingPage';
import ReportsPage from './pages/ReportsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

const ProtectedLayout = ({ children }) => {
  const { user, authReady } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileHeader = (
    <header className="mobile-header">
      <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(true)}>☰ Menu</button>
      <div className="mobile-title">ME-MOO STOCK</div>
      <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </header>
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const header = document.querySelector('header.mobile-header');
    if (!header || !header.parentElement) return;
    const firstScript = document.body.querySelector('script');
    if (!firstScript) return;
    if (header.nextElementSibling !== firstScript) {
      document.body.insertBefore(header, firstScript);
    }
  }, [menuOpen, theme]);

  if (!authReady) {
    return <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'Inactive') return <Navigate to="/login" replace />;

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(mobileHeader, document.body) : mobileHeader}
      <div className="layout has-mobile-header">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-content">{children}</main>
      </div>
    </>
  );
};

const PublicRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) {
    return <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>;
  }
  if (user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/products" element={<ProtectedLayout><ProductsPage /></ProtectedLayout>} />
      <Route path="/stock-in" element={<ProtectedLayout><StockInPage /></ProtectedLayout>} />
      <Route path="/sales" element={<ProtectedLayout><SalesPage /></ProtectedLayout>} />
      <Route path="/sales-list" element={<ProtectedLayout><SalesListPage /></ProtectedLayout>} />
      <Route path="/pending" element={<ProtectedLayout><PendingPage /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><AdminSettingsPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1e1e35' : '#ffffff',
            color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
            border: `1px solid ${theme === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.12)'}`,
            borderRadius: 10,
            fontSize: 14,
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
