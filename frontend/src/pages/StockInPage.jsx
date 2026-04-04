import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { stockAPI, productsAPI } from '../services/api';
import { format } from 'date-fns';

export default function StockInPage() {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: '', note: '', date: '' });

  const fetchAll = async () => {
    try {
      const [recs, prods] = await Promise.all([stockAPI.getAll(), productsAPI.getAll()]);
      setRecords(recs.data);
      setProducts(prods.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockAPI.addStock(form);
      toast.success('Stock added successfully!');
      setShowModal(false);
      setForm({ productId: '', quantity: '', note: '', date: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Error adding stock'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📥 Stock In</h1>
        <p className="page-subtitle">Record incoming stock deliveries</p>
      </div>

      <div className="topbar">
        <div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Stock In</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📥</div>
            <h3>No stock records yet</h3>
            <p>Record your first incoming stock</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity Added</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td><strong>{r.product?.name}</strong></td>
                    <td><span className="badge badge-user">{r.product?.category}</span></td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: 15 }}>+{r.quantity}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.note || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{format(new Date(r.date), 'dd MMM yyyy, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">📥 Add Stock In</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Product</label>
                <select className="form-control" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} required>
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} (Current: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity to Add</label>
                <input className="form-control" type="number" min="1" placeholder="e.g. 50"
                  value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-control" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input className="form-control" placeholder="e.g. From supplier ABC" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? <><span className="spinner"></span> Saving...</> : '📥 Confirm Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
