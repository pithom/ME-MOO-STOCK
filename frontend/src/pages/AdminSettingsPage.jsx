import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';
import { authAPI } from '../services/api';

export default function AdminSettingsPage() {
  const { user, updateProfile, loading } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    lowStockThreshold: localStorage.getItem('lowStockThreshold') || '5',
  });
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'Active',
    permissions: {
      viewReports: false,
      addProducts: false,
      editProducts: false,
      deleteProducts: false,
      manageUsers: false,
    },
  });

  const canManageUsers = user?.role === 'admin' || user?.permissions?.manageUsers;

  const fetchUsers = async () => {
    if (!canManageUsers) return;
    setUserLoading(true);
    try {
      const { data } = await authAPI.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers]);

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

  const onCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await authAPI.createUser(newUser);
      toast.success('User created');
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'Active',
        permissions: {
          viewReports: false,
          addProducts: false,
          editProducts: false,
          deleteProducts: false,
          manageUsers: false,
        },
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleStatus = async (targetUser) => {
    try {
      const nextStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
      await authAPI.updateUserStatus(targetUser._id, nextStatus);
      setUsers((prev) => prev.map((u) => (u._id === targetUser._id ? { ...u, status: nextStatus } : u)));
      toast.success(`User set to ${nextStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const deleteUser = async (targetUser) => {
    if (!window.confirm(`Delete ${targetUser.name}?`)) return;
    try {
      await authAPI.deleteUser(targetUser._id);
      setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const promoteOrSetRole = async (targetUser, role) => {
    try {
      const { data } = await authAPI.updateUser(targetUser._id, { role });
      setUsers((prev) => prev.map((u) => (u._id === targetUser._id ? data : u)));
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const changeUserPassword = async (targetUser) => {
    const newPassword = window.prompt(`Enter new password for ${targetUser.email}`);
    if (!newPassword) return;
    try {
      await authAPI.updateUser(targetUser._id, { password: newPassword });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
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

      {canManageUsers && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>User Management</h2>
          <form onSubmit={onCreateUser}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={newUser.status} onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Permissions</label>
              <div className="grid-2">
                {[
                  ['viewReports', 'View Reports'],
                  ['addProducts', 'Add Products'],
                  ['editProducts', 'Edit Products'],
                  ['deleteProducts', 'Delete Products'],
                  ['manageUsers', 'Manage Users'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={newUser.permissions[key]}
                      onChange={(e) => setNewUser({
                        ...newUser,
                        permissions: { ...newUser.permissions, [key]: e.target.checked },
                      })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" disabled={creatingUser}>
              {creatingUser ? <><span className="spinner"></span> Creating...</> : 'Create User'}
            </button>
          </form>

          <div className="card" style={{ marginTop: 16, padding: 0 }}>
            {userLoading ? (
              <div className="page-loader"><div className="spinner" style={{ width: 30, height: 30 }}></div></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Permissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            className="form-control"
                            value={u.role}
                            onChange={(e) => promoteOrSetRole(u, e.target.value)}
                            style={{ minWidth: 130 }}
                          >
                            <option value="admin">admin</option>
                            <option value="user">user</option>
                          </select>
                        </td>
                        <td>{u.status}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {Object.entries(u.permissions || {})
                            .filter(([, v]) => Boolean(v))
                            .map(([k]) => k)
                            .join(', ') || 'none'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(u)} type="button">
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => changeUserPassword(u)} type="button">
                              Change Password
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)} type="button">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

