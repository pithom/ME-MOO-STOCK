import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

export default function AdminSettingsPage() {
  const { user, updateProfile, loading } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    lowStockThreshold: localStorage.getItem('lowStockThreshold') || '5',
  });

  const onProfileSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (form.password) payload.password = form.password;
    const res = await updateProfile(payload);
    if (res.success) {
      toast.success('Profile updated');
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } else {
      toast.error(res.message);
    }
  };

  const onPrefsSubmit = (e) => {
    e.preventDefault();
    const threshold = Number(form.lowStockThreshold);
    if (!Number.isFinite(threshold) || threshold < 1) {
      toast.error('Low stock threshold must be 1 or more');
      return;
    }
    localStorage.setItem('lowStockThreshold', String(threshold));
    toast.success('System preferences updated');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Admin Settings</h1>
        <p className="page-subtitle">Update profile and system preferences</p>
      </div>

      <div className="settings-grid">
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Profile Settings</h2>
          <form onSubmit={onProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-control" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-control" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? <><span className="spinner"></span> Saving...</> : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>System Preferences</h2>
          <form onSubmit={onPrefsSubmit}>
            <div className="form-group">
              <label className="form-label">Low Stock Threshold</label>
              <input
                className="form-control"
                type="number"
                min="1"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                required
              />
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>
              Products at or below this value are shown as Low Stock.
            </p>
            <button className="btn btn-success" type="submit">Save Preferences</button>
          </form>
        </div>
      </div>
    </div>
  );
}

