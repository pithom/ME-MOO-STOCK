import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { salesAPI, productsAPI } from '../services/api';

const EMPTY_FORM = {
  productId: '',
  quantity: '',
  unitPrice: '',
  paymentStatus: 'Paid',
  paymentType: 'Cash',
  customerName: '',
  customerPhone: '',
};

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    productsAPI.getAll()
      .then(r => setProducts(r.data.filter(p => p.quantity > 0)))
      .catch(() => toast.error('Failed to load products'));
  }, []);

  const handleProductChange = (e) => {
    const id = e.target.value;
    const prod = products.find(p => p._id === id);
    setSelectedProduct(prod || null);
    setForm({ ...form, productId: id, quantity: '', unitPrice: prod ? String(prod.price) : '' });
  };

  const totalPrice = form.quantity && form.unitPrice
    ? (Number(form.unitPrice) * Number(form.quantity)).toLocaleString()
    : '0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.customerPhone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }
    if (selectedProduct && Number(form.quantity) > selectedProduct.quantity) {
      toast.error(`Only ${selectedProduct.quantity} units available`);
      return;
    }
    if (Number(form.unitPrice) < 0) {
      toast.error('Unit price must be 0 or more');
      return;
    }
    setSaving(true);
    try {
      await salesAPI.create(form);
      toast.success('Sale recorded successfully! 🎉');
      setForm(EMPTY_FORM);
      setSelectedProduct(null);
      // Refresh products
      const r = await productsAPI.getAll();
      setProducts(r.data.filter(p => p.quantity > 0));
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating sale'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🛒 New Sale</h1>
        <p className="page-subtitle">Create a new sale transaction</p>
      </div>

      <div style={{ maxWidth: 760 }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select className="form-control" value={form.productId} onChange={handleProductChange} required>
                <option value="">-- Choose a product --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} — RWF {p.price.toLocaleString()} (Stock: {p.quantity})</option>
                ))}
              </select>
              {products.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--warning)', marginTop: 6 }}>⚠️ No products with available stock</p>
              )}
            </div>

            {selectedProduct && (
              <div className="card" style={{ marginBottom: 18, background: 'var(--dark-2)', padding: 16, display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>PRODUCT</div>
                  <div style={{ fontWeight: 700 }}>{selectedProduct.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>CATEGORY</div>
                  <span className="badge badge-user">{selectedProduct.category}</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>UNIT PRICE</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>RWF {selectedProduct.price.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>AVAILABLE</div>
                  <div style={{ fontWeight: 700 }}>{selectedProduct.quantity} units</div>
                </div>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-control" type="number" min="1"
                  max={selectedProduct?.quantity || undefined}
                  placeholder="Enter quantity"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price (editable)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  placeholder="Enter sale price"
                  value={form.unitPrice}
                  onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* TOTAL PRICE DISPLAY */}
            <div className="card" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '16px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>💰 Total Price</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-light)' }}>RWF {totalPrice}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['Paid', 'Pending'].map(type => (
                  <label key={type} style={{ flex: 1, cursor: 'pointer' }}>
                    <input type="radio" name="paymentStatus" value={type}
                      checked={form.paymentStatus === type}
                      onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
                      style={{ display: 'none' }}
                    />
                    <div className="card" style={{
                      padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                      border: form.paymentStatus === type
                        ? (type === 'Paid' ? '2px solid #10b981' : '2px solid #f59e0b')
                        : '1px solid var(--card-border)',
                      background: form.paymentStatus === type
                        ? (type === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)')
                        : 'var(--dark-2)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{type === 'Paid' ? '✅' : '⏳'}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: type === 'Paid' ? '#10b981' : '#f59e0b' }}>{type === 'Paid' ? 'Paid Now' : 'Pay Pending'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{type === 'Paid' ? 'Cash or transfer' : 'Credit / Owe'}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ animation: 'slideUp 0.2s ease' }}>
                <label className="form-label">Customer Name *</label>
                <input className="form-control" placeholder="Enter customer name"
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  required />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Phone Number *</label>
                <input
                  className="form-control"
                  placeholder="e.g. 078xxxxxxx"
                  value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-control"
                value={form.paymentType}
                onChange={e => setForm({ ...form, paymentType: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Card">Card</option>
              </select>
              {form.paymentStatus === 'Pending' && (
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6 }}>⚠️ This sale will stay pending until paid later.</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} disabled={saving}>
              {saving ? <><span className="spinner"></span> Processing...</> : '🛒 Complete Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
