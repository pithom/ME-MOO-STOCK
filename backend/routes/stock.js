const express = require('express');
const router = express.Router();
const StockIn = require('../models/StockIn');
const Product = require('../models/Product');
const { protect, hasPermission } = require('../middleware/auth');

// GET all stock-in records
router.get('/', protect, async (req, res) => {
  try {
    const records = await StockIn.find({ owner: req.user._id }).populate('product', 'name category').sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST stock in - increase product quantity
router.post('/', protect, hasPermission('addProducts'), async (req, res) => {
  try {
    const { productId, quantity, note, date, expectedProductUpdatedAt, expectedProductQuantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' });
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });
    const product = await Product.findOne({ _id: productId, owner: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (expectedProductUpdatedAt && new Date(expectedProductUpdatedAt).getTime() !== new Date(product.updatedAt).getTime()) {
      return res.status(409).json({
        message: 'Conflict detected: product was modified before stock-in sync.',
        current: product,
      });
    }
    if (Number.isFinite(Number(expectedProductQuantity)) && Number(expectedProductQuantity) !== Number(product.quantity)) {
      return res.status(409).json({
        message: 'Conflict detected: product quantity changed before stock-in sync.',
        current: product,
      });
    }

    product.quantity += qty;
    await product.save();
    const record = await StockIn.create({
      owner: req.user._id,
      product: productId,
      quantity: qty,
      note,
      date: date || Date.now(),
    });
    const populated = await record.populate('product', 'name category');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

