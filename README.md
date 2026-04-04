# StockPro Manager - Stock Management System

A full-stack stock management application with real-time inventory tracking, sales management, and detailed reporting.

## 📋 Features
- **Product Management**: CRUD operations for inventory items
- **Stock Tracking**: Record and manage stock-in operations
- **Sales Management**: Track paid and pending/credit sales
- **Pending Payments**: View and mark payment receipts
- **Dashboard**: Real-time summary of key metrics
- **Reports**: Daily reports and pending payment analysis
- **Authentication**: JWT-based secure authentication

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT
- **Frontend**: React 19, Vite, Recharts, React Router
- **Deployment**: Render (render.yaml configured)

---

## 📦 Prerequisites
- Node.js ≥ 18.0.0
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud)
- Git

---

## 🚀 Local Development

### Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env` (see `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/stockmanager
JWT_SECRET=your-secret-key-here
```

Run backend:
```bash
npm run dev
```
✅ Backend runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env` (see `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```

Run frontend:
```bash
npm run dev
```
✅ Frontend runs on `http://localhost:5173`

### First Use
1. Visit `http://localhost:5173`
2. Register a new admin account
3. Add products → record stock-in → process sales → view reports

---

## 🌐 Production Deployment (Render)

### Prerequisites
- Render account (https://render.com)
- MongoDB Atlas database (free tier available)
- GitHub repository connected

### 1. Prepare MongoDB Atlas
1. Create free cluster at https://mongodb.com/cloud/atlas
2. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/stockmanager?retryWrites=true&w=majority`
3. Keep this secure (never commit to Git)

### 2. Deploy via Render
1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Click **New → Web Service → Connect Repository**
4. Select this repository
5. Configure using `render.yaml` (already provided)

### 3. Set Environment Variables in Render
In Render dashboard, add these environment variables:

**Backend Service:**
- `MONGO_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Generate strong secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `FRONTEND_URL`: Your frontend service URL (auto-populated)
- `NODE_ENV`: `production`

**Frontend Service:**
- `VITE_API_URL`: `https://your-backend-service.onrender.com/api` (auto-populated)

### 4. Monitor Deployment
- Backend service: Should show "✅ MongoDB connected" in logs
- Frontend service: Should successfully build and serve

### Deployment Architecture
```
┌─────────────────────────────────────────┐
│     Frontend (React + Vite)             │
│     Port 3000 (via serve)               │
└──────────┬──────────────────────────────┘
           │ (VITE_API_URL env var)
           │
┌──────────▼──────────────────────────────┐
│     Backend (Node.js + Express)         │
│     Port 10000                          │
│     ├─ /api/* routes                    │
│     └─ Static frontend fallback         │
└──────────┬──────────────────────────────┘
           │
┌──────────▼──────────────────────────────┐
│     MongoDB Atlas                       │
└─────────────────────────────────────────┘
```

---

## 🔒 Security Checklist

- ✅ `.env` files in `.gitignore` (never commit secrets)
- ✅ CORS properly configured for production domain
- ✅ JWT secret is strong and unique
- ✅ MongoDB credentials secured via environment variables
- ✅ HTTPS enforced (Render provides SSL certificate)
- ✅ No sensitive data in Frontend (console.log removed)

---

## 📝 Environment Variables Reference

### Backend `.env`
```env
# Server
PORT=5000
NODE_ENV=production

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/stockmanager

# Security
JWT_SECRET=strong-random-secret-from-crypto

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.onrender.com

# Email (Optional - for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
```

### Frontend `.env`
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 🐛 Troubleshooting

**"MongoDB connection failed"**
- Check `MONGO_URI` in environment variables
- Ensure IP whitelist includes Render IPs on MongoDB Atlas

**"CORS error"**
- Verify `FRONTEND_URL` is set in backend environment
- Check frontend `.env` has correct `VITE_API_URL`

**"Build fails on Render"**
- Ensure Node.js version ≥ 18 in `package.json`
- Check `npm run build` works locally first

---

## 📚 Project Structure
```
.
├── backend/              # Express server
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & utilities
│   └── server.js        # Entry point
├── frontend/            # React app
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── components/  # Reusable UI
│   │   ├── services/    # API calls
│   │   └── context/     # Auth state
│   └── vite.config.js   # Build config
└── render.yaml          # Deployment config
```

---

## 📄 License
ISC

## 👨‍💻 Support
For issues, check logs in Render dashboard or run locally with `npm run dev`
