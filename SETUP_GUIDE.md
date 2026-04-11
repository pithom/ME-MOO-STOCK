# ME-MOO STOCK Setup Guide

This file gives exact steps for:
- Hosting backend on Render
- Hosting frontend on Netlify
- Building Windows `.exe` setup

---

## A) Can I host it?

Yes. You can host:
- **Backend** on Render
- **Frontend** on Netlify
- **Desktop app** as a Windows `.exe` installer

---

## B) Render + Netlify (Click-by-click)

## 1) Deploy Backend on Render

1. Open [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** (top right)
3. Click **Web Service**
4. Click **Connect repository** and select your GitHub repo
5. Fill settings:
   - **Name**: `me-moo-stock-backend` (or any name)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Scroll to **Environment Variables** section
7. Click **Add Environment Variable** and paste each one:

   - Key: `NODE_ENV`  
     Value: `production`

   - Key: `PORT`  
     Value: `10000`

   - Key: `MONGO_URI`  
     Value: `your MongoDB Atlas connection string`

   - Key: `JWT_SECRET`  
     Value: `your strong secret string`

   - Key: `FRONTEND_URL`  
     Value: `https://your-netlify-site.netlify.app`  
     (you will update this after Netlify deploy if needed)

8. Click **Create Web Service**
9. Wait for deploy success
10. Copy your backend URL, e.g.:
    - `https://me-moo-stock-backend.onrender.com`

Test backend:
- Open `https://your-backend-url/health`
- You should see JSON response

---

## 2) Deploy Frontend on Netlify

1. Open [https://app.netlify.com](https://app.netlify.com)
2. Click **Add new site**
3. Click **Import an existing project**
4. Connect GitHub and select the same repo
5. Build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Expand **Environment variables**
7. Add:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url/api`
8. Click **Deploy site**
9. After deploy, copy Netlify site URL:
   - `https://your-site-name.netlify.app`

---

## 3) Final CORS Link (Important)

Go back to Render backend service:

1. Open backend service in Render
2. Go to **Environment**
3. Edit `FRONTEND_URL` and set:
   - `https://your-site-name.netlify.app`
4. Save changes
5. Trigger redeploy (Render may auto-redeploy)

Now frontend and backend should talk correctly.

---

## C) Windows `.exe` Setup (Desktop App)

## 1) Build frontend first

From project root terminal:

```bash
cd frontend
npm install
npm run build
```

## 2) Build `.exe` installer

```bash
cd ../electron
npm install
npm run dist:win
```

## 3) Find output files

Generated files are in:

- `electron/release/`

Usually includes:
- `ME-MOO STOCK Setup x.x.x.exe` (installer)
- `ME-MOO STOCK x.x.x.exe` (portable, if enabled)

## 4) Install on Windows

1. Double-click setup `.exe`
2. Follow installer wizard
3. Launch **ME-MOO STOCK** from desktop/start menu

---

## D) Env Values Summary (where to paste)

## Render (Backend) → Environment tab
- `NODE_ENV=production`
- `PORT=10000`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `FRONTEND_URL=https://your-netlify-site.netlify.app`

## Netlify (Frontend) → Site Settings → Environment variables
- `VITE_API_URL=https://your-render-backend-url/api`

---

## E) Quick Troubleshooting

- **Frontend shows CORS error**
  - Check backend `FRONTEND_URL` exactly matches Netlify URL

- **Login fails in production**
  - Check `VITE_API_URL` includes `/api`
  - Example: `https://backend.onrender.com/api`

- **Render backend sleeping on free plan**
  - First request may be slow; wait 30-60 seconds

- **No `.exe` created**
  - Ensure `frontend/dist` exists before `npm run dist:win`

