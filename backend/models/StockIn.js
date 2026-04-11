const mongoose = require('mongoose');

const stockInSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('StockIn', stockInSchema);
