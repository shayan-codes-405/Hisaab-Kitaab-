# 🚀 HisabKitab Cloud Deployment Guide

This guide walks you through deploying **HisabKitab Backend on Render** (via Docker) and **HisabKitab Frontend on Vercel**, complete with CORS configuration and environment variable setup.

---

## 1. Backend Deployment on Render (Docker)

Render supports Docker builds natively from your GitHub repository.

### Option A: Automatic via Render Blueprint (`render.yaml`)
1. Push your repository to GitHub: `https://github.com/shayan-codes-405/Hisaab-Kitaab-.git`
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Select your repository. Render will automatically detect the [`render.yaml`](file:///render.yaml) file.
4. Fill in the required environment variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`)
   - `DATABASE_NAME`: `hisabkitab_db`
   - `FRONTEND_ORIGIN`: Your Vercel domain (e.g. `https://hisab-kitaab.vercel.app`)
5. Click **Apply**. Render will build the Docker container and deploy the web service.

### Option B: Manual Web Service Setup
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `hisabkitab-backend`
   - **Region**: Choose closest to your users (e.g., Singapore or Oregon)
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority` |
   | `DATABASE_NAME` | `hisabkitab_db` |
   | `SECRET_KEY` | `your_secret_production_random_key_2026` |
   | `TOKEN_EXPIRE_HOURS` | `24` |
   | `FRONTEND_ORIGIN` | `https://hisab-kitaab.vercel.app` |
   | `CORS_ORIGINS` | `https://hisab-kitaab.vercel.app,http://localhost:5173` |
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL (e.g. `https://hisabkitab-backend.onrender.com`). Verify by visiting `https://hisabkitab-backend.onrender.com/api/health`.

---

## 2. Frontend Deployment on Vercel

### Step 1: Import Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository: `https://github.com/shayan-codes-405/Hisaab-Kitaab-.git`.

### Step 2: Configure Project Settings
- **Framework Preset**: `Vite`
- **Root Directory**: Click *Edit* and select `frontend` (crucial!)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables in Vercel
Under the **Environment Variables** section in Vercel, add:
| Key | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://hisabkitab-backend.onrender.com` | Enter your actual Render URL **without a trailing slash** |

### Step 4: Deploy
Click **Deploy**. Vercel will build and launch your application.
SPA routing rewrites are already configured in [`frontend/vercel.json`](file:///frontend/vercel.json), ensuring seamless navigation and page refreshes.

---

## 3. CORS & Communication Checklist

The backend CORS engine in [`backend/main.py`](file:///backend/main.py) is preconfigured with:
- Dynamic regex matching `allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+"`.
- This automatically accepts API calls from **all Vercel deployment URLs** (production domains and branch previews) without requiring manual whitelist updates.
- Full credential support, headers `*`, methods `*`, and exposed headers `Content-Disposition` for instant PDF downloads.

---

## 4. Seeding Data (Stationery Products & Dashboard)

To seed or re-seed your MongoDB Atlas database with the 10 stationery products and 6-month historical dashboard invoices:
```bash
# In your local project directory or Render shell:
python backend/seed_stationery.py
python backend/seed_dashboard.py
```
This populates:
- **10 stationery products** with package/loose units, GST rates, and SKUs.
- **13 invoices** spanning May to October 2026 across various Indian states (CGST/SGST and IGST).
- Realistic KPI totals (~₹89,940 gross sales, ~₹77,760 collected, ~₹15,240 gross profit).
- Low stock threshold alerts for Kangaro staplers and 3M Post-it notes.
- Default login credentials:
  - **Username**: `admin`
  - **Password**: `admin123`

