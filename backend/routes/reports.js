const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const { protect, adminOnly } = require('../middleware/auth');

// GET daily sales report
router.get('/daily', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    const sales = await Sale.find({ date: { $gte: start, $lte: end } })
      .populate('product', 'name category price');
    const totalRevenue = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + s.totalPrice, 0);
    const totalPending = sales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.amountOwed, 0);
    res.json({ sales, totalRevenue, totalPending, count: sales.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET pending payments report
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const pending = await Sale.find({ paymentStatus: 'Pending' })
      .populate('product', 'name category price')
      .sort({ date: -1 });
    const totalOwed = pending.reduce((sum, s) => sum + s.amountOwed, 0);
    res.json({ pending, totalOwed, count: pending.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

