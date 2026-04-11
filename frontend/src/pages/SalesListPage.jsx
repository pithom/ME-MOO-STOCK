import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';
import { format } from 'date-fns';

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [returning, setReturning] = useState(null);

  const fetchSales = async () => {
    try {
      const { data } = await salesAPI.getAll();
      setSales(data);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSales(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sale? Stock will be restored.')) return;
    setDeleting(id);
    try {
      await salesAPI.delete(id);
      toast.success('Sale deleted');
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete sale');
    } finally {
      setDeleting(null);
    }
  };

  const handleReturn = async (sale) => {
    if (sale.isReturned) return;
    const method = window.prompt('Return method (Refund Cash / Exchange / Store Credit / Other):', 'Refund Cash');
    if (!method) return;
    const note = window.prompt('Return note (optional):', '') || '';

    setReturning(sale._id);
    try {
      await salesAPI.returnSale(sale._id, { returnMethod: method, returnNote: note });
      toast.success('Product return recorded and stock restored');
      setSales((prev) => prev.map((row) => (
        row._id === sale._id
          ? { ...row, isReturned: true, returnMethod: method, returnNote: note, returnedAt: new Date().toISOString() }
          : row
      )));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record return');
    } finally {
      setReturning(null);
    }
  };

  const filtered = sales.filter(s =>
    s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = sales.filter(s => s.paymentStatus === 'Paid' && !s.isReturned).reduce((sum, s) => sum + s.totalPrice, 0);
  const totalPending = sales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.amountOwed, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 Sales History</h1>
        <p className="page-subtitle">View all recorded transactions</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon green">🛒</div>
          <div>
            <div className="stat-value">{sales.length}</div>
            <div className="stat-label">Total Transactions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div>
            <div className="stat-value">RWF {totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Revenue Collected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div>
            <div className="stat-value">RWF {totalPending.toLocaleString()}</div>
            <div className="stat-label">Amount Pending</div>
          </div>
        </div>
      </div>

      <div className="topbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
          <span className="search-icon">🔍</span>
          <input className="form-control" placeholder="Search by product or customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>No sales recorded</h3>
            <p>Create your first sale to see it here</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total (RWF)</th>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Return</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td><strong>{s.product?.name}</strong></td>
                    <td>{s.quantity}</td>
                    <td style={{ fontWeight: 700, color: s.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b' }}>
                      {s.totalPrice.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${s.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                        {s.paymentStatus === 'Paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.paymentType || 'Cash'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.customerName || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.customerPhone || '—'}</td>
                    <td>
                      {s.isReturned ? (
                        <span className="badge badge-low">↩ {s.returnMethod || 'Returned'}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{format(new Date(s.date), 'dd MMM yyyy')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleReturn(s)}
                          disabled={returning === s._id || s.isReturned}
                          title={s.isReturned ? 'Already returned' : 'Return product and restore stock'}
                        >
                          {returning === s._id ? '...' : s.isReturned ? '↩ Returned' : '↩ Return'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(s._id)}
                          disabled={deleting === s._id}
                        >
                          {deleting === s._id ? '...' : '🗑️ Delete'}
                        </button>
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
  );
}
