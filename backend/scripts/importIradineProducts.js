const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TARGET_EMAIL = 'iradine@gmail.com';

const productsFromScreenshots = [
  { name: 'Big Pin', stockCode: 'B21(50 in 1B)+B3(50in1B)(-P cable), P48+(6-P cable)', price: 7000 },
  { name: 'Blue pin', stockCode: 'B22(50 in 1B)+P6', price: 7000 },
  { name: 'X-printer365B/bar code', stockCode: 'B3(12 in 1 B)', price: 80000 },
  { name: 'MIN Printer 58mm', stockCode: 'B3(18 pieces in 1 B)+P13', price: 35000 },
  { name: 'Thermal A4 Printer', stockCode: 'B1(12pieces in 1B)+p11', price: 80000 },
  { name: 'Mobile printer', stockCode: 'P2', price: 45000 },
  { name: 'Lenovo Small Pin', stockCode: 'P7-power Cable', price: 7000 },
  { name: 'PH type-c', stockCode: 'P54', price: 25000 },
  { name: 'DELL type-c', stockCode: 'P45', price: 25000 },
  { name: 'TYPE-C to HDTV (11 in 1 Adpter)', stockCode: 'P27', price: 25000 },
  { name: 'Wire less Camer', stockCode: 'P33', price: 70000 },
  { name: '4G Camer', stockCode: 'P39', price: 75000 },
  { name: 'Solar Camer', stockCode: 'P8', price: 85000 },
  { name: 'Paper75*50', stockCode: 'B14 P23', price: 7000 },
  { name: 'Paper50*75', stockCode: 'B4 P15', price: 7000 },
  { name: 'paper40*30', stockCode: '', price: 7000 },
  { name: 'TA2-C', stockCode: 'B3(20 pieces in 1B)+P21', price: 45000 },
  { name: 'TA2', stockCode: 'B5(20pieces in 1B)+P26', price: 40000 },
  { name: 'Optical vertical mouse', stockCode: 'P9', price: 15000 },
  { name: 'Transparent W.M M333', stockCode: 'P29', price: 18000 },
  { name: 'Transparent W.M M133', stockCode: 'P2', price: 18000 },
  { name: 'Wire less Key Board and mouse', stockCode: 'P4', price: 18000 },
  { name: 'Transparent Wireless Keyboard', stockCode: 'P9', price: 18000 },
  { name: 'Logitech M90 mouse', stockCode: 'P7-', price: 7000 },
  { name: 'DHS-2101 Speaker', stockCode: 'P12', price: 25000 },
  { name: 'DHS-2111S Speaker', stockCode: 'B1(20)+P8', price: 25000 },
  { name: 'WD storage (cover)', stockCode: 'p1', price: 5000 },
  { name: 'Handheld Android', stockCode: 'P1', price: 200000 },
  { name: 'Projector', stockCode: 'P1', price: 60000 },
  { name: 'HDTV to VGA Adapter', stockCode: 'P64', price: 5000 },
  { name: 'USB.3 1-C', stockCode: 'p1', price: 7000 },
  { name: 'HDMI 3port', stockCode: 'P20', price: 10000 },
  { name: 'USB 3.0 Ethernet Adapter', stockCode: 'P4', price: 7000 },
  { name: 'DUPA Cell', stockCode: 'P6', price: 1500 },
  { name: 'Memory card (128GB)', stockCode: 'P2', price: 1500 },
  { name: 'Power cable Big and Small pin', stockCode: 'P15', price: 1500 },
  { name: 'Power Cable 3head', stockCode: 'P97', price: 3000 },
  { name: 'Power Cable HP Type-c', stockCode: 'P46', price: 25000 },
];

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI missing in backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const targetUser = await User.findOne({ email: TARGET_EMAIL.toLowerCase().trim() });
  if (!targetUser) {
    throw new Error(`User not found: ${TARGET_EMAIL}`);
  }

  let inserted = 0;
  let updated = 0;

  for (const item of productsFromScreenshots) {
    const payload = {
      owner: targetUser._id,
      name: item.name.trim(),
      category: 'General',
      price: Number(item.price) || 0,
      quantity: 0,
      description: item.stockCode ? `Stock code: ${item.stockCode}` : '',
      barcode: '',
      qrCode: '',
    };

    const existing = await Product.findOne({ owner: targetUser._id, name: payload.name });
    if (existing) {
      existing.price = payload.price;
      existing.category = payload.category;
      existing.description = payload.description;
      await existing.save();
      updated += 1;
    } else {
      await Product.create(payload);
      inserted += 1;
    }
  }

  console.log(`Done. Inserted: ${inserted}, Updated: ${updated}, Target: ${TARGET_EMAIL}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Import failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
