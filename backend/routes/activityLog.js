const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, hasPermission } = require('../middleware/auth');

// @GET /api/activity-logs
// - Admins see all their activity log entries (all action types)
// - Supervisors (non-admin manageUsers users) see ONLY 'created' actions
router.get('/', protect, hasPermission('manageUsers'), async (req, res) => {
  try {
    const query = { performedBy: req.user._id };
    if (req.user.role !== 'admin') {
      query.action = 'created'; // supervisors only see account creation events
    }
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
