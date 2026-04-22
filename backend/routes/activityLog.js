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

// @GET /api/activity-logs
// - Admins see the actions they performed
// - The primary supervisor sees their own actions plus actions performed by
//   admin accounts they created and manage
router.get('/', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    if (isPrimarySupervisor(req.user)) {
      const managedAdmins = await User.find({ createdBy: req.user._id, role: 'admin' }).select('_id');
      const actorIds = [req.user._id, ...managedAdmins.map((admin) => admin._id)];
      const logs = await ActivityLog.find({ performedBy: { $in: actorIds } })
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json(logs);
    }

    const logs = await ActivityLog.find({ performedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
