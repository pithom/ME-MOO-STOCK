import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { salesAPI } from '../services/api';
import { format } from 'date-fns';
import { getSaleProductDetails, getSaleProductLabel, getSaleQuantity } from '../utils/sales';

export default function PendingPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState({});

  const fetchPending = async () => {
    try {
      const { data } = await salesAPI.getPending();
      setPending(data);
    } catch {
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this payment as Paid?')) return;
    setPaying(id);
    try {
      await salesAPI.markPaid(id, { paymentType: paymentTypes[id] || 'Cash' });
      toast.success('Payment marked as paid');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setPaying(null);
    }
  };

  const totalOwed = pending.reduce((sum, sale) => sum + sale.amountOwed, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pay Pending</h1>
        <p className="page-subtitle">Manage credit sales and pending payments</p>
      </div>

      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
        border: '1px solid rgba(245,158,11,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon orange" style={{ width: 56, height: 56 }}>Due</div>
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
            <div className="empty-icon">Paid</div>
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
                  <th>Products</th>
                  <th>Qty</th>
                  <th>Amount Owed (RWF)</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((sale, i) => (
                  <tr key={sale._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          color: '#fff',
                          flexShrink: 0,
                        }}>
                          {sale.customerName?.[0]?.toUpperCase()}
                        </div>
                        <strong>{sale.customerName}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{sale.customerPhone || '-'}</td>
                    <td>
                      <strong>{getSaleProductLabel(sale)}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {getSaleProductDetails(sale)}
                      </div>
                    </td>
                    <td>{getSaleQuantity(sale)}</td>
                    <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: 16 }}>
                      {sale.amountOwed.toLocaleString()}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ minWidth: 130 }}
                        value={paymentTypes[sale._id] || sale.paymentType || 'Cash'}
                        onChange={(e) => setPaymentTypes((prev) => ({ ...prev, [sale._id]: e.target.value }))}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Card">Card</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{format(new Date(sale.date), 'dd MMM yyyy')}</td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleMarkPaid(sale._id)}
                        disabled={paying === sale._id}
                      >
                        {paying === sale._id ? <><span className="spinner"></span> ...</> : 'Mark Paid'}
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
