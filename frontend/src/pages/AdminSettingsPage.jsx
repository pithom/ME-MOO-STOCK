import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { authAPI, productsAPI, activityLogAPI } from '../services/api';

const buildDefaultManagedUserPermissions = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return {
    createSale: true,
    viewSalesHistory: true,
    viewPendingPayments: false,
    viewReports: false,
    addProducts: normalizedEmail === 'iradine@gmail.com',
    editProducts: normalizedEmail === 'iradine@gmail.com',
    deleteProducts: false,
    manageUsers: false,
  };
};

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
  const [importingProducts, setImportingProducts] = useState(false);
  const [importText, setImportText] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const permissionEntries = [
    ['createSale', 'New Sale'],
    ['viewSalesHistory', 'Sales History'],
    ['viewPendingPayments', 'Pay Pending'],
    ['viewReports', 'Reports'],
    ['addProducts', 'Add Products'],
    ['editProducts', 'Edit Products'],
    ['deleteProducts', 'Delete Products'],
    ['manageUsers', 'Manage Users'],
  ];
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    status: 'Active',
    permissions: buildDefaultManagedUserPermissions(user?.email),
  });

  const canManageUsers = user?.role === 'admin' || user?.permissions?.manageUsers;
  const isAdmin = user?.role === 'admin';
  const isSupervisor = !isAdmin
    && Boolean(user?.permissions?.manageUsers)
    && String(user?.email || '').trim().toLowerCase() === 'cfeddx6@gmail.com';

  const [managedAdmins, setManagedAdmins] = useState([]);
  const [managedAdminsLoading, setManagedAdminsLoading] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '', status: 'Active' });
  const [pwdModal, setPwdModal] = useState(null); // admin object
  const [newAdminPwd, setNewAdminPwd] = useState('');
  const [permissionModal, setPermissionModal] = useState(null);
  const getPermissionSummary = (permissions = {}) => (
    permissionEntries
      .filter(([key]) => Boolean(permissions?.[key]))
      .map(([, label]) => label)
      .join(', ') || 'No permissions'
  );

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

  const fetchLogs = async () => {
    if (!canManageUsers) return;
    setLogsLoading(true);
    try {
      const { data } = await activityLogAPI.getLogs();
      setLogs(data);
    } catch {
      // silently fail – logs are non-critical
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchManagedAdmins = async () => {
    if (!isSupervisor) return;
    setManagedAdminsLoading(true);
    try {
      const { data } = await authAPI.getManagedAdmins();
      setManagedAdmins(data);
    } catch (err) {
      // Non-admins without manageUsers permission will silently fail; only show error if they should have access
      if (err.response?.status !== 403) {
        toast.error(err.response?.data?.message || 'Failed to load admin accounts');
      }
    } finally {
      setManagedAdminsLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageUsers) return;
    fetchUsers();
    fetchLogs();
    if (isSupervisor) fetchManagedAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers, isSupervisor]);

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
        name: '', email: '', password: '', status: 'Active',
        permissions: buildDefaultManagedUserPermissions(user?.email),
      });
      fetchUsers();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const onCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      await authAPI.createManagedAdmin(newAdminForm);
      toast.success('Admin account created');
      setNewAdminForm({ name: '', email: '', password: '', status: 'Active' });
      fetchManagedAdmins();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const toggleAdminStatus = async (admin) => {
    const nextStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { data } = await authAPI.updateManagedAdminStatus(admin._id, nextStatus);
      setManagedAdmins((prev) => prev.map((a) => (a._id === admin._id ? data : a)));
      toast.success(`Admin ${nextStatus === 'Active' ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAdminPasswordSave = async (e) => {
    e.preventDefault();
    if (!newAdminPwd || !pwdModal) return;
    try {
      await authAPI.updateManagedAdminPassword(pwdModal._id, newAdminPwd);
      toast.success('Password changed successfully');
      setPwdModal(null);
      setNewAdminPwd('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`Delete admin "${admin.name}"? This cannot be undone.`)) return;
    try {
      await authAPI.deleteManagedAdmin(admin._id);
      setManagedAdmins((prev) => prev.filter((a) => a._id !== admin._id));
      toast.success('Admin account deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  const toggleStatus = async (targetUser) => {
    try {
      const nextStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
      await authAPI.updateUserStatus(targetUser._id, nextStatus);
      setUsers((prev) => prev.map((u) => (u._id === targetUser._id ? { ...u, status: nextStatus } : u)));
      toast.success(`User set to ${nextStatus}`);
      fetchLogs();
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
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const changeUserPassword = async (targetUser) => {
    const newPassword = window.prompt(`Enter new password for ${targetUser.email}`);
    if (!newPassword) return;
    try {
      await authAPI.updateUser(targetUser._id, { password: newPassword });
      toast.success('Password changed');
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const editUserPermissions = (targetUser) => {
    setPermissionModal({
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      permissions: permissionEntries.reduce((acc, [key]) => {
        acc[key] = Boolean(targetUser.permissions?.[key]);
        return acc;
      }, {}),
    });
  };

  const saveUserPermissions = async (e) => {
    e.preventDefault();
    if (!permissionModal) return;
    try {
      const { data } = await authAPI.updateUser(permissionModal._id, { permissions: permissionModal.permissions });
      setUsers((prev) => prev.map((u) => (u._id === permissionModal._id ? data : u)));
      setPermissionModal(null);
      toast.success('Permissions updated');
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const parseImportedProducts = (rawText) => {
    const lines = String(rawText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.map((line) => {
      const cols = line.split('\t').map((c) => c.trim()).filter(Boolean);
      if (cols.length < 2) return null;

      let indexOffset = 0;
      if (/^\d+$/.test(cols[0])) indexOffset = 1;

      const possiblePrice = Number(cols[cols.length - 1].replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(possiblePrice)) return null;

      const name = cols[indexOffset] || '';
      const stockCode = cols.length >= indexOffset + 3 ? cols[indexOffset + 1] : '';
      if (!name) return null;

      return {
        name,
        stockCode,
        price: possiblePrice,
        category: 'General',
        quantity: 0,
      };
    }).filter(Boolean);
  };

  const onImportProducts = async (e) => {
    e.preventDefault();
    const parsed = parseImportedProducts(importText);
    if (!parsed.length) {
      toast.error('No valid rows found. Paste tab-separated rows: Name, Qty Code, Price');
      return;
    }

    setImportingProducts(true);
    try {
      const { data } = await productsAPI.importBulk(parsed);
      toast.success(`Import complete. Inserted: ${data.inserted}, Updated: ${data.updated}`);
      setImportText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImportingProducts(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Account Settings</h1>
        <p className="page-subtitle">Edit your profile and account preferences</p>
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

      {isAdmin && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Bulk Product Import</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 13 }}>
            Paste rows copied from Excel/Google Sheets in this order:
            <strong> Item Name, Qty/Code, Price</strong>. Optional first numeric column is ignored.
          </p>
          <form onSubmit={onImportProducts}>
            <div className="form-group">
              <textarea
                className="form-control"
                rows={8}
                placeholder={'Example:\n1\tBig Pin\tB21(50 in 1B)\t7000'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={importingProducts}>
              {importingProducts ? <><span className="spinner"></span> Importing...</> : 'Import Products'}
            </button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>
            Users listed here belong to this admin account. Use "Edit Permissions" to choose exactly what each user can access.
          </p>
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
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
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
                {permissionEntries.map(([key, label]) => (
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
                          <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                        </td>
                        <td>{u.status}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {getPermissionSummary(u.permissions)}
                        </td>
                        <td>
                          <div className="table-action-group" style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(u)} type="button">
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => changeUserPassword(u)} type="button">
                              Change Password
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => editUserPermissions(u)} type="button">
                              Edit Permissions
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




      {/* ── SUPERVISOR SECTION: create & manage admin accounts ─────────────── */}
      {isSupervisor && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>👔 Admin Account Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Create and manage admin (shop owner) accounts. You can only manage accounts you created.
          </p>

          {/* Create admin form */}
          <form onSubmit={onCreateAdmin}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={newAdminForm.name} onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={newAdminForm.email} onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={newAdminForm.password} onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })} required placeholder="Min 8 chars, upper+lower+number" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={newAdminForm.status} onChange={(e) => setNewAdminForm({ ...newAdminForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creatingAdmin}>
              {creatingAdmin ? <><span className="spinner" /> Creating...</> : '➕ Create Admin Account'}
            </button>
          </form>

          {/* Admin accounts table */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12, color: 'var(--text-muted)' }}>Managed Admin Accounts</h3>
            {managedAdminsLoading ? (
              <div className="page-loader"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
            ) : managedAdmins.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No admin accounts created yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedAdmins.map((admin) => (
                      <tr key={admin._id}>
                        <td><strong>{admin.name}</strong></td>
                        <td>{admin.email}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                            fontSize: 12, fontWeight: 600,
                            background: admin.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: admin.status === 'Active' ? '#10b981' : '#ef4444',
                          }}>{admin.status}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(admin.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setPwdModal(admin); setNewAdminPwd(''); }}>🔑 Password</button>
                            <button className="btn btn-ghost btn-sm" type="button"
                              style={{ color: admin.status === 'Active' ? '#f59e0b' : '#10b981' }}
                              onClick={() => toggleAdminStatus(admin)}>
                              {admin.status === 'Active' ? '🔴 Deactivate' : '🟢 Activate'}
                            </button>
                            <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteAdmin(admin)}>🗑️ Delete</button>
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

      {/* ── ACTIVITY LOG (admins see all, supervisors see creation only) ────── */}
      {canManageUsers && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>
            {isSupervisor ? '📋 Admin Activity Log' : '📋 Activity Log'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            {isSupervisor
              ? 'Actions performed by you, your admins, and their managed users.'
              : 'Actions performed by you and by the users you created.'}
          </p>
          {logsLoading ? (
            <div className="page-loader"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No activity recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>By</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionMeta = {
                      created:             { label: '✅ Created',             color: '#10b981' },
                      password_changed:    { label: '🔑 Password Changed',    color: '#f59e0b' },
                      activated:           { label: '🟢 Activated',           color: '#10b981' },
                      deactivated:         { label: '🔴 Deactivated',         color: '#ef4444' },
                      permissions_updated: { label: '⚙️ Permissions Updated', color: '#6366f1' },
                      deleted:             { label: '🗑️ Deleted',             color: '#ef4444' },
                    }[log.action] || { label: log.action, color: 'var(--text-muted)' };
                    const displayActionMeta = {
                      sale_created: { label: 'Sale Created', color: '#0ea5e9' },
                      sale_paid: { label: 'Sale Paid', color: '#10b981' },
                      sale_returned: { label: 'Sale Returned', color: '#f59e0b' },
                      sale_deleted: { label: 'Sale Deleted', color: '#ef4444' },
                      product_created: { label: 'Product Added', color: '#10b981' },
                      product_updated: { label: 'Product Edited', color: '#6366f1' },
                      product_deleted: { label: 'Product Deleted', color: '#ef4444' },
                      stock_added: { label: 'Stock Added', color: '#14b8a6' },
                    }[log.action] || actionMeta;
                    return (
                      <tr key={log._id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>{log.performedByName || '-'}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${displayActionMeta.color}20`, color: displayActionMeta.color }}>
                            {displayActionMeta.label}
                          </span>
                        </td>
                        <td>{log.targetUserName || '-'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{log.details || log.targetUserEmail || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Change Password Modal (supervisor admin management) */}
      {pwdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>🔑 Change Password</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setPwdModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Admin: <strong>{pwdModal.name}</strong> ({pwdModal.email})
            </p>
            <form onSubmit={handleAdminPasswordSave}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-control" type="password" value={newAdminPwd} onChange={(e) => setNewAdminPwd(e.target.value)} required autoFocus placeholder="Min 8 chars, upper+lower+number" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPwdModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>Edit User Permissions</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0' }}>
                  {permissionModal.name} ({permissionModal.email})
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPermissionModal(null)}>Close</button>
            </div>
            <form onSubmit={saveUserPermissions}>
              <div className="grid-2">
                {permissionEntries.map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '12px 14px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(permissionModal.permissions?.[key])}
                      onChange={(e) => setPermissionModal((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          [key]: e.target.checked,
                        },
                      }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16, marginBottom: 0 }}>
                Turn permissions on or off, then click Save Permissions to apply the changes for this user.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPermissionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Permissions</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

