import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../services/api';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/useAuth';

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyData, setDailyData] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [betweenData, setBetweenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const canViewReports = user?.role === 'admin' || user?.permissions?.viewReports;

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getDaily(date);
      setDailyData(data);
    } catch { toast.error('Failed to load daily report'); }
    finally { setLoading(false); }
  }, [date]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getPending();
      setPendingData(data);
    } catch { toast.error('Failed to load pending report'); }
    finally { setLoading(false); }
  }, []);

  const fetchBetween = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getBetween(startDate, endDate);
      setBetweenData(data);
    } catch {
      toast.error('Failed to load between-dates report');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => {
    if (tab === 'daily') fetchDaily();
    else if (tab === 'pending') fetchPending();
    else fetchBetween();
  }, [tab, fetchDaily, fetchPending, fetchBetween]);

  if (!canViewReports) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Reports Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)' }}>Your account does not have the "View Reports" permission.</p>
      </div>
    );
  }

  const tabStyle = (t) => ({
    padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    border: 'none', transition: 'all 0.2s',
    background: tab === t ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--dark-2)',
    color: tab === t ? '#fff' : 'var(--text-muted)',
    boxShadow: tab === t ? '0 4px 15px rgba(99,102,241,0.3)' : 'none'
  });

  const downloadDailyPdf = () => {
    if (!dailyData) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Daily Sales Report - ${format(new Date(date), 'dd MMM yyyy')}`, 14, 14);
    doc.setFontSize(11);
    doc.text(`Sales: ${dailyData.count} | Revenue: RWF ${dailyData.totalRevenue.toLocaleString()} | Pending: RWF ${dailyData.totalPending.toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Product', 'Qty', 'Total', 'Payment', 'Method', 'Customer', 'Phone']],
      body: (dailyData.sales || []).map((s, i) => [
        i + 1,
        s.product?.name || '-',
        s.quantity,
        s.totalPrice,
        s.paymentStatus,
        s.paymentType || 'Cash',
        s.customerName || '-',
        s.customerPhone || '-',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`daily-report-${date}.pdf`);
  };

  const downloadPendingPdf = () => {
    if (!pendingData) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Pending Payments Report', 14, 14);
    doc.setFontSize(11);
    doc.text(`Customers: ${pendingData.count} | Total Owed: RWF ${pendingData.totalOwed.toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Customer', 'Phone', 'Product', 'Qty', 'Amount Owed', 'Date']],
      body: (pendingData.pending || []).map((s, i) => [
        i + 1,
        s.customerName || '-',
        s.customerPhone || '-',
        s.product?.name || '-',
        s.quantity,
        s.amountOwed,
        format(new Date(s.date), 'dd MMM yyyy'),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
    });
    doc.save(`pending-payments-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const downloadDailyExcel = () => {
    if (!dailyData) return;
    const rows = (dailyData.sales || []).map((s, i) => ({
      No: i + 1,
      Product: s.product?.name || '-',
      Quantity: s.quantity,
      'Unit Price': s.unitPrice,
      'Total Price': s.totalPrice,
      Payment: s.paymentStatus,
      Method: s.paymentType || 'Cash',
      Customer: s.customerName || '-',
      Phone: s.customerPhone || '-',
      Date: format(new Date(s.date), 'yyyy-MM-dd HH:mm'),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Daily Sales');
    XLSX.writeFile(wb, `daily-report-${date}.xlsx`);
  };

  const downloadPendingExcel = () => {
    if (!pendingData) return;
    const rows = (pendingData.pending || []).map((s, i) => ({
      No: i + 1,
      Customer: s.customerName || '-',
      Phone: s.customerPhone || '-',
      Product: s.product?.name || '-',
      Quantity: s.quantity,
      'Amount Owed': s.amountOwed,
      Date: format(new Date(s.date), 'yyyy-MM-dd'),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Pending Payments');
    XLSX.writeFile(wb, `pending-payments-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📈 Reports</h1>
        <p className="page-subtitle">Sales and payment reports</p>
      </div>

      {/* Tabs */}
      <div className="reports-tabs" style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button style={tabStyle('daily')} onClick={() => setTab('daily')}>📅 Daily Sales</button>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>💳 Pending Payments</button>
        <button style={tabStyle('between')} onClick={() => setTab('between')}>🗓️ Between Dates</button>
      </div>

      {/* Daily Report */}
      {tab === 'daily' && (
        <div>
          <div className="reports-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <input type="date" className="form-control reports-date-input" style={{ width: 200 }} value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn btn-primary" onClick={fetchDaily}>🔍 Load Report</button>
            <button className="btn btn-success" onClick={downloadDailyPdf} disabled={!dailyData}>⬇️ Download PDF</button>
            <button className="btn btn-ghost" onClick={downloadDailyExcel} disabled={!dailyData}>📊 Download Excel</button>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
          ) : dailyData ? (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-icon green">🛒</div>
                  <div>
                    <div className="stat-value">{dailyData.count}</div>
                    <div className="stat-label">Sales Today</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">💰</div>
                  <div>
                    <div className="stat-value">RWF {dailyData.totalRevenue.toLocaleString()}</div>
                    <div className="stat-label">Revenue Collected</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orange">⏳</div>
                  <div>
                    <div className="stat-value">RWF {dailyData.totalPending.toLocaleString()}</div>
                    <div className="stat-label">Pending Amount</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 0 }}>
                {dailyData.sales.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No sales on {format(new Date(date), 'dd MMM yyyy')}</h3>
                    <p>Try selecting a different date</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Product</th><th>Qty</th><th>Total (RWF)</th><th>Payment</th><th>Method</th><th>Customer</th><th>Phone</th></tr>
                      </thead>
                      <tbody>
                        {dailyData.sales.map((s, i) => (
                          <tr key={s._id}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td><strong>{s.product?.name}</strong></td>
                            <td>{s.quantity}</td>
                            <td style={{ fontWeight: 700, color: s.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b' }}>{s.totalPrice.toLocaleString()}</td>
                            <td><span className={`badge ${s.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>{s.paymentStatus === 'Paid' ? '✅ Paid' : '⏳ Pending'}</span></td>
                            <td style={{ color: 'var(--text-muted)' }}>{s.paymentType || 'Cash'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{s.customerName || '—'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{s.customerPhone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Pending Report */}
      {tab === 'pending' && (
        <div>
          <div className="reports-toolbar reports-toolbar-right" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-success" onClick={downloadPendingPdf} disabled={!pendingData}>⬇️ Download PDF</button>
            <button className="btn btn-ghost" onClick={downloadPendingExcel} disabled={!pendingData}>📊 Download Excel</button>
          </div>
          {loading ? (
            <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
          ) : pendingData ? (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-icon orange">👥</div>
                  <div>
                    <div className="stat-value">{pendingData.count}</div>
                    <div className="stat-label">Pending Customers</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon red">💳</div>
                  <div>
                    <div className="stat-value">RWF {pendingData.totalOwed.toLocaleString()}</div>
                    <div className="stat-label">Total Amount Owed</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 0 }}>
                {pendingData.pending.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <h3>No pending payments!</h3>
                    <p>All customers are up to date</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Customer</th><th>Phone</th><th>Product</th><th>Qty</th><th>Amount Owed (RWF)</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {pendingData.pending.map((s, i) => (
                          <tr key={s._id}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td><strong>{s.customerName}</strong></td>
                            <td>{s.customerPhone || '—'}</td>
                            <td>{s.product?.name}</td>
                            <td>{s.quantity}</td>
                            <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: 15 }}>{s.amountOwed.toLocaleString()}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{format(new Date(s.date), 'dd MMM yyyy')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'between' && (
        <div>
          <div className="reports-toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="date" className="form-control reports-date-input" style={{ width: 200 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="form-control reports-date-input" style={{ width: 200 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button className="btn btn-primary" onClick={fetchBetween}>Load Between Dates</button>
          </div>
          {loading ? (
            <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
          ) : betweenData ? (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Product</th><th>Qty</th><th>Total</th><th>Payment</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {betweenData.sales.map((s, i) => (
                      <tr key={s._id}>
                        <td>{i + 1}</td>
                        <td>{s.product?.name || '-'}</td>
                        <td>{s.quantity}</td>
                        <td>{s.totalPrice?.toLocaleString?.() || s.totalPrice}</td>
                        <td>{s.paymentStatus}</td>
                        <td>{format(new Date(s.date), 'dd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
