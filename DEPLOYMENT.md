# Production Deployment Guide

This guide covers deploying StockPro Manager to production on Render.

## Pre-Deployment Checklist

### Code Quality
- [ ] All console.log statements removed or wrapped in dev-only checks
- [ ] No hardcoded API URLs in frontend
- [ ] JWT secret is not in code (only in .env)
- [ ] MongoDB credentials not committed to Git
- [ ] No test/dummy data left in production schema

### Configuration
- [ ] `.env` files are in `.gitignore` 
- [ ] `render.yaml` is up to date
- [ ] Both services (frontend & backend) are configured
- [ ] Environment variable names are correct

### Dependencies
- [ ] `npm install` works without errors in both directories
- [ ] `npm run build` succeeds on frontend
- [ ] No deprecated packages used
- [ ] All production dependencies are listed (devDependencies excluded)

### Testing
- [ ] Local setup works with `npm run dev`
- [ ] Can register/login successfully
- [ ] Can create products, record sales, view reports
- [ ] API calls work with localhost setup

---

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

```bash
# Ensure code is committed
git status
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Create MongoDB Atlas Database

1. **Sign up**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: 
   - Choose free tier (M0)
   - Select region closest to users
   - Name: `stockmanager`
3. **Create Database User**:
   - Username: `stockmanager_user`
   - Generate strong password
   - **Save this password** - you'll need it once
4. **Get Connection String**:
   - Click "Connect"
   - Choose "Drivers" 
   - Copy connection string:
   ```
   mongodb+srv://stockmanager_user:<password>@cluster0.xxxxx.mongodb.net/stockmanager?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password

5. **Whitelist IP**:
   - Go to Network Access
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0) for Render
   - ⚠️ Or add Render's static IP if available in your plan

### Step 3: Connect to Render

1. **Sign up**: https://render.com (free tier available)
2. **Connect GitHub**:
   - Dashboard → "New"
   - Select "Web Service"
   - Connect your GitHub account
   - Select this repository

3. **Render will auto-detect** `render.yaml` with:
   - ✅ Frontend service (`me-moo-stock-frontend`)
   - ✅ Backend service (`me-moo-stock-backend`)

### Step 4: Configure Environment Variables

In Render Dashboard → Services → Environment:

#### Backend Service (`me-moo-stock-backend`)
Add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Fixed |
| `PORT` | `10000` | Render default |
| `MONGO_URI` | `mongodb+srv://...` | From MongoDB Atlas step 2 |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | Strong random secret |
| `FRONTEND_URL` | Auto-filled from frontend service URL | CORS origin |

#### Frontend Service (`me-moo-stock-frontend`)
| Key | Value | Notes |
|-----|-------|-------|
| `VITE_API_URL` | Auto-filled backend URL + `/api` | Must point to backend |

### Step 5: Deploy

1. **Trigger Deploy**:
   - In Render dashboard, click "Deploy" on each service
   - Or push to main branch (auto-deploys if connected)

2. **Monitor Logs**:
   - Click service → "Logs" tab
   - Wait for success messages:
   ```
   ✅ MongoDB connected
   🚀 Server running on port 10000
   ```

3. **Check Health**:
   - Backend: `https://your-backend.onrender.com/health`
   - Frontend: `https://your-frontend.onrender.com`

### Step 6: Verify Deployment

1. **Open Frontend URL** in browser
2. **Register New Account**:
   ```
   Email: admin@test.com
   Password: SecurePass123!
   ```
3. **Test Features**:
   - Dashboard loads with metrics
   - Can add a product
   - Can record a stock-in
   - Can process a sale
   - Reports generate successfully

---

## Common Issues & Fixes

### 502 Bad Gateway
**Cause**: Backend crashed or failed to start
- Check MongoDB connection: `MONGO_URI` correct?
- Check backend logs for errors
- Verify `JWT_SECRET` is set

**Fix**:
```bash
# Local test
cd backend
echo "MONGO_URI=your-uri" > .env
npm start
curl http://localhost:10000/health
```

### Frontend shows "Cannot connect to API"
**Cause**: `VITE_API_URL` not set correctly
- Check frontend environment variables
- Must include `/api` path: `https://backend.onrender.com/api`
- Rebuild frontend after changing env vars

**Fix**:
1. Update `VITE_API_URL` in Render dashboard
2. Trigger manual deploy on frontend service
3. Clear browser cache (Ctrl+Shift+Delete)

### Build Fails with "Module not found"
**Cause**: Missing `node_modules`
- Build process didn't run `npm install`
- Remove lock files and rebuild

**Fix**:
```bash
# Local reproduction
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Slow Database Queries
**Cause**: MongoDB Atlas is in wrong region
- Check cluster region matches your users
- Check network connectivity

**Fix**:
- Create new cluster in better region
- Update `MONGO_URI` in Render
- Restart backend service

---

## Post-Deployment Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Check database storage usage monthly
- [ ] Review JWT expiration settings (default: 7 days)
- [ ] Backup MongoDB (Atlas does this automatically)

### Security Updates
- [ ] Review npm packages for vulnerabilities: `npm audit`
- [ ] Update packages quarterly: `npm update`
- [ ] Rotate `JWT_SECRET` annually
- [ ] Audit user accounts and permissions

### Performance Tuning
- Monitor Render metrics dashboard
- Add indexes to frequently-queried MongoDB fields
- Consider paid MongoDB tier if usage grows

---

## Rollback Instructions

If deployment breaks production:

1. **Immediate Rollback** (Render):
   - Dashboard → Service → "Recent Deploys"
   - Select previous working version
   - Click "Redeploy"

2. **Code Rollback** (Git):
   ```bash
   git revert <commit-hash>
   git push origin main
   # Render auto-deploys
   ```

3. **Database Rollback**:
   - MongoDB Atlas → Backups
   - Restore from snapshot before deployment

---

## Scaling for Production

### When to Upgrade

| Metric | Action |
|--------|--------|
| > 100 daily users | Upgrade to paid Render plan |
| Database > 1GB | Upgrade MongoDB to M2 |
| > 1000 products | Add database indexes |
| Response time > 2s | Implement caching layer |

### Scaling Recommendations

1. **Database**: MongoDB M2+ plan ($9/month) with auto-scaling
2. **Backend**: Render paid plan with multiple instances
3. **Frontend**: Can stay on free tier (CDN automatic)
4. **Caching**: Add Redis on Render for sessions (optional)

---

## Support & Troubleshooting

### Debug Mode
Enable detailed logging (local):
```bash
DEBUG=* npm start  # Backend
VITE_LOG=* npm run dev  # Frontend
```

### Check Connectivity
```bash
# From Render terminal or local
curl https://your-backend.onrender.com/health
curl https://your-frontend.onrender.com

# Test MongoDB connection
node -e "require('mongoose').connect(uri).then(()=> console.log('✅ Connected'))"
```

### Get Help
- Check Render docs: https://render.com/docs
- MongoDB Atlas docs: https://docs.atlas.mongodb.com
- This repo README: See parent directory README.md

---

## What's Included in render.yaml

The included `render.yaml` configures:

```yaml
# Two services:
# 1. Frontend: Builds Vite → serves with 'serve' package
# 2. Backend: Node.js server serving API + static frontend

# Environment variables automatically linked between services
# - Frontend gets backend URL
# - Backend gets frontend URL for CORS
# - JWT_SECRET auto-generated on first deploy
```

See [render.yaml](../render.yaml) for full configuration.
