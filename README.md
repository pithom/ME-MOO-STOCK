# StockPro Manager (Stock Management System)

## Overview
Full-stack stock management system with:
- Product management (CRUD)
- Stock-in records (increase inventory)
- Sales (paid + pending/credit)
- Pending payment management (mark as paid)
- Dashboard + reports

Tech:
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth
- **Frontend**: React + Vite

## Prerequisites
- Node.js installed
- MongoDB running (local or cloud)

## Backend setup
1. Open a terminal in `backend/`
2. Install dependencies:

```bash
npm install
```

3. Create/verify `backend/.env`:
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `PORT=5000` (optional)

4. Run backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## Frontend setup
1. Open a terminal in `frontend/`
2. Install dependencies:

```bash
npm install
```

3. Create/verify `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
```

4. Run frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## First use
1. Visit `http://localhost:5173`
2. Register a new account
3. Add products → stock in → record sales → view reports

