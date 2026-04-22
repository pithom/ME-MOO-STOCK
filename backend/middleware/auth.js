const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
      if (req.user.status !== 'Active') return res.status(403).json({ message: 'Account is inactive' });
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access only' });
};

const hasPermission = (permissionKey) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'admin') return next();
  if (req.user.status !== 'Active') return res.status(403).json({ message: 'Account is inactive' });
  if (req.user.permissions?.[permissionKey]) return next();
  return res.status(403).json({ message: `Missing permission: ${permissionKey}` });
};

const adminOrSupervisor = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access only' });
};

const supervisorOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'supervisor') return next();
  return res.status(403).json({ message: 'Supervisor access only' });
};

module.exports = { protect, adminOnly, hasPermission, adminOrSupervisor, supervisorOnly };
