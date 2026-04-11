# ME-MOO STOCK - Web, Desktop, Android Setup

This guide gives full setup/deploy flow for:
- Web app (Frontend + Backend online)
- Desktop app (Windows installer)
- Android app (APK/AAB via Android Studio)

---

## 1) Prerequisites

- Node.js 18+
- MongoDB Atlas (or other MongoDB)
- Git
- Android Studio (for Android build)
- Windows 10/11 (for desktop installer build)

Use environment templates:
- `backend/.env.example`
- `frontend/.env.example`

---

## 2) Web Application Deployment

### Backend (Render or Railway)

1. Deploy `backend` as Node service.
2. Set env vars:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`
3. Start command: `npm start`

If using Render, `render.yaml` is already included in root.

### Frontend (Netlify or Vercel)

Deploy `frontend` folder.

Required env:
- `VITE_API_URL=https://your-backend-domain/api`

Build settings:
- Build command: `npm run build`
- Publish dir: `dist`

Netlify config already exists:
- `frontend/netlify.toml`

---

## 3) Desktop Application (Electron)

### Local desktop run

```bash
cd frontend
npm install
npm run build

cd ../electron
npm install
npm start
```

### Build Windows installer (.exe)

```bash
cd frontend
npm run build

cd ../electron
npm install
npm run dist:win
```

Output:
- `electron/release/` contains installer and portable build.

---

## 4) Android Application (Capacitor)

### First time setup

```bash
cd frontend
npm install
npm run mobile:init
npm run mobile:add:android
```

### Build and sync web assets into Android project

```bash
npm run mobile:build:android
```

### Open Android Studio project

```bash
npm run mobile:android
```

Then in Android Studio:
1. Wait Gradle sync.
2. Build > Build Bundle(s) / APK(s) > Build APK(s) for testing.
3. Build > Generate Signed Bundle/APK for Play Store release.

---

## 5) Recommended Production API URL Strategy

For both Android and desktop builds, make sure frontend is built with:

```env
VITE_API_URL=https://your-backend-domain/api
```

Do not use localhost in production builds for Android/Desktop.

---

## 6) Quick Deploy Checklist

- Backend live and health endpoint works
- Frontend points to correct backend URL
- Login works in web production
- Desktop app opens `frontend/dist/index.html`
- Android app builds and API calls work on real device
- CORS `FRONTEND_URL` updated to live frontend domain
