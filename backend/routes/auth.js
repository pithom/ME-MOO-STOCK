const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect, adminOrSupervisor, hasPermission } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizePassword = (password = '') => String(password).trim();
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const buildDefaultPermissions = (role) => {
  if (role === 'admin') {
    return {
      viewReports: true,
      addProducts: true,
      editProducts: true,
      deleteProducts: true,
      manageUsers: true,
    };
  }
  if (role === 'supervisor') {
    return {
      viewReports: true,
      addProducts: true,
      editProducts: true,
      deleteProducts: false,
      manageUsers: true,
    };
  }
  return {
    viewReports: false,
    addProducts: false,
    editProducts: false,
    deleteProducts: false,
    manageUsers: false,
  };
};

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedPassword = normalizePassword(password);
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Shop name, email and password are required' });
    }
    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Shop email is already registered' });
    }

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password: normalizedPassword,
      role: 'admin',
      status: 'Active',
      permissions: buildDefaultPermissions('admin'),
    });
    await user.save();
    user.shopOwner = user._id;
    await user.save();

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      token: generateToken(user._id),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const rawPassword = String(password ?? '');
    const trimmedPassword = normalizePassword(password);
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const matched = await user.matchPassword(rawPassword) || (trimmedPassword !== rawPassword && await user.matchPassword(trimmedPassword));
    if (!matched) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is inactive. Contact administrator.' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // Do not reveal whether email exists
    if (!user) return res.json({ message: 'If the email exists, a reset link has been sent.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'ME-MOO STOCK Password Reset',
        text: `Reset your password using this link: ${resetUrl}`,
      });
    } else {
      // Fallback for local development if SMTP is not configured
      console.log(`Password reset URL for ${user.email}: ${resetUrl}`);
    }

    return res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    status: req.user.status,
    permissions: req.user.permissions,
  });
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = normalizeEmail(email);
    if (password) {
      const normalizedPassword = normalizePassword(password);
      if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
      }
      user.password = normalizedPassword;
    }
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/users
router.get('/users', protect, adminOrSupervisor, hasPermission('manageUsers'), async (req, res) => {
  try {
    const ownerId = req.user.shopOwner || req.user._id;
    const users = await User.find({ shopOwner: ownerId, role: { $ne: 'supervisor' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/users
router.post('/users', protect, adminOrSupervisor, hasPermission('manageUsers'), async (req, res) => {
  try {
    const { name, email, password, role, status, permissions } = req.body;
    const normalizedPassword = normalizePassword(password);
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
    }

    const normalizedRole = ['admin', 'supervisor', 'user'].includes(role) ? role : 'user';
    if (normalizedRole === 'supervisor') {
      return res.status(403).json({ message: 'Creating supervisor accounts is disabled' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({
      shopOwner: req.user.shopOwner || req.user._id,
      name: String(name).trim(),
      email: normalizedEmail,
      password: normalizedPassword,
      role: normalizedRole,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      permissions: permissions || buildDefaultPermissions(normalizedRole),
    });
    const safe = user.toObject();
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/users/:id/status
router.patch('/users/:id/status', protect, adminOrSupervisor, hasPermission('manageUsers'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const ownerId = req.user.shopOwner || req.user._id;
    const user = await User.findOne({ _id: req.params.id, shopOwner: ownerId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = status;
    await user.save();
    const safe = user.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/users/:id
router.patch('/users/:id', protect, adminOrSupervisor, hasPermission('manageUsers'), async (req, res) => {
  try {
    const ownerId = req.user.shopOwner || req.user._id;
    const target = await User.findOne({ _id: req.params.id, shopOwner: ownerId });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, status, permissions, password } = req.body;

    if (name != null) target.name = String(name).trim();
    if (email != null) target.email = normalizeEmail(email);
    if (role === 'supervisor') {
      return res.status(403).json({ message: 'Setting role to supervisor is disabled' });
    }
    if (role && ['admin', 'user'].includes(role)) target.role = role;
    if (status && ['Active', 'Inactive'].includes(status)) target.status = status;
    if (permissions && typeof permissions === 'object') {
      target.permissions = {
        ...target.permissions,
        ...permissions,
      };
    }
    if (password) {
      const normalizedPassword = normalizePassword(password);
      if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
      }
      target.password = normalizedPassword;
    }

    await target.save();
    const safe = target.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/auth/users/:id
router.delete('/users/:id', protect, adminOrSupervisor, hasPermission('manageUsers'), async (req, res) => {
  try {
    const ownerId = req.user.shopOwner || req.user._id;
    const target = await User.findOne({ _id: req.params.id, shopOwner: ownerId });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Supervisor cannot delete admin accounts' });
    }
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await User.deleteOne({ _id: target._id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
