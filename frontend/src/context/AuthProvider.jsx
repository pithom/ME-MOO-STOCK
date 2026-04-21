import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stockUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('stockUser');
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email: String(email).trim(), password: String(password) });
      localStorage.setItem('stockUser', JSON.stringify(data));
      setUser(data);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (shopName, email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: shopName,
        email,
        password,
        role: 'admin',
      });
      // Keep current session intact; new shop can login explicitly.
      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Shop registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('stockUser');
    setUser(null);
  };

  const updateProfile = async (payload) => {
    setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(payload);
      localStorage.setItem('stockUser', JSON.stringify(data));
      setUser(data);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update profile' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      if (!user?.token) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        const { data } = await authAPI.me();
        const nextUser = { ...user, ...data };
        localStorage.setItem('stockUser', JSON.stringify(nextUser));
        if (!cancelled) setUser(nextUser);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    initAuth();
    const onSessionExpired = () => logout();
    window.addEventListener('auth:session-expired', onSessionExpired);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authReady, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

