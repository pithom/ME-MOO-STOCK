const express = require('express');
const router = express.Router();
const StockIn = require('../models/StockIn');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// GET all stock-in records
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const records = await StockIn.find().populate('product', 'name category').sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST stock in - increase product quantity
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { productId, quantity, note, date } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' });
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.quantity += qty;
    await product.save();
    const record = await StockIn.create({ product: productId, quantity: qty, note, date: date || Date.now() });
    const populated = await record.populate('product', 'name category');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

