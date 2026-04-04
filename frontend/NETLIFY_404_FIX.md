# 🔴 Netlify 404 Error - Fix Guide

If you're seeing "Page not found" on your Netlify-deployed frontend, use this guide to fix it.

## Understanding the Error

The 404 error happens when:
- ✅ Netlify is serving the site
- ❌ But routes aren't being redirected to `index.html` for React Router
- ❌ OR the build didn't complete successfully

## ✅ Solution: Verify Build & Deployment

### Step 1: Check Netlify Build Configuration

Your `netlify.toml` should be:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Verify**: Check in Netlify dashboard > Site settings > Build & deploy > Build settings

### Step 2: Check Build Output

Netlify should show:
1. Deploy logs showing `npm run build` succeeded
2. `dist` folder populated with:
   - `index.html` (main file)
   - `assets/` folder with JS/CSS chunks

**If build failed**:
- Go to Netlify Dashboard > Deploys > Click latest deploy
- Check "Deploy log" tab for errors
- Common issues:
  - Missing environment variables
  - Node version mismatch
  - Dependency installation failed

### Step 3: Set Environment Variables in Netlify

1. Netlify Dashboard → Site settings → Build & deploy → Environment
2. Add:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```
3. **Trigger new deploy**: Deploys tab → Trigger deploy

### Step 4: Clear Cache & Rebuild

1. Netlify Dashboard → Deploys → Options (⋮) → Clear cache and redeploy
2. Wait for new deployment to complete

## 🧪 Test After Fix

1. Visit your Netlify URL
2. Try accessing a route like `/login` or `/products`
3. Should NOT show 404 - should load your React app
4. Check browser console for any errors

## If Still Getting 404

### Verify Files Exist
1. Netlify Dashboard → Deploys → Latest deploy → Files
2. Should see `index.html` in root
3. Should see `_redirects` in assets (optional, netlify.toml handles it)

### Check Frontend Code
1. Ensure `src/App.jsx` has routes defined
2. Verify `package.json` has React Router dependency
3. Try local build:
   ```bash
   cd frontend
   npm run build
   ls dist/  # Should show files
   npm run preview  # Test locally
   ```

## Deploy to Render Instead (Recommended)

If Netlify keeps failing, use Render (already configured):

1. Don't use Netlify for frontend
2. Use `render.yaml` setup instead:
   - Both frontend and backend on Render
   - Simpler environment management
   - Better Node.js integration
3. Remove Netlify site or keep as backup

## Quick Checklist

- [ ] `netlify.toml` exists with correct config
- [ ] `npm run build` works locally
- [ ] `dist/index.html` exists
- [ ] `VITE_API_URL` environment variable is set
- [ ] Latest deploy shows green checkmark
- [ ] Build log shows success
- [ ] Visited site URL - no 404 on routes

## Netlify Build Log Location
1. Netlify Dashboard
2. Site name → Deploys tab
3. Click latest deploy (green checkmark or failed status)
4. Click "Deploy log" button
5. Scroll through log looking for errors

## Still Stuck?

1. **Try the Render setup** - it's fully configured and more reliable for full-stack apps
   - See [DEPLOYMENT.md](../DEPLOYMENT.md)
   
2. **Check Netlify community** - https://community.netlify.com
   
3. **Local test first**:
   ```bash
   cd frontend
   npm run build
   npm run preview
   # Visit http://localhost:4173
   # Test all routes
   ```
   If this works locally, it's a Netlify configuration issue.

---

**Note**: The `render.yaml` in your root is designed for Render hosting. If using Netlify for frontend, you'd need to configure Render for backend only, then point frontend's `VITE_API_URL` to your Render backend URL.
