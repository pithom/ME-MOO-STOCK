const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, '.env') });
mongoose.set('bufferCommands', false);

const app = express();
const isDatabaseReady = () => mongoose.connection.readyState === 1;
let reconnectTimer = null;
let isConnecting = false;

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
  origin: true,
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

app.get('/health', (_req, res) => {
  const dbReady = isDatabaseReady();
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', (_req, res, next) => {
  if (isDatabaseReady()) return next();
  return res.status(503).json({
    message: 'Database unavailable. Check MongoDB Atlas Network Access/IP allowlist and try again.',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity-logs', require('./routes/activityLog'));

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
  scheduleReconnect();
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

const scheduleReconnect = () => {
  if (reconnectTimer || isConnecting || isDatabaseReady()) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToMongo();
  }, 5000);
};

const connectToMongo = async () => {
  if (isConnecting || isDatabaseReady()) return;
  if (!process.env.MONGO_URI) {
    console.error('MongoDB connection skipped: MONGO_URI is missing.');
    return;
  }

  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    console.error('Initial MongoDB connection failed:', err.message);
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
};

connectToMongo();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
