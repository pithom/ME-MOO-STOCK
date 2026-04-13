const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const { protect, hasPermission } = require('../middleware/auth');

// GET daily sales report
router.get('/daily', protect, hasPermission('viewReports'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    const sales = await Sale.find({ owner: req.user._id, date: { $gte: start, $lte: end } })
      .populate('product', 'name category price');
    const totalRevenue = sales.filter(s => s.paymentStatus === 'Paid' && !s.isReturned).reduce((sum, s) => sum + s.totalPrice, 0);
    const totalPending = sales.filter(s => s.paymentStatus === 'Pending').reduce((sum, s) => sum + s.amountOwed, 0);
    res.json({ sales, totalRevenue, totalPending, count: sales.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET pending payments report
router.get('/pending', protect, hasPermission('viewReports'), async (req, res) => {
  try {
    const pending = await Sale.find({ owner: req.user._id, paymentStatus: 'Pending' })
      .populate('product', 'name category price')
      .sort({ date: -1 });
    const totalOwed = pending.reduce((sum, s) => sum + s.amountOwed, 0);
    res.json({ pending, totalOwed, count: pending.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET between dates sales report
router.get('/between', protect, hasPermission('viewReports'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const sales = await Sale.find({ owner: req.user._id, date: { $gte: start, $lte: end } })
      .populate('product', 'name category price');
    const totalRevenue = sales.filter((s) => s.paymentStatus === 'Paid' && !s.isReturned)
      .reduce((sum, s) => sum + s.totalPrice, 0);
    const totalPending = sales.filter((s) => s.paymentStatus === 'Pending')
      .reduce((sum, s) => sum + s.amountOwed, 0);

    res.json({ sales, totalRevenue, totalPending, count: sales.length, startDate, endDate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

