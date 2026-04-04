import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';
import { format } from 'date-fns';

export default function PendingPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState({});

  const fetchPending = async () => {
    try {
      const { data } = await salesAPI.getPending();
      setPending(data);
    } catch { toast.error('Failed to load pending payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this payment as Paid?')) return;
    setPaying(id);
    try {
      await salesAPI.markPaid(id, { paymentType: paymentTypes[id] || 'Cash' });
      toast.success('Payment marked as Paid! ✅');
      fetchPending();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setPaying(null); }
  };

  const totalOwed = pending.reduce((sum, s) => sum + s.amountOwed, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⏳ Pay Pending</h1>
        <p className="page-subtitle">Manage credit sales and pending payments</p>
      </div>

      {/* Summary Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
        border: '1px solid rgba(245,158,11,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon orange" style={{ width: 56, height: 56 }}>💳</div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>TOTAL AMOUNT OWED</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>RWF {totalOwed.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>PENDING CUSTOMERS</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{pending.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
        ) : pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>All payments cleared!</h3>
            <p>No pending payments at the moment</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Amount Owed (RWF)</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0
                        }}>{s.customerName?.[0]?.toUpperCase()}</div>
                        <strong>{s.customerName}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.customerPhone || '—'}</td>
                    <td>{s.product?.name}</td>
                    <td>{s.quantity}</td>
                    <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: 16 }}>
                      {s.amountOwed.toLocaleString()}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ minWidth: 130 }}
                        value={paymentTypes[s._id] || s.paymentType || 'Cash'}
                        onChange={(e) => setPaymentTypes((prev) => ({ ...prev, [s._id]: e.target.value }))}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Card">Card</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{format(new Date(s.date), 'dd MMM yyyy')}</td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleMarkPaid(s._id)}
                        disabled={paying === s._id}
                      >
                        {paying === s._id ? <><span className="spinner"></span> ...</> : '✅ Mark Paid'}
                      </button>
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
