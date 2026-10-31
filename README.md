# CareSphere — AI-Powered Hospital Information & Patient Assistance Platform

> **Tagline:** “Your Health, Your Language, Your Care.”

CareSphere is a modern, production-ready, secure, and fully multilingual healthcare web platform. It empowers patients to discover verified doctors, explore hospital departments and 24/7 facilities, book outpatient appointments with real-time slot conflict prevention, and interact with a multilingual AI health assistant across **10 Indian languages**.

---

## 🌟 Key Features

### 1. Complete Multilingual System (Core Capability)
- **10 Supported Languages:**
  - 🇬🇧 English
  - 🇮🇳 தமிழ் (Tamil)
  - 🇮🇳 हिन्दी (Hindi)
  - 🇮🇳 తెలుగు (Telugu)
  - 🇮🇳 ಕನ್ನಡ (Kannada)
  - 🇮🇳 മലയാളം (Malayalam)
  - 🇮🇳 বাংলা (Bengali)
  - 🇮🇳 मराठी (Marathi)
  - 🇮🇳 ગુજરાતી (Gujarati)
  - 🇮🇳 ਪੰਜਾਬੀ (Punjabi)
- **First-Visit Onboarding Modal:** Greets visitors with *"Welcome to CareSphere! Which language would you prefer?"*, featuring search and browser language auto-detection.
- **Header Language Selector:** Switch languages at any moment with **instant reactive re-rendering** across all pages, forms, notifications, and AI responses without requiring a page reload.
- **Preference Persistence:** Saved in `localStorage` for guests, and automatically synchronized to the user's permanent profile in the database upon sign-in.

### 2. Role-Based Access Control (RBAC) & Doctor Verification Workflow
- **Patient Portal:** Book appointments, manage upcoming consultations, reschedule/cancel slots, view doctor's clinical notes, and receive multilingual in-app notifications.
- **Doctor Portal & Approval Process:**
  1. Doctor registers with medical council registration number, qualifications, and department.
  2. Account enters `pending_verification` status and is blocked from public search and booking.
  3. Authorized Hospital Administrator reviews credentials in the Admin Center and approves or rejects the application.
  4. Once approved, the doctor's profile and 30-minute booking slots go live hospital-wide.
  5. Doctors manage patient schedules, write clinical prescriptions, and update consultation statuses.
- **Hospital Administrator Center:** Provisioned securely via controlled setup/seed; monitors hospital statistics, verifies doctor applications, manages patient accounts, audits system logs, and broadcasts hospital announcements.

### 3. Concurrency-Safe Online Appointment Booking
- 4-Step Booking Wizard: Department ➔ Doctor ➔ Date & Time Slot ➔ Reason / Confirmation.
- **Slot Concurrency Lock:** Database atomic transactions and unique active slot indexes prevent race conditions and double bookings. If two patients attempt to book the exact same slot simultaneously, one succeeds and the other receives a friendly conflict notice to pick an alternative slot.
- **Instant Confirmation:** Generates a unique hospital appointment reference number (e.g. `CS-2026-XXXXX`).
- **Reschedule & Cancellation:** Frees up released slots in real time for other patients.

### 4. Grounded Multilingual AI Assistant
- Available site-wide via a floating assistant widget.
- **Multilingual Context:** Speaks and understands the user's active preferred language.
- **Emergency Triage Detection:** Detects severe symptoms (chest pain, breathlessness, stroke signs, heavy bleeding) and immediately surfaces an emergency alert banner with emergency trauma hotlines (`+91-80-CARE-911`, `108 / 112`) without delay.
- **Grounded Hospital Knowledge:** Answers questions about visiting hours, department locations, doctor credentials, booking procedures, and laboratory facilities.
- **Flexible Server Integration:** Supports Google Gemini API via `GEMINI_API_KEY` with an intelligent, offline-first multilingual knowledge-base fallback engine when no key is set.
- Clear medical disclaimer displayed on every interaction.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, i18next, React Router DOM.
- **Backend:** Node.js, Express.js, TypeScript (via TSX / TSC), Helmet, CORS, JWT authentication, bcryptjs.
- **Database:** SQLite with WAL mode and foreign key constraints via `better-sqlite3`. Schema is fully compatible with PostgreSQL / Supabase for production deployments.
- **AI Service:** Google Gemini API integration with local grounded multilingual triage and hospital facts fallback.
- **Testing:** Vitest with Supertest.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher; tested on Node.js v26)
- npm (v9 or higher)

### Installation

