import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { salesAPI, productsAPI } from '../services/api';
import { getQueueSummary } from '../services/offlineSync';

const EMPTY_FORM = {
  paymentStatus: 'Paid',
  paymentType: 'Cash',
  customerName: '',
  customerPhone: '',
};

const EMPTY_ITEM = {
  productId: '',
  quantity: '',
  unitPrice: '',
};

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [cartItems, setCartItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    productsAPI.getAll()
      .then((response) => setProducts(response.data.filter((product) => product.quantity > 0)))
      .catch(() => toast.error('Failed to load products'));

    getQueueSummary().then((summary) => setPendingSyncCount(summary.queued)).catch(() => {});
  }, []);

  const handleProductChange = (e) => {
    const id = e.target.value;
    const product = products.find((entry) => entry._id === id);

    setSelectedProduct(product || null);
    setItemForm({
      productId: id,
      quantity: '',
      unitPrice: product ? String(product.price) : '',
    });
  };

  const currentLineTotal = itemForm.quantity && itemForm.unitPrice
    ? (Number(itemForm.quantity) * Number(itemForm.unitPrice)).toLocaleString()
    : '0';

  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addItemToCart = () => {
    if (!selectedProduct) {
      toast.error('Choose a product first');
      return;
    }

    const quantity = Number(itemForm.quantity);
    const unitPrice = Number(itemForm.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (quantity > selectedProduct.quantity) {
      toast.error(`Only ${selectedProduct.quantity} units available`);
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error('Unit price must be 0 or more');
      return;
    }
    if (cartItems.some((item) => item.productId === selectedProduct._id)) {
      toast.error('This product is already in the sale');
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        productId: selectedProduct._id,
        product: selectedProduct,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        expectedProductUpdatedAt: selectedProduct.updatedAt,
        expectedProductQuantity: selectedProduct.quantity,
      },
    ]);
    setItemForm(EMPTY_ITEM);
    setSelectedProduct(null);
  };

  const removeCartItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error('Add at least one product to this sale');
      return;
    }
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.customerPhone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }

    setSaving(true);
    try {
      await salesAPI.create({
        paymentStatus: form.paymentStatus,
        paymentType: form.paymentType,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expectedProductUpdatedAt: item.expectedProductUpdatedAt,
          expectedProductQuantity: item.expectedProductQuantity,
        })),
      });

      if (navigator.onLine) {
        toast.success('Sale recorded successfully!');
      }

      setForm(EMPTY_FORM);
      setItemForm(EMPTY_ITEM);
      setCartItems([]);
      setSelectedProduct(null);

      if (navigator.onLine) {
        const response = await productsAPI.getAll();
        setProducts(response.data.filter((product) => product.quantity > 0));
      }

      const summary = await getQueueSummary();
      setPendingSyncCount(summary.queued);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Sale</h1>
        <p className="page-subtitle">Sell multiple products to one customer in one transaction</p>
        {pendingSyncCount > 0 && (
          <p className="page-subtitle" style={{ color: 'var(--warning)' }}>
            {pendingSyncCount} offline sale(s) waiting for sync
          </p>
        )}
      </div>

      <div className="sale-form-shell" style={{ maxWidth: 760 }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Product</label>
              <select className="form-control" value={itemForm.productId} onChange={handleProductChange}>
                <option value="">-- Choose a product --</option>
                {products.map((product) => (
                  <option
                    key={product._id}
                    value={product._id}
                    disabled={cartItems.some((item) => item.productId === product._id)}
                  >
                    {product.name} - RWF {product.price.toLocaleString()} (Stock: {product.quantity})
                  </option>
                ))}
              </select>
              {products.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--warning)', marginTop: 6 }}>
                  No products with available stock
                </p>
              )}
            </div>

            {selectedProduct && (
              <div className="card sale-product-preview" style={{ marginBottom: 18, background: 'var(--dark-2)', padding: 16, display: 'flex', gap: 20 }}>
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
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity || undefined}
                  placeholder="Enter quantity"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price (editable)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  placeholder="Enter sale price"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="card sale-total-row" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '16px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Current Product Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-light)' }}>RWF {currentLineTotal}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
              <button type="button" className="btn btn-ghost" onClick={addItemToCart}>
                Add Product to Sale
              </button>
            </div>

            <div className="card" style={{ marginBottom: 18, background: 'var(--dark-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: cartItems.length ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>SALE ITEMS</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{cartItems.length} product(s)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>TOTAL</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-light)' }}>RWF {cartTotal.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cartQuantity} unit(s)</div>
                </div>
              </div>

              {cartItems.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>No products added yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--card-border)',
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {item.quantity} x RWF {item.unitPrice.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <strong>RWF {item.totalPrice.toLocaleString()}</strong>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCartItem(item.productId)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <div className="sale-payment-options" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['Paid', 'Pending'].map((type) => (
                  <label key={type} style={{ flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="paymentStatus"
                      value={type}
                      checked={form.paymentStatus === type}
                      onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                      style={{ display: 'none' }}
                    />
                    <div className="card" style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: form.paymentStatus === type
                        ? (type === 'Paid' ? '2px solid #10b981' : '2px solid #f59e0b')
                        : '1px solid var(--card-border)',
                      background: form.paymentStatus === type
                        ? (type === 'Paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)')
                        : 'var(--dark-2)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{type}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: type === 'Paid' ? '#10b981' : '#f59e0b' }}>
                        {type === 'Paid' ? 'Paid Now' : 'Pay Pending'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {type === 'Paid' ? 'Cash or transfer' : 'Credit / Owe'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ animation: 'slideUp 0.2s ease' }}>
                <label className="form-label">Customer Name *</label>
                <input
                  className="form-control"
                  placeholder="Enter customer name"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Phone Number *</label>
                <input
                  className="form-control"
                  placeholder="e.g. 078xxxxxxx"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-control"
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Card">Card</option>
              </select>
              {form.paymentStatus === 'Pending' && (
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6 }}>
                  This sale will stay pending until paid later.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
              disabled={saving || cartItems.length === 0}
            >
              {saving ? <><span className="spinner"></span> Processing...</> : 'Complete Sale'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
