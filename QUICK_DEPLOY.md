# 🚀 Quick Deployment Reference

**TL;DR** - Deploy StockPro Manager in 30 minutes

## Prerequisites
- [ ] GitHub account with repo access
- [ ] Render account (https://render.com)
- [ ] MongoDB Atlas cluster (https://mongodb.com/atlas)

## 3-Step Deploy

### 1️⃣ MongoDB Setup (5 min)
```
1. Go to https://mongodb.com/atlas
2. Create free cluster
3. Create user: stockmanager_user / [password]
4. Get connection string
5. Add IP: 0.0.0.0/0 (for Render)
```

### 2️⃣ Render Setup (10 min)
```
1. Go to https://render.com
2. Connect GitHub repo
3. Render auto-reads render.yaml
4. Fill environment variables:
   - MONGO_URI (from MongoDB step)
   - JWT_SECRET (generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
5. Deploy
```

### 3️⃣ Verify (5 min)
```
1. Wait for green checkmarks
2. Click frontend URL
3. Register test account
4. Test all features
✅ Done!
```

## Environment Variables Checklist

### Backend (`me-moo-stock-backend`)
- `MONGO_URI` = `mongodb+srv://stockmanager_user:PASSWORD@cluster0.xxxxx.mongodb.net/stockmanager?retryWrites=true&w=majority`
- `JWT_SECRET` = [auto-generated strong key from `node -e "..."`]
- `FRONTEND_URL` = [auto-filled by Render]
- `NODE_ENV` = `production`

### Frontend (`me-moo-stock-frontend`)
- `VITE_API_URL` = [auto-filled by Render + `/api`]

## Troubleshooting Quick Answers

| Problem | Fix |
|---------|-----|
| **502 Bad Gateway** | Check MongoDB URI, restart backend |
| **Cannot connect API** | Verify VITE_API_URL has `/api` at end |
| **Build fails** | Add Node version to package.json: `"engines": {"node": ">=18.0.0"}` |
| **CORS error** | Check FRONTEND_URL is set in backend |

## URLs After Deploy

```
Frontend: https://me-moo-stock-frontend.onrender.com
Backend:  https://me-moo-stock-backend.onrender.com
API:      https://me-moo-stock-backend.onrender.com/api
```

## Rollback (if needed)
1. Render Dashboard → Service → "Recent Deploys"
2. Click previous version → "Redeploy"
3. Or: `git revert HEAD && git push`

## Full Docs
- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed guide
- ✅ [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Before deploy
- 📊 [PRODUCTION_READY.md](./PRODUCTION_READY.md) - Status report

---

**Ready? Go to [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide**
