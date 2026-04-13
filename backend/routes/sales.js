const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect, hasPermission } = require('../middleware/auth');

// GET all sales
router.get('/', protect, async (req, res) => {
  try {
    const sales = await Sale.find({ owner: req.user._id }).populate('product', 'name category price').sort({ date: -1 });
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET pending payments
router.get('/pending', protect, async (req, res) => {
  try {
    const pending = await Sale.find({ owner: req.user._id, paymentStatus: 'Pending' })
      .populate('product', 'name category price')
      .sort({ date: -1 });
    res.json(pending);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create a sale
router.post('/', protect, hasPermission('addProducts'), async (req, res) => {
  try {
    const {
      productId,
      quantity,
      paymentStatus,
      paymentType,
      customerName,
      customerPhone,
      unitPrice,
      expectedProductUpdatedAt,
      expectedProductQuantity,
    } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' });

    const product = await Product.findOne({ _id: productId, owner: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (expectedProductUpdatedAt && new Date(expectedProductUpdatedAt).getTime() !== new Date(product.updatedAt).getTime()) {
      return res.status(409).json({
        message: 'Conflict detected: product was modified before sale sync.',
        current: product,
      });
    }
    if (Number.isFinite(Number(expectedProductQuantity)) && Number(expectedProductQuantity) !== Number(product.quantity)) {
      return res.status(409).json({
        message: 'Conflict detected: product quantity changed before sale sync.',
        current: product,
      });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than 0' });
    if (product.quantity < qty) return res.status(400).json({ message: 'Insufficient stock' });

    const normalizedPaymentStatus = paymentStatus === 'Pending' ? 'Pending' : 'Paid';
    const normalizedPaymentType = ['Cash', 'Mobile Money', 'Card'].includes(paymentType) ? paymentType : 'Cash';
    const saleUnitPrice = unitPrice == null ? Number(product.price) : Number(unitPrice);
    if (!Number.isFinite(saleUnitPrice) || saleUnitPrice < 0) {
      return res.status(400).json({ message: 'Unit price must be a valid non-negative number' });
    }
    const totalPrice = saleUnitPrice * qty;
    const amountOwed = normalizedPaymentStatus === 'Pending' ? totalPrice : 0;

    product.quantity -= qty;
    await product.save();

    const sale = await Sale.create({
      owner: req.user._id,
      product: productId,
      quantity: qty,
      unitPrice: saleUnitPrice,
      totalPrice,
      paymentStatus: normalizedPaymentStatus,
      paymentType: normalizedPaymentType,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      amountOwed,
      paidAt: normalizedPaymentStatus === 'Paid' ? new Date() : null,
    });
    const populated = await sale.populate('product', 'name category price');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH mark pending sale as paid
router.patch('/:id/pay', protect, async (req, res) => {
  try {
    const { paymentType } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, owner: req.user._id });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.paymentStatus === 'Paid') return res.status(400).json({ message: 'Already paid' });

    if (!sale.customerName || !sale.customerPhone) {
      return res.status(400).json({ message: 'Pending payment must include customer name and phone number' });
    }

    sale.paymentStatus = 'Paid';
    sale.paymentType = ['Cash', 'Mobile Money', 'Card'].includes(paymentType) ? paymentType : sale.paymentType;
    sale.amountOwed = 0;
    sale.paidAt = new Date();
    await sale.save();
    const populated = await sale.populate('product', 'name category price');
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH mark sale as returned and restore stock
router.patch('/:id/return', protect, async (req, res) => {
  try {
    const { returnMethod, returnNote } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, owner: req.user._id });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.isReturned) return res.status(400).json({ message: 'Sale is already returned' });

    const allowedMethods = ['Refund Cash', 'Exchange', 'Store Credit', 'Other'];
    const normalizedMethod = allowedMethods.includes(returnMethod) ? returnMethod : 'Other';

    const product = await Product.findOne({ _id: sale.product, owner: req.user._id });
    if (product) {
      product.quantity += Number(sale.quantity);
      await product.save();
    }

    sale.isReturned = true;
    sale.returnMethod = normalizedMethod;
    sale.returnNote = returnNote || '';
    sale.returnedAt = new Date();
    await sale.save();

    const populated = await sale.populate('product', 'name category price');
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE sale
router.delete('/:id', protect, hasPermission('deleteProducts'), async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const product = await Product.findOne({ _id: sale.product, owner: req.user._id });
    if (product) {
      product.quantity += Number(sale.quantity);
      await product.save();
    }
    res.json({ message: 'Sale deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
