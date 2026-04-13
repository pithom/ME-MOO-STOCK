import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import authBackgroundImage from '../assets/Memoo Stock login and regester background.png';
import logoImage from '../assets/MEMOO STOCK logo .png';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      setError('Please enter a valid email address.');
      return;
    }
    const res = await login(form.email, form.password);
    if (res.success) navigate('/');
    else setError(res.message);
  };

  return (
    <div
      className="auth-page auth-modern-page"
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.72)), url("${authBackgroundImage}")` }}
    >
      <div className="auth-modern-card">
        <div className="auth-modern-header">
          <img src={logoImage} alt="ME-MOO STOCK Logo" className="auth-modern-logo" />
          <h1>Welcome Back</h1>
          <p>Sign in to continue</p>
        </div>
        <div className="auth-modern-body">
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="auth-modern-input" type="email" placeholder="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <div className="auth-modern-password-row">
              <input className="auth-modern-input" type={showPassword ? 'text' : 'password'} placeholder="Password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              <button type="button" className="auth-modern-eye" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" className="auth-modern-btn" disabled={loading}>
              {loading ? <><span className="spinner"></span> Logging in...</> : 'Login'}
            </button>
          </form>
          <div className="auth-modern-footer">Only admin can create accounts from settings.</div>
        </div>
      </div>
    </div>
  );
}
