import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const StatCard = ({ icon, label, value, colorClass, prefix = '' }) => (
  <div className="stat-card">
    <div className={`stat-icon ${colorClass}`}>{icon}</div>
    <div>
      <div className="stat-value">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getSummary()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-loader">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const chartData = data?.recentSales?.map(d => ({
    date: format(new Date(d._id), 'MMM dd'),
    Revenue: d.total,
    Sales: d.count,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
        <p className="page-subtitle">Overview of your stock and sales performance</p>
      </div>

      <div className="stats-grid">
        <StatCard icon="📦" label="Total Products" value={data?.totalProducts ?? 0} colorClass="purple" />
        <StatCard icon="🏷️" label="Available Stock" value={data?.availableStock ?? 0} colorClass="blue" />
        <StatCard icon="🛒" label="Total Sales" value={data?.totalSales ?? 0} colorClass="green" />
        <StatCard icon="💰" label="Total Revenue" value={data?.totalRevenue ?? 0} colorClass="green" prefix="RWF " />
        <StatCard icon="⏳" label="Pending Payments" value={data?.pendingCount ?? 0} colorClass="orange" />
        <StatCard icon="💳" label="Amount Owed" value={data?.pendingTotal ?? 0} colorClass="red" prefix="RWF " />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📈 Revenue (Last 7 Days)</h2>
        {chartData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📉</div>
            <h3>No sales data yet</h3>
            <p>Start recording sales to see your revenue chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e1e35', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
