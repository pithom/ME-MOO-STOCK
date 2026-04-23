const express = require('express');
const router = express.Router();
const StockIn = require('../models/StockIn');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { protect, hasAnyPermission } = require('../middleware/auth');
const resolveShopOwnerId = (user) => user.shopOwner || user._id;
const hasInventoryPageAccess = hasAnyPermission(['addProducts', 'editProducts', 'deleteProducts']);

// GET all stock-in records
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const records = await StockIn.find({ owner: ownerId }).populate('product', 'name category').sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST stock in - increase product quantity
router.post('/', protect, hasInventoryPageAccess, async (req, res) => {
  try {
    const { productId, quantity, note, date, expectedProductUpdatedAt, expectedProductQuantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' });
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });
    const ownerId = resolveShopOwnerId(req.user);
    const product = await Product.findOne({ _id: productId, owner: ownerId });
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
      owner: ownerId,
      product: productId,
      quantity: qty,
      note,
      date: date || Date.now(),
    });
    const populated = await record.populate('product', 'name category');
    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'stock_added',
      targetType: 'stock',
      targetUserId: record._id,
      targetUserName: populated.product?.name || 'Stock In',
      details: `Qty added: ${qty}`,
    });
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
