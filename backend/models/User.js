const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  shopOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  permissions: {
    createSale: { type: Boolean, default: false },
    viewSalesHistory: { type: Boolean, default: false },
    viewPendingPayments: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    addProducts: { type: Boolean, default: false },
    editProducts: { type: Boolean, default: false },
    deleteProducts: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
  },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
