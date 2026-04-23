import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { productsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const EMPTY_FORM = { name: '', category: '', price: '', quantity: '', description: '', barcode: '', qrCode: '' };

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const lowStockThreshold = Number(localStorage.getItem('lowStockThreshold') || 5);
  const canManageInventoryPage = Boolean(
    user?.role === 'admin'
    || user?.permissions?.addProducts
    || user?.permissions?.editProducts
    || user?.permissions?.deleteProducts
  );

  const fetchProducts = async () => {
    try {
      const { data } = await productsAPI.getAll();
      setProducts(data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.quantity,
      description: product.description || '',
      barcode: product.barcode || '',
      qrCode: product.qrCode || '',
    });
    setEditId(product._id);
    setShowModal(true);
  };

  const generateQrFromFields = async () => {
    if (!form.name.trim()) {
      toast.error('Enter product name before generating QR');
      return;
    }
    const qrPayload = JSON.stringify({
      name: form.name,
      category: form.category,
      barcode: form.barcode,
      price: form.price,
    });
    const dataUrl = await QRCode.toDataURL(qrPayload);
    setForm((prev) => ({ ...prev, qrCode: dataUrl }));
    toast.success('QR generated');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const current = products.find((product) => product._id === editId);
        await productsAPI.update(editId, { ...form, expectedUpdatedAt: current?.updatedAt });
        toast.success('Product updated!');
      } else {
        await productsAPI.create(form);
        toast.success('Product added!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setDeleting(id);
    try {
      const current = products.find((product) => product._id === id);
      await productsAPI.delete(id, { expectedUpdatedAt: current?.updatedAt });
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
    || product.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <p className="page-subtitle">Manage your product inventory</p>
      </div>

      <div className="topbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
          <span className="search-icon">Search</span>
          <input className="form-control" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canManageInventoryPage && <button className="btn btn-primary" onClick={openAdd}>Add Product</button>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">Box</div>
            <h3>No products found</h3>
            <p>Add your first product to get started</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price (RWF)</th>
                  <th>Quantity</th>
                  <th>Stock Status</th>
                  <th>Barcode</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, index) => (
                  <tr key={product._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                    <td><strong>{product.name}</strong></td>
                    <td><span className="badge badge-user">{product.category}</span></td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{Number(product.price).toLocaleString()}</td>
                    <td><strong>{Number(product.quantity) || 0}</strong></td>
                    <td>
                      <span className={`badge ${(Number(product.quantity) || 0) <= lowStockThreshold ? 'badge-pending' : 'badge-paid'}`}>
                        {(Number(product.quantity) || 0) <= lowStockThreshold ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{product.barcode || '-'}</td>
                    <td>
                      <div className="table-action-group" style={{ display: 'flex', gap: 8 }}>
                        {canManageInventoryPage && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}>Edit</button>}
                        {canManageInventoryPage && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product._id)} disabled={deleting === product._id}>
                            {deleting === product._id ? '...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-control" placeholder="e.g. Coca Cola 500ml" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-control" placeholder="e.g. Beverages" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (RWF)</label>
                  <input className="form-control" type="number" placeholder="0" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Quantity</label>
                <input className="form-control" type="number" placeholder="0" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="form-control" placeholder="Short description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Barcode (optional)</label>
                  <input className="form-control" placeholder="e.g. 123456789012" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">QR Code</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={generateQrFromFields}>Generate QR</button>
                </div>
              </div>
              {form.qrCode && (
                <div className="form-group">
                  <img src={form.qrCode} alt="Product QR" style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid var(--card-border)' }} />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner"></span> Saving...</> : editId ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
