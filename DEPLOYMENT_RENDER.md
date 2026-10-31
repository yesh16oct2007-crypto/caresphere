# 🚀 Deploying CareSphere to Render (Complete Guide)

This guide walks you through deploying **CareSphere** onto [Render](https://render.com) using either the **One-Click Blueprint** (`render.yaml`) or the **Render Web Dashboard**.

---

## 📋 Architecture Overview

CareSphere is architected as an optimized full-stack application:
- **Frontend:** React 18, Vite, Tailwind CSS, TypeScript, i18next (10 Indian languages).
- **Backend:** Node.js, Express, TypeScript, SQLite (`better-sqlite3`), JWT authentication.
- **Production Serving:** Express serves the compiled static frontend assets (`client/dist`) and API routes (`/api/*`) on a single port.
  - Same origin: eliminates CORS errors, SSL domain mismatch, and simplifies DNS.
  - Memory-efficient: pre-compiled JavaScript with zero runtime TypeScript transpilation overhead.
  - Concurrency & Auto-Seed: automatically provisions database tables and pre-seeds hospital demo data if running in a fresh container.

---

## 🛠️ Deployment Method 1: Using `render.yaml` (Recommended & Fastest)

CareSphere includes a production-ready `render.yaml` blueprint at the root of the repository.

1. **Push your code to GitHub or GitLab**:
   ```bash
   git add .
   git commit -m "Prepare CareSphere for production deployment on Render"
   git push origin main
   ```

2. **Open Render Dashboard**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** ➔ **Blueprint**.
   - Select your CareSphere repository.
   - Render will detect `render.yaml` and configure the web service automatically.

3. **Deploy**:
   - Click **Apply**.
   - Render will build the client, compile the server, and launch the service.

---

## 🛠️ Deployment Method 2: Manual Web Service Setup via Render Dashboard

If you prefer to configure the service manually via the Render UI:

### Step 1: Create a New Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your CareSphere repository.

### Step 2: Configure Service Settings

| Setting | Value | Explanation |
| :--- | :--- | :--- |
| **Name** | `caresphere` (or your preferred name) | Subdomain on `onrender.com` |
| **Region** | `Oregon (US West)` or nearest region | Lowest latency to your users |
| **Branch** | `main` | Production branch |
| **Root Directory** | *(leave blank)* | Root of repository |
| **Runtime** | `Node` | Standard Node.js environment |
| **Build Command** | `npm install && npm run build` | Installs root & client dependencies, builds Vite client, compiles TypeScript server, and copies schema |
| **Start Command** | `npm start` | Runs `node server/dist/index.js` in production mode |
| **Instance Type** | `Free` (or `Starter` for zero-sleep & persistent disk) | 512 MB RAM / 0.1 CPU is sufficient |

### Step 3: Configure Environment Variables

Under the **Environment Variables** tab, add the following key-value pairs:

| Variable Name | Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations & Express static serving |
| `PORT` | `10000` | Render assigns port 10000 by default (our code reads `process.env.PORT`) |
| `JWT_SECRET` | *(Click "Generate" or paste a 64-char random hex string)* | Used for cryptographic signing of authentication tokens |
| `DATABASE_FILE` | `./caresphere.db` *(or `/var/data/caresphere.db` if using a disk)* | Location of the SQLite database |
| `GEMINI_API_KEY` | *(Optional)* | Optional Google Gemini API key for the AI assistant. If omitted, built-in multilingual engine responds smoothly. |

> [!IMPORTANT]
> **No Secrets in Frontend:** The frontend client does NOT contain any secret keys or credentials. All API communication occurs with the backend via secure relative `/api` paths.

### Step 4: Configure Health Check Path
- Scroll down to **Advanced** ➔ **Health Check Path**.
- Enter: `/api/health`
- Render uses this endpoint to confirm that your service is healthy before completing deployment.

### Step 5: Click "Create Web Service"
Render will initiate the build and deploy pipeline. Once complete, your site will be live at `https://caresphere-xxxx.onrender.com`!

---

## 💾 Preserving Data on Render (Optional Disk Setup)

### On Free Tier:
- SQLite runs in the container's ephemeral storage.
- If the free instance spins down due to inactivity and restarts, `ensureDatabaseSeeded()` detects an empty database and **automatically seeds** all departments, doctors, FAQs, facilities, and the administrator account instantly.
- Demo logins (`admin@caresphere.health`, `dr.sharma@caresphere.health`, `rahul.verma@example.com`) are always immediately usable.

### On Starter Tier ($7/mo) with Persistent Disk:
If you want patient registrations and booked appointments to persist permanently across restarts:
1. In your Render service, go to **Disks** ➔ **Add Disk**.
2. **Name:** `caresphere-data`
3. **Mount Path:** `/var/data`
4. **Size:** `1 GB` (or more).
5. CareSphere will automatically detect `/var/data` and store `caresphere.db` and uploaded doctor certificates in `/var/data/uploads` without requiring any manual code changes!

---

## 🔍 Pre-Configured Demo Credentials

Once deployed on Render, you can log in with:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Hospital Administrator** | `admin@caresphere.health` | `Admin@12345` | Doctor credential verification checklist, system analytics, announcements, audit logs |
| **Senior Specialist Doctor** | `dr.sharma@caresphere.health` | `Doctor@12345` | Real-time presence beacon, chamber GPS, schedule management, patient clinical notes |
| **Registered Patient** | `rahul.verma@example.com` | `Patient@12345` | Appointment booking, rescheduling, cancellation, multilingual AI assistant |

---

## ❓ Frequently Asked Questions & Troubleshooting

### 1. Build fails with `Property 'env' does not exist on type 'ImportMeta'`
- **Fixed:** CareSphere includes `client/src/vite-env.d.ts` which provides the Vite typing declarations for `import.meta.env`.

### 2. What is the Publish Directory?
- When deploying as a **Single Web Service (recommended)**, you do **NOT** need to set a publish directory in Render. The backend compiles to `server/dist` and serves `client/dist` directly.
- If you deploy the frontend as a separate **Render Static Site**, set **Publish Directory** to `client/dist` and set **Build Command** to `npm run build:client` with environment variable `VITE_API_BASE_URL=https://your-backend.onrender.com`.

### 3. How do regional languages work in production?
- All 10 Indian language dictionaries (`en`, `ta`, `hi`, `te`, `kn`, `ml`, `bn`, `mr`, `gu`, `pa`) are bundled directly into the frontend assets. They load instantaneously without any external third-party translation latency.
