const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  description: { type: String, default: '' },
  barcode: { type: String, default: '', trim: true },
  qrCode: { type: String, default: '', trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
