import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import authBackgroundImage from '../assets/Memoo Stock login and regester background.png';
import logoImage from '../assets/MEMOO STOCK logo .png';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ shopName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.72)), url("${authBackgroundImage}")` }}
    >
      <div className="auth-modern-card">
        <div className="auth-modern-header">
          <img src={logoImage} alt="ME-MOO STOCK Logo" className="auth-modern-logo" />
          <h1>Create Shop Account</h1>
          <p>Register your store to get started</p>
        </div>
        <div className="auth-modern-body">
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="auth-modern-input" type="text" placeholder="Shop name"
              value={form.shopName} onChange={e => setForm({ ...form, shopName: e.target.value })} required />
            <input className="auth-modern-input" type="email" placeholder="Email address"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <input className="auth-modern-input" type="password" placeholder="Password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
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
