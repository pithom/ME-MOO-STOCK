import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authBackgroundImage from '../assets/images/Memoo Stock login and regester background.png';
import logoImage from '../assets/images/me-moo-logo-pro.png';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const [form, setForm] = useState({ shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      setError('Please enter a valid email address.');
      return;
    }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password);
    if (!strong) {
      setError('Password must be 8+ chars with uppercase, lowercase and number.');
      return;
    }
    const res = await register(form.shopName, form.email, form.password);
    if (res.success) {
      toast.success('Shop created successfully. Please login with the new account.');
      setForm({ shopName: '', email: '', password: '' });
      navigate('/login');
      return;
    }
    setError(res.message);
  };

  return (
    <div
      className="auth-page auth-modern-page"
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.76), rgba(15,23,42,0.82)), url("${authBackgroundImage}")` }}
    >
      <div className="auth-modern-card">
        <div className="auth-modern-header">
          <img src={logoImage} alt="ME-MOO STOCK Logo" className="auth-modern-logo" />
          <h1>Create Shop Account</h1>
          <p>Launch a clean, secure workspace for your store operations.</p>
        </div>
        <div className="auth-modern-body">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input
              className="auth-modern-input"
              type="text"
              placeholder="Shop name"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              required
            />
            <input
              className="auth-modern-input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="auth-modern-password-row">
              <input
                className="auth-modern-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
              <button
                type="button"
                className="auth-modern-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className="auth-modern-btn" disabled={loading}>
              {loading ? <><span className="spinner"></span> Creating...</> : 'Create Shop Account'}
            </button>
          </form>
          <div className="auth-modern-footer">
            Already have a shop account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
