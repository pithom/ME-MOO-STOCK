require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOneAndUpdate(
    { email: 'cfeddx6@gmail.com' },
    {
      $set: {
        role: 'user',
        status: 'Active',
        'permissions.createSale': false,
        'permissions.viewSalesHistory': false,
        'permissions.viewPendingPayments': false,
        'permissions.viewReports': false,
        'permissions.addProducts': false,
        'permissions.editProducts': false,
        'permissions.deleteProducts': false,
        'permissions.manageUsers': true,
      },
    },
    { new: true }
  ).select('-password');

  if (!user) {
    console.log('❌  User cfeddx6@gmail.com not found in the database.');
  } else {
    console.log('✅  Supervisor configured successfully!');
    console.log('    Email      :', user.email);
    console.log('    Role       :', user.role);
    console.log('    Permissions:', JSON.stringify(user.permissions, null, 2));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
