require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find the supervisor
  const supervisor = await User.findOne({ email: 'cfeddx6@gmail.com' });
  if (!supervisor) {
    console.log('❌  Supervisor cfeddx6@gmail.com not found');
    process.exit(1);
  }
  console.log(`✅  Supervisor found: ${supervisor.name} (${supervisor._id})`);

  // Link iradine@gmail.com to this supervisor
  const result = await User.findOneAndUpdate(
    { email: 'iradine@gmail.com' },
    { $set: { createdBy: supervisor._id } },
    { returnDocument: 'after' }
  ).select('-password');

  if (!result) {
    console.log('❌  Admin account iradine@gmail.com not found');
  } else {
    console.log(`✅  Linked iradine@gmail.com to supervisor cfeddx6@gmail.com`);
    console.log(`    Admin name  : ${result.name}`);
    console.log(`    Admin role  : ${result.role}`);
    console.log(`    createdBy   : ${result.createdBy}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
