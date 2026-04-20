const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');

dotenv.config();

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const addOriginVariants = (origins, rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    origins.add(value);
    return;
  }
  origins.add(`https://${value}`);
  origins.add(`http://${value}`);
};

const buildAllowedOrigins = () => {
  const origins = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ]);
  addOriginVariants(origins, process.env.FRONTEND_URL);
  return origins;
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / Postman
    if (buildAllowedOrigins().has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));

// ─── Serve Frontend in Production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const ensureDefaultSupervisor = async () => {
  const email = 'cfeddx6@gmail.com';
  const existing = await User.findOne({ email });
  if (existing) return;

  const supervisor = await User.create({
    name: 'Default Supervisor',
    email,
    password: 'hot9stone@gmail.com',
    role: 'supervisor',
    status: 'Active',
    permissions: {
      viewReports: true,
      addProducts: true,
      editProducts: true,
      deleteProducts: false,
      manageUsers: true,
    },
  });
  supervisor.shopOwner = supervisor._id;
  await supervisor.save();
  console.log('✅ Default supervisor account initialized');
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureDefaultSupervisor();
  })
  .catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
 