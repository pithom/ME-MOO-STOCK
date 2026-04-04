const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// GET all products
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single product
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create product
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, price, quantity, description } = req.body;
    if (!name || !category || price == null) return res.status(400).json({ message: 'Name, category, price are required' });
    const normalizedQuantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
    const product = await Product.create({ name, category, price: Number(price), quantity: normalizedQuantity, description });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update product
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE product
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

