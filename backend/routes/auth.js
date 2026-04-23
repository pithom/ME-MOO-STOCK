const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect, hasPermission } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizePassword = (password = '') => String(password).trim();
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const SUPERVISOR_EMAIL = 'cfeddx6@gmail.com';
const IRADINE_EMAIL = 'iradine@gmail.com';

const isPrimarySupervisor = (user) => (
  Boolean(user)
  && user.role !== 'admin'
  && Boolean(user.permissions?.manageUsers)
  && normalizeEmail(user.email) === SUPERVISOR_EMAIL
);

const requirePrimarySupervisor = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (isPrimarySupervisor(req.user)) return next();
  return res.status(403).json({ message: 'Supervisor access only' });
};

const resolveShopOwnerId = (user) => user.shopOwner || user._id;

const buildManagedUserQuery = (user, extra = {}) => {
  const ownerId = resolveShopOwnerId(user);
  if (isPrimarySupervisor(user)) {
    return { shopOwner: ownerId, role: 'user', ...extra };
  }
  if (user?.role === 'admin') {
    if (user.createdBy) {
      return { shopOwner: ownerId, createdBy: user._id, role: 'user', ...extra };
    }
    return { shopOwner: ownerId, role: 'user', ...extra };
  }
  return { shopOwner: ownerId, createdBy: user._id, role: 'user', ...extra };
};

const buildManagedUserPermissions = (creator, overrides = {}) => {
  const defaults = buildDefaultPermissions('user');
  if (normalizeEmail(creator?.email) === IRADINE_EMAIL) {
    defaults.addProducts = true;
    defaults.editProducts = true;
  }
  return {
    ...defaults,
    ...(overrides || {}),
  };
};

const buildDefaultPermissions = (role) => {
  if (role === 'admin') {
    return {
      createSale: true,
      viewSalesHistory: true,
      viewPendingPayments: true,
      viewReports: true,
      addProducts: true,
      editProducts: true,
      deleteProducts: true,
      manageUsers: true,
    };
  }
  return {
    createSale: true,
    viewSalesHistory: true,
    viewPendingPayments: false,
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
router.get('/users', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const users = await User.find(buildManagedUserQuery(req.user)).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/users
router.post('/users', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const { name, email, password, status, permissions } = req.body;
    const normalizedPassword = normalizePassword(password);
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
    }

    const normalizedRole = 'user';
    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({
      shopOwner: req.user.shopOwner || req.user._id,
      createdBy: req.user._id,
      name: String(name).trim(),
      email: normalizedEmail,
      password: normalizedPassword,
      role: normalizedRole,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      permissions: buildManagedUserPermissions(req.user, permissions),
    });

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'created',
      targetUserId: user._id,
      targetUserName: user.name,
      targetUserEmail: user.email,
    });

    const safe = user.toObject();
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/users/:id/status
router.patch('/users/:id/status', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const target = await User.findOne(buildManagedUserQuery(req.user, { _id: req.params.id }));
    if (!target) return res.status(404).json({ message: 'User not found' });
    target.status = status;
    await target.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: status === 'Active' ? 'activated' : 'deactivated',
      targetUserId: target._id,
      targetUserName: target.name,
      targetUserEmail: target.email,
    });

    const safe = target.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/users/:id
router.patch('/users/:id', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const target = await User.findOne(buildManagedUserQuery(req.user, { _id: req.params.id }));
    if (!target) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, status, permissions, password } = req.body;

    if (name != null) target.name = String(name).trim();
    if (email != null) target.email = normalizeEmail(email);
    if (role && role !== 'user') {
      return res.status(403).json({ message: 'Only user role is allowed for managed accounts' });
    }
    if (status && ['Active', 'Inactive'].includes(status)) target.status = status;
    if (permissions && typeof permissions === 'object') {
      target.permissions = { ...target.permissions, ...permissions };
    }
    if (password) {
      const normalizedPassword = normalizePassword(password);
      if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 chars and include uppercase, lowercase and number' });
      }
      target.password = normalizedPassword;
    }

    await target.save();

    const logAction = password ? 'password_changed' : (permissions ? 'permissions_updated' : null);
    if (logAction) {
      await ActivityLog.create({
        performedBy: req.user._id,
        performedByName: req.user.name,
        action: logAction,
        targetUserId: target._id,
        targetUserName: target.name,
        targetUserEmail: target.email,
      });
    }

    const safe = target.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/auth/users/:id
