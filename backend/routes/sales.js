const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { protect, hasPermission } = require('../middleware/auth');
const {
  salePopulateOptions,
  getSaleLineItems,
  getSaleTotalQuantity,
  getSaleTargetName,
} = require('../utils/saleItems');
const resolveShopOwnerId = (user) => user.shopOwner || user._id;
const allowedPaymentTypes = ['Cash', 'Mobile Money', 'Card'];

function buildIncomingItems(body) {
  if (Array.isArray(body?.items) && body.items.length > 0) {
    return body.items;
  }

  if (body?.productId && body?.quantity) {
    return [{
      productId: body.productId,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      expectedProductUpdatedAt: body.expectedProductUpdatedAt,
      expectedProductQuantity: body.expectedProductQuantity,
    }];
  }

  return [];
}

// GET all sales
router.get('/', protect, hasPermission('viewSalesHistory'), async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const sales = await Sale.find({ owner: ownerId }).populate(salePopulateOptions).sort({ date: -1 });
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET pending payments
router.get('/pending', protect, hasPermission('viewPendingPayments'), async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const pending = await Sale.find({ owner: ownerId, paymentStatus: 'Pending' })
      .populate(salePopulateOptions)
      .sort({ date: -1 });
    res.json(pending);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create a sale
router.post('/', protect, hasPermission('createSale'), async (req, res) => {
  try {
    const {
      paymentStatus,
      paymentType,
      customerName,
      customerPhone,
    } = req.body;
    const incomingItems = buildIncomingItems(req.body);
    if (!incomingItems.length) return res.status(400).json({ message: 'At least one product is required' });
    if (!customerName?.trim()) return res.status(400).json({ message: 'Customer name is required' });
    if (!customerPhone?.trim()) return res.status(400).json({ message: 'Customer phone number is required' });

    const ownerId = resolveShopOwnerId(req.user);
    const normalizedPaymentStatus = paymentStatus === 'Pending' ? 'Pending' : 'Paid';
    const normalizedPaymentType = allowedPaymentTypes.includes(paymentType) ? paymentType : 'Cash';
    const rawProductIds = incomingItems.map((item) => String(item.productId || item.product || ''));
    const uniqueProductIds = [...new Set(rawProductIds)];

    if (uniqueProductIds.includes('')) {
      return res.status(400).json({ message: 'Each sale item must include a product' });
    }
    if (uniqueProductIds.length !== rawProductIds.length) {
      return res.status(400).json({ message: 'Duplicate products are not allowed in the same sale' });
    }

    const products = await Product.find({ _id: { $in: uniqueProductIds }, owner: ownerId });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (products.length !== uniqueProductIds.length) {
      return res.status(404).json({ message: 'One or more selected products were not found' });
    }

    const normalizedItems = [];
    let totalPrice = 0;

    for (const item of incomingItems) {
      const productId = String(item.productId || item.product);
      const product = productMap.get(productId);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (
        item.expectedProductUpdatedAt
        && new Date(item.expectedProductUpdatedAt).getTime() !== new Date(product.updatedAt).getTime()
      ) {
        return res.status(409).json({
          message: `Conflict detected: ${product.name} was modified before sale sync.`,
          current: product,
        });
      }

      if (
        Number.isFinite(Number(item.expectedProductQuantity))
        && Number(item.expectedProductQuantity) !== Number(product.quantity)
      ) {
        return res.status(409).json({
          message: `Conflict detected: ${product.name} quantity changed before sale sync.`,
          current: product,
        });
      }

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: `Quantity must be greater than 0 for ${product.name}` });
      }
      if (product.quantity < qty) {
        return res.status(400).json({ message: `Only ${product.quantity} units available for ${product.name}` });
      }

      const saleUnitPrice = item.unitPrice == null ? Number(product.price) : Number(item.unitPrice);
      if (!Number.isFinite(saleUnitPrice) || saleUnitPrice < 0) {
        return res.status(400).json({ message: `Unit price must be valid for ${product.name}` });
      }

      const lineTotal = saleUnitPrice * qty;
      totalPrice += lineTotal;
      normalizedItems.push({
        product: product._id,
        quantity: qty,
        unitPrice: saleUnitPrice,
        totalPrice: lineTotal,
      });
    }

    const amountOwed = normalizedPaymentStatus === 'Pending' ? totalPrice : 0;
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const primaryItem = normalizedItems[0];

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.product));
      product.quantity -= item.quantity;
      await product.save();
    }

    const sale = await Sale.create({
      owner: ownerId,
      product: primaryItem.product,
      quantity: totalQuantity,
      unitPrice: normalizedItems.length === 1 ? primaryItem.unitPrice : 0,
      items: normalizedItems,
      totalPrice,
      paymentStatus: normalizedPaymentStatus,
      paymentType: normalizedPaymentType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      amountOwed,
      paidAt: normalizedPaymentStatus === 'Paid' ? new Date() : null,
    });
    const populated = await sale.populate(salePopulateOptions);
    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'sale_created',
      targetType: 'sale',
      targetUserId: sale._id,
      targetUserName: getSaleTargetName(populated),
      details: `Items: ${normalizedItems.length}, Qty: ${totalQuantity}, Total: ${totalPrice}`,
    });
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH mark pending sale as paid
router.patch('/:id/pay', protect, hasPermission('viewPendingPayments'), async (req, res) => {
  try {
    const { paymentType } = req.body;
    const ownerId = resolveShopOwnerId(req.user);
    const sale = await Sale.findOne({ _id: req.params.id, owner: ownerId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.paymentStatus === 'Paid') return res.status(400).json({ message: 'Already paid' });

    if (!sale.customerName || !sale.customerPhone) {
      return res.status(400).json({ message: 'Pending payment must include customer name and phone number' });
    }

    sale.paymentStatus = 'Paid';
    sale.paymentType = allowedPaymentTypes.includes(paymentType) ? paymentType : sale.paymentType;
    sale.amountOwed = 0;
    sale.paidAt = new Date();
    await sale.save();
    const populated = await sale.populate(salePopulateOptions);
    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'sale_paid',
      targetType: 'sale',
      targetUserId: sale._id,
      targetUserName: getSaleTargetName(populated),
      details: `Payment type: ${sale.paymentType}`,
    });
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH mark sale as returned and restore stock
router.patch('/:id/return', protect, hasPermission('viewSalesHistory'), async (req, res) => {
  try {
    const { returnMethod, returnNote } = req.body;
    const ownerId = resolveShopOwnerId(req.user);
    const sale = await Sale.findOne({ _id: req.params.id, owner: ownerId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.isReturned) return res.status(400).json({ message: 'Sale is already returned' });

    const allowedMethods = ['Refund Cash', 'Exchange', 'Store Credit', 'Other'];
    const normalizedMethod = allowedMethods.includes(returnMethod) ? returnMethod : 'Other';
    const lineItems = getSaleLineItems(sale);
    const productIds = [...new Set(lineItems.map((item) => String(item.product)))];
    const products = await Product.find({ _id: { $in: productIds }, owner: ownerId });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    for (const item of lineItems) {
      const product = productMap.get(String(item.product));
      if (product) {
        product.quantity += Number(item.quantity);
        await product.save();
      }
    }

    sale.isReturned = true;
    sale.returnMethod = normalizedMethod;
    sale.returnNote = returnNote || '';
    sale.returnedAt = new Date();
    await sale.save();

    const populated = await sale.populate(salePopulateOptions);
    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'sale_returned',
      targetType: 'sale',
      targetUserId: sale._id,
      targetUserName: getSaleTargetName(populated),
      details: `Method: ${normalizedMethod}, Qty: ${getSaleTotalQuantity(sale)}`,
    });
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE sale
router.delete('/:id', protect, hasPermission('viewSalesHistory'), async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const lineItems = getSaleLineItems(sale);
    const productIds = [...new Set(lineItems.map((item) => String(item.product)))];
    const products = await Product.find({ _id: { $in: productIds }, owner: ownerId });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    for (const item of lineItems) {
      const product = productMap.get(String(item.product));
      if (product) {
        product.quantity += Number(item.quantity);
        await product.save();
      }
    }

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'sale_deleted',
      targetType: 'sale',
      targetUserId: sale._id,
      targetUserName: getSaleTargetName(sale),
      details: `Qty: ${getSaleTotalQuantity(sale)}`,
    });
    res.json({ message: 'Sale deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
