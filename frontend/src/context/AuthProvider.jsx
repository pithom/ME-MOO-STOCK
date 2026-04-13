import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('stockUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

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
    if (!user?.token) return;
    authAPI.me().catch(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

