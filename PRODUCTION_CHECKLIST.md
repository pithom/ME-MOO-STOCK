# 🚀 Production Readiness Checklist

Use this checklist before deploying StockPro Manager to production.

## 🔐 Security

- [ ] **No hardcoded secrets**: All API keys, MongoDB URIs, and JWT secrets are in `.env` only
- [ ] **Secrets not in Git**: `.env` is in `.gitignore` and never committed
- [ ] **Strong JWT secret**: Generated with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] **CORS configured**: `FRONTEND_URL` environment variable is set for allowed origins
- [ ] **HTTPS enabled**: Render automatically provides SSL certificates
- [ ] **Password security**: bcryptjs is used for password hashing (check backend models)
- [ ] **No test accounts**: All demo/test users removed from production database

## 🏗️ Code Quality

- [ ] **No console.log in production**: Search codebase and remove debug logs
- [ ] **Error handling**: Backend returns proper error messages without stack traces in production
- [ ] **Frontend env vars**: All API URLs use `import.meta.env.VITE_API_URL`
- [ ] **No deprecated code**: Using latest stable versions of dependencies
- [ ] **ESLint passes**: `npm run lint` has no critical errors
- [ ] **Builds successfully**: `npm run build` works without warnings

## 📦 Dependencies

- [ ] **No dev-only in production**: `devDependencies` only contain build/dev tools
- [ ] **Package versions pinned**: Using specific versions, not `*` or too broad ranges
- [ ] **Node version specified**: `package.json` has `"engines": { "node": ">=18.0.0" }`
- [ ] **npm audit clean**: `npm audit` shows no critical vulnerabilities

## ⚙️ Configuration

- [ ] **render.yaml exists**: Both frontend and backend services configured
- [ ] **Environment variables documented**: `.env.example` files show all required vars
- [ ] **Build scripts correct**: `"build": "vite build"` and `"start": "node server.js"` are correct
- [ ] **API base URL strategy**: Frontend correctly detects production vs development URL
- [ ] **Database connection**: MongoDB connection string works with Render network

## ✅ Testing Before Deploy

### Local Testing
- [ ] Backend starts: `cd backend && npm start` → Health check at `http://localhost:5000/health` ✅
- [ ] Frontend builds: `cd frontend && npm run build` → Completes with no errors ✅
- [ ] Local full stack works with `.env` files configured

### Functionality Testing
- [ ] **Auth**: Can register and login with new account
- [ ] **Products**: Can create, read, update, delete products
- [ ] **Stock**: Can record stock-in and see inventory update
- [ ] **Sales**: Can record paid and pending sales
- [ ] **Reports**: Can view daily and pending reports
- [ ] **API**: All requests successful with correct responses
- [ ] **Error handling**: Invalid requests show helpful error messages
- [ ] **Loading states**: Frontend shows loading indicators while fetching
- [ ] **Responsive design**: App works on mobile, tablet, desktop

### Performance Testing
- [ ] Page load time < 3 seconds (frontend)
- [ ] API response time < 1 second (backend)
- [ ] No console errors in browser DevTools
- [ ] No memory leaks (check DevTools > Memory tab)

## 🌍 Render Deployment Prep

### Before Clicking Deploy
- [ ] GitHub repo is up to date and pushed
- [ ] `render.yaml` is in root directory
- [ ] Created MongoDB Atlas account and cluster
- [ ] Have MongoDB connection string ready (save securely)
- [ ] Render account created and connected to GitHub

### Environment Variables Ready
Create list of these values (don't store unencrypted):
```
Backend Variables:
- MONGO_URI: mongodb+srv://...
- JWT_SECRET: [generated 64-char hex]
- FRONTEND_URL: [will be auto-filled]
- NODE_ENV: production

Frontend Variables:
- VITE_API_URL: [will be auto-filled backend + /api]
```

## 🚀 Deployment Day

### Step 1: Final Checks
```bash
# Local verification
npm run build  # Both frontend and backend
npm start      # Backend should start

# Git status
git status     # Should be clean
git log -1     # See latest commit
```

### Step 2: Deploy
- [ ] Push code to GitHub (if not already)
- [ ] Go to Render dashboard
- [ ] Create services or trigger manual deploy
- [ ] Wait for both services to build and deploy

### Step 3: Post-Deploy Validation
- [ ] Check backend logs for "✅ MongoDB connected"
- [ ] Check backend logs for "🚀 Server running on port"
- [ ] Visit frontend URL in browser - should load
- [ ] Register test account and verify all features work
- [ ] Check browser DevTools console - no errors
- [ ] Test on mobile browser

## 📊 Monitoring Post-Deploy

### Daily First Week
- [ ] Check error logs in Render dashboard
- [ ] Monitor application response times
- [ ] Test all features are working
- [ ] Verify database growth is expected

### Weekly
- [ ] Review user activity
- [ ] Check for any error patterns
- [ ] Monitor storage usage (database)
- [ ] Verify backups are working (MongoDB Atlas)

### Monthly
- [ ] Review and update dependencies
- [ ] Check `npm audit` for vulnerabilities
- [ ] Archive old logs
- [ ] Assess performance metrics

## 🆘 Quick Rollback

If issues are discovered after deploy:

**Option 1: Revert to Previous Deploy** (Render)
1. Go to Service → Recent Deploys
2. Find last working deploy
3. Click "Redeploy"

**Option 2: Revert Code** (Git)
```bash
git revert HEAD
git push
# Render auto-deploys new version
```

**Option 3: Restore Database** (MongoDB Atlas)
1. Backups → Select snapshot from before deploy
2. Restore to new database
3. Update MONGO_URI in Render

## ✨ After Successful Deploy

- [ ] Document final production URLs
- [ ] Add to project documentation
- [ ] Share credentials securely with team
- [ ] Set up monitoring alerts (optional)
- [ ] Create runbook for common issues
- [ ] Archive this checklist with deploy date

---

**Last Updated**: April 4, 2026  
**Deploy Status**: Not yet deployed  
**Production URL**: [To be filled in]  
**Notes**: 
```
[Add deployment notes here]
```
