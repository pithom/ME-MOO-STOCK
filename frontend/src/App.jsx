import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const ProtectedLayout = ({ children }) => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="mobile-header">
        <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(true)}>☰ Menu</button>
        <div className="mobile-title">StockPro</div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e1e35', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 14 },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
