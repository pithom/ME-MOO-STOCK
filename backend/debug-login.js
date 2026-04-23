const mongoose = require('mongoose');
const User = require('./models/User');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizePassword = (password = '') => String(password).trim();

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/me-moo-stock');
    
    const email = 'supervisor@test.com';
    const password = 'Password123';
    
    console.log('Debug login attempt:');
    console.log('Original email:', email);
    console.log('Normalized email:', normalizeEmail(email));
    console.log('Original password:', password);
    console.log('Normalized password:', normalizePassword(password));
    
    const user = await User.findOne({ email: normalizeEmail(email) });
    console.log('User found:', !!user);
    if (user) {
      console.log('User email in DB:', user.email);
      console.log('User role:', user.role);
      console.log('User permissions:', user.permissions);
      
      const rawPassword = String(password ?? '');
      const trimmedPassword = normalizePassword(password);
      console.log('Raw password:', rawPassword);
      console.log('Trimmed password:', trimmedPassword);
      console.log('Are they different?', rawPassword !== trimmedPassword);
      
      const matched1 = await user.matchPassword(rawPassword);
      const matched2 = await user.matchPassword(trimmedPassword);
      console.log('Password match (raw):', matched1);
      console.log('Password match (trimmed):', matched2);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugLogin();
