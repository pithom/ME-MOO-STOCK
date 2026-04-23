const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { protect, hasPermission } = require('../middleware/auth');
const SUPERVISOR_EMAIL = 'cfeddx6@gmail.com';

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isPrimarySupervisor = (user) => (
  Boolean(user)
  && user.role !== 'admin'
  && Boolean(user.permissions?.manageUsers)
  && normalizeEmail(user.email) === SUPERVISOR_EMAIL
);

const collectVisibleActorIds = async (user) => {
  if (!user) return [];
  if (isPrimarySupervisor(user)) {
    const managedAdmins = await User.find({ createdBy: user._id, role: 'admin' }).select('_id');
    const adminIds = managedAdmins.map((admin) => admin._id);
    const managedUsers = await User.find({
      createdBy: { $in: [user._id, ...adminIds] },
      role: 'user',
    }).select('_id');
    return [user._id, ...adminIds, ...managedUsers.map((entry) => entry._id)];
  }
  if (user.role === 'admin') {
    const managedUsers = await User.find({ createdBy: user._id, role: 'user' }).select('_id');
    return [user._id, ...managedUsers.map((entry) => entry._id)];
  }
  return [user._id];
};

// @GET /api/activity-logs
// - Admins see their own actions plus actions performed by users they created
// - The primary supervisor sees their own actions plus actions performed by
//   admin accounts they created and by users under those admins
router.get('/', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const actorIds = await collectVisibleActorIds(req.user);
    const logs = await ActivityLog.find({ performedBy: { $in: actorIds } })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