router.delete('/users/:id', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const target = await User.findOne(buildManagedUserQuery(req.user, { _id: req.params.id }));
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const { name: targetName, email: targetEmail, _id: targetId } = target;
    await User.deleteOne({ _id: target._id });

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'deleted',
      targetUserId: targetId,
      targetUserName: targetName,
      targetUserEmail: targetEmail,
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── SUPERVISOR: Managed-Admin Routes ────────────────────────────────────────
// These routes let a user with manageUsers=true create/manage admin accounts.
// Every route scopes by createdBy so supervisors only touch their own admins.

// @GET /api/auth/managed-admins
router.get('/managed-admins', protect, hasPermission('manageUsers'), requirePrimarySupervisor, async (req, res) => {
  try {
    const admins = await User.find({ createdBy: req.user._id, role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/managed-admins  – create a new admin account
router.post('/managed-admins', protect, hasPermission('manageUsers'), requirePrimarySupervisor, async (req, res) => {
  try {
    const { name, email, password, status } = req.body;
    const normalizedPassword = normalizePassword(password || '');
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars with uppercase, lowercase and number' });
    }
    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const admin = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password: normalizedPassword,
      role: 'admin',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      permissions: buildDefaultPermissions('admin'),
      createdBy: req.user._id,
    });
    await admin.save();
    admin.shopOwner = admin._id;
    await admin.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'created',
      targetUserId: admin._id,
      targetUserName: admin.name,
      targetUserEmail: admin.email,
    });

    const safe = admin.toObject();
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/managed-admins/:id/password
router.patch('/managed-admins/:id/password', protect, hasPermission('manageUsers'), requirePrimarySupervisor, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });
    const normalizedPassword = normalizePassword(password);
    if (!STRONG_PASSWORD_REGEX.test(normalizedPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 chars with uppercase, lowercase and number' });
    }
    const admin = await User.findOne({ _id: req.params.id, role: 'admin', createdBy: req.user._id });
    if (!admin) return res.status(404).json({ message: 'Admin not found or not authorized' });

    admin.password = normalizedPassword;
    await admin.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'password_changed',
      targetUserId: admin._id,
      targetUserName: admin.name,
      targetUserEmail: admin.email,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PATCH /api/auth/managed-admins/:id/status
router.patch('/managed-admins/:id/status', protect, hasPermission('manageUsers'), requirePrimarySupervisor, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const admin = await User.findOne({ _id: req.params.id, role: 'admin', createdBy: req.user._id });
    if (!admin) return res.status(404).json({ message: 'Admin not found or not authorized' });

    admin.status = status;
    await admin.save();

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: status === 'Active' ? 'activated' : 'deactivated',
      targetUserId: admin._id,
      targetUserName: admin.name,
      targetUserEmail: admin.email,
    });

    const safe = admin.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/auth/managed-admins/:id
router.delete('/managed-admins/:id', protect, hasPermission('manageUsers'), requirePrimarySupervisor, async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin', createdBy: req.user._id });
    if (!admin) return res.status(404).json({ message: 'Admin not found or not authorized' });

    const { name: adminName, email: adminEmail, _id: adminId } = admin;
    await User.deleteOne({ _id: admin._id });

    await ActivityLog.create({
      performedBy: req.user._id,
      performedByName: req.user.name,
      action: 'deleted',
      targetUserId: adminId,
      targetUserName: adminName,
      targetUserEmail: adminEmail,
    });

    res.json({ message: 'Admin account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
