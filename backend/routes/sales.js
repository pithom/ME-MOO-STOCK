const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// GET all sales
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const sales = await Sale.find().populate('product', 'name category price').sort({ date: -1 });
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET pending payments
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const pending = await Sale.find({ paymentStatus: 'Pending' })
      .populate('product', 'name category price')
      .sort({ date: -1 });
    res.json(pending);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create a sale
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { productId, quantity, paymentStatus, paymentType, customerName, customerPhone, unitPrice } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
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
router.patch('/:id/pay', protect, adminOnly, async (req, res) => {
  try {
    const { paymentType } = req.body;
    const sale = await Sale.findById(req.params.id);
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

// DELETE sale
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const product = await Product.findById(sale.product);
    if (product) {
      product.quantity += Number(sale.quantity);
      await product.save();
    }
    res.json({ message: 'Sale deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
