const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  items: { type: [saleItemSchema], default: [] },
  totalPrice: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' },
  paymentType: { type: String, enum: ['Cash', 'Mobile Money', 'Card'], default: 'Cash' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  amountOwed: { type: Number, default: 0 },
  paidAt: { type: Date, default: null },
  isReturned: { type: Boolean, default: false },
  returnMethod: {
    type: String,
    enum: ['Refund Cash', 'Exchange', 'Store Credit', 'Other', ''],
    default: '',
  },
  returnNote: { type: String, default: '' },
  returnedAt: { type: Date, default: null },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
