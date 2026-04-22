const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockIn = require('../models/StockIn');
const { protect } = require('../middleware/auth');
const resolveShopOwnerId = (user) => user.shopOwner || user._id;

// GET dashboard summary
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const ownerFilter = { owner: ownerId };
    const totalProducts = await Product.countDocuments(ownerFilter);
    const products = await Product.find(ownerFilter);
    const availableStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalSales = await Sale.countDocuments(ownerFilter);
    const totalRevenue = await Sale.aggregate([
      { $match: { owner: ownerId, paymentStatus: 'Paid', isReturned: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const pendingPayments = await Sale.find({ owner: ownerId, paymentStatus: 'Pending' });
    const pendingTotal = pendingPayments.reduce((sum, s) => sum + s.amountOwed, 0);
    const pendingCount = pendingPayments.length;
    const lowStockProducts = products
      .filter((p) => Number(p.quantity) <= 5)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        quantity: p.quantity,
      }));

    // Last 7 days sales for chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSales = await Sale.aggregate([
      { $match: { owner: ownerId, date: { $gte: sevenDaysAgo }, isReturned: { $ne: true } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalProducts,
      availableStock,
      totalSales,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingTotal,
      pendingCount,
      lowStockProducts,
      recentSales,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