```bash
# Clone or navigate to the project directory
cd /Users/yeshwanth/.gemini/antigravity/scratch/caresphere

# Install root & server dependencies
npm install

# Install client dependencies
npm run --prefix client install
```

### Seed Demonstration Database

Initialize the SQLite database with departments, verified doctors, pending doctors, sample patients, hospital facilities, FAQs, and announcements:

```bash
npm run seed
```

### Running in Development Mode

Run the backend server (`localhost:5001`) and the Vite client (`localhost:5173`) concurrently:

```bash
npm run dev
```

Visit **http://localhost:5173** in your browser. (Note: Port 5001 is used for the backend to avoid conflicts with macOS AirPlay/ControlCenter on port 5000).

---

## 🔑 Quick Demo Credentials (Pre-Seeded)

The login screen features 1-click demo autofill buttons for each role:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Hospital Administrator** | `admin@caresphere.health` | `Admin@12345` | Full administrative control, doctor verification & audit logs |
| **Approved Doctor** | `dr.sharma@caresphere.health` | `Doctor@12345` | Dr. Rajesh Sharma (Cardiology, 15 yrs exp) |
| **Pending Doctor** | `dr.anand@caresphere.health` | `Doctor@12345` | Dr. Anand Verma (Neuro Surgery - for testing verification) |
| **Patient 1 (Hindi)** | `ravi.kumar@example.com` | `Patient@12345` | Ravi Kumar (Upcoming & completed appointments) |
| **Patient 2 (English)** | `ananya.sen@example.com` | `Patient@12345` | Ananya Sen |
| **Patient 3 (Tamil)** | `karthik.selvam@example.com` | `Patient@12345` | Karthik Selvam |

---

## 🧪 Automated Testing Suite

CareSphere includes an automated test suite covering authentication, RBAC authorization gates, slot booking concurrency, rescheduling/cancellation slot release, and multilingual emergency AI triage:

```bash
npm test
```

### Tested Capabilities:
1. **Health Check & Public Information:** Validates `/api/health`, emergency hotlines, and departments.
2. **Authentication & Language Persistence:** Validates patient registration, duplicate rejection, language preference update, and `/api/auth/me`.
3. **RBAC & Doctor Approval Process:** Verifies that regular patients are rejected from admin routes (HTTP 403), new doctors register with `pending` status, and administrators can approve applications.
4. **Appointment Booking & Concurrency Lock:** Verifies unique reference generation (`CS-YYYY-XXXXX`), confirms that simultaneous duplicate booking on the exact same slot is rejected with `HTTP 409 Conflict`, and tests slot release upon cancellation.
5. **AI Assistant Multilingual Safety:** Verifies immediate emergency warning triggers for chest pain keywords in English and Tamil (`நெஞ்சு வலி`), and tests Hindi queries.

---

## 🏗️ Production Build & Deployment

### Production Build

```bash
# Builds client to client/dist and compiles server TypeScript
npm run build
```

### Running in Production

```bash
npm start
```

The server automatically serves the compiled static frontend from `client/dist` and handles API requests on port `5001`.

### Deploying to Render
CareSphere is fully optimized for **Render**:
- **Blueprint File:** `render.yaml` is pre-configured for one-click setup.
- **Detailed Step-by-Step Guide:** See [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md).
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Endpoint:** `/api/health`
- **Publish Directory:** None needed (unified web service serving `client/dist`). If deploying frontend as a separate Static Site, use `client/dist`.

### PostgreSQL / Supabase Migration
The database schema located at `server/src/db/schema.sql` uses portable ANSI SQL syntax. To deploy with Supabase or Neon PostgreSQL:
1. Create a PostgreSQL database instance.
2. Run `server/src/db/schema.sql` in Supabase SQL Editor.
3. Replace `better-sqlite3` queries with `pg` / `Prisma` connection strings.

---

## 🔒 Security & Privacy

- **Data Minimization:** Only necessary medical notes and contact details are collected.
- **Password Protection:** All passwords are salted and hashed with bcrypt (10 rounds).
- **Session Security:** Standard JSON Web Tokens (JWT) with server verification on every protected route.
- **Audit Logging:** Every sensitive event (doctor approval/rejection, booking, cancellation, user login) is logged to the `audit_logs` table with timestamp and IP address.
- **Concurrency Protection:** Partial unique index `idx_unique_active_slot` ensures database-enforced integrity against double booking.
- **Medical Disclaimer:** Visible notice that AI advice is educational and emergency numbers are surfaced immediately.
