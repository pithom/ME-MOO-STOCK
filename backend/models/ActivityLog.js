const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: { type: String, default: '' },
  action: {
    type: String,
    enum: ['created', 'password_changed', 'activated', 'deactivated', 'permissions_updated', 'deleted'],
    required: true,
  },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetUserName: { type: String, default: '' },
  targetUserEmail: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
