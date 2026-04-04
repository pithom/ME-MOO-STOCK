import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
    if (res.success) navigate('/');
    else setError(res.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-circle">🏪</div>
          <h1>Welcome Back</h1>
          <p>Sign in to StockPro Manager</p>
        </div>
        <div className="card">
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="admin@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <><span className="spinner"></span> Signing in...</> : '🔐 Sign In'}
            </button>
          </form>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ color: 'var(--primary-light)', fontSize: 13 }}>
              Forgot password?
            </Link>
          </div>
          <div className="auth-divider">Admin access only</div>
        </div>
      </div>
    </div>
  );
}
