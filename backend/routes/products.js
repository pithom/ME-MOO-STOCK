const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, hasPermission, adminOnly } = require('../middleware/auth');
const resolveShopOwnerId = (user) => user.shopOwner || user._id;

// GET all products
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const products = await Product.find({ owner: ownerId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single product
router.get('/:id', protect, async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const product = await Product.findOne({ _id: req.params.id, owner: ownerId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create product
router.post('/', protect, hasPermission('addProducts'), async (req, res) => {
  try {
    const { name, category, price, quantity, description, barcode, qrCode } = req.body;
    if (!name || !category || price == null) return res.status(400).json({ message: 'Name, category, price are required' });
    const normalizedQuantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
    const ownerId = resolveShopOwnerId(req.user);
    const product = await Product.create({
      owner: ownerId,
      name,
      category,
      price: Number(price),
      quantity: normalizedQuantity,
      description,
      barcode: barcode || '',
      qrCode: qrCode || '',
    });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST bulk import products (admin only)
router.post('/import-bulk', protect, adminOnly, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: 'No products to import' });

    let inserted = 0;
    let updated = 0;

    const ownerId = resolveShopOwnerId(req.user);
    for (const rawItem of items) {
      const name = String(rawItem?.name || '').trim();
      const price = Number(rawItem?.price);
      const category = String(rawItem?.category || 'General').trim() || 'General';
      const quantity = Number.isFinite(Number(rawItem?.quantity)) ? Number(rawItem.quantity) : 0;
      const stockCode = String(rawItem?.stockCode || '').trim();

      if (!name || !Number.isFinite(price) || price < 0) continue;

      const payload = {
        owner: ownerId,
        name,
        category,
        price,
        quantity,
        description: stockCode ? `Stock code: ${stockCode}` : '',
      };

      const existing = await Product.findOne({ owner: ownerId, name });
      if (existing) {
        existing.price = payload.price;
        existing.category = payload.category;
        existing.quantity = payload.quantity;
        existing.description = payload.description;
        await existing.save();
        updated += 1;
      } else {
        await Product.create(payload);
        inserted += 1;
      }
    }

    return res.json({ inserted, updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT update product
router.put('/:id', protect, hasPermission('editProducts'), async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const { expectedUpdatedAt, ...updatePayload } = req.body;
    const current = await Product.findOne({ _id: req.params.id, owner: ownerId });
    if (!current) return res.status(404).json({ message: 'Product not found' });

    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(current.updatedAt).getTime()) {
      return res.status(409).json({
        message: 'Conflict detected: product was updated by another operation.',
        current,
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: ownerId },
      updatePayload,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE product
router.delete('/:id', protect, hasPermission('deleteProducts'), async (req, res) => {
  try {
    const ownerId = resolveShopOwnerId(req.user);
    const expectedUpdatedAt = req.body?.expectedUpdatedAt;
    const current = await Product.findOne({ _id: req.params.id, owner: ownerId });
    if (!current) return res.status(404).json({ message: 'Product not found' });

    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(current.updatedAt).getTime()) {
      return res.status(409).json({
        message: 'Conflict detected: product changed before delete.',
        current,
      });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

