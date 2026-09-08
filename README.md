# ☕ Tea Time Cafe — QR Ordering & Admin Operations SaaS

An authentic, modern, single-cafe (expandable to multi-outlet) SaaS application tailored for Indian Irani Chai cafes. Features a **zero-login QR customer ordering PWA** and a **real-time operations & analytics cockpit** for cafe owners and staff.

---

## 🌟 Key Highlights

- **Anonymous Customer App (`/order?table=T1`)**: 
  - Scan table QR code to browse categorized bilingual menus (English + Telugu - తెలుగు).
  - Search, Veg/Non-Veg filters, item customization notes, floating cart, and 5% GST tax calculation.
  - Dual checkout: **Pay Online (UPI / Card)** or **Pay at Counter (Cash)**.
  - Live order tracking pipeline (`Placed ➔ Accepted ➔ Preparing ➔ Ready ➔ Served`) driven by WebSockets.
  - 1-tap table service calls (💧 Water, 🧾 Bill, 🛎️ Waiter, 🧹 Clean Table).

- **Real-Time Admin Cockpit (`/admin`)**:
  - **Live Orders Kanban Board**: 5-stage interactive board with one-tap status progression and Web Audio API synthetic dual-tone chimes 🔔.
  - **Kitchen Display System (KDS) (`/admin/kds`)**: High-contrast kitchen view with ticking elapsed-time timers and item checklists.
  - **Menu & Price Catalog (`/admin/menu`)**: Full category/item CRUD, photo uploads, staff availability toggles, and owner-only price protection.
  - **Tables & Printable QR Stands (`/admin/tables`)**: Live occupancy indicators and high-res printable table stand cards with browser print support.
  - **Inventory & Stock (`/admin/stock`)**: Automatic stock deduction on sale, low-stock banners, manual restock/wastage entries, and audit logs.
  - **Payments & Cashier (`/admin/payments`)**: Razorpay online transaction ledger and 1-tap counter cash reconciliation.
  - **Sales Analytics (`/admin/analytics`)**: Daily revenue trends, best-selling brews/bakes, 24-hour rush heatmap, and table turnover leaderboard.
  - **System Audit Log (`/admin/audit`)**: Immutable log of every price change, stock adjustment, and cash collection with staff attribution.

---

## 🏗️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────┐
│                       TEA TIME CAFE SAAS                       │
└───────────────────────────────┬────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     CUSTOMER WEB APP (PWA)    │               │         ADMIN COCKPIT         │
│  - Next.js 16 (App Router)    │               │  - Live Kanban & KDS          │
│  - Tailwind CSS v4            │               │  - Menu & Price CRUD          │
│  - English & Telugu (i18n)    │               │  - Tables & Printable QR      │
│  - Live Order Tracker         │               │  - Cashier & Sales Analytics  │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │ (HTTP REST + WebSockets)
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND SERVICE                              │
│  - Python 3.14 + FastAPI + Pydantic v2                                        │
│  - SQLAlchemy 2.0 ORM (SQLite for Dev / PostgreSQL for Prod)                  │
│  - JWT Bearer Authentication & Role-Based Access Control (Owner / Staff)      │
│  - WebSocket Connection Manager (/ws) for Instant Broadcasts                 │
│  - Native Money Math in Integer Paise (No Float Errors)                       │
│  - Razorpay Test Payment Integration                                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Python 3.10+** (Python 3.14 supported)
- **Node.js 18+** & `npm`

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file from template
copy .env.example .env
# On macOS / Linux: cp .env.example .env

# Seed initial database (Outlet, Users, Tables, and Bilingual Menu)
python -m app.seed

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
```

- **Backend API**: [`http://127.0.0.1:8000`](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)
- **WebSocket Endpoint**: `ws://127.0.0.1:8000/ws`

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Create environment file from template
copy .env.example .env.local
# On macOS / Linux: cp .env.example .env.local

# Start Next.js development server
npm run dev
```

- **Frontend App**: [`http://localhost:3000`](http://localhost:3000)
- **Customer QR Ordering**: [`http://localhost:3000/order?table=T1`](http://localhost:3000/order?table=T1)
- **Admin Cockpit**: [`http://localhost:3000/admin`](http://localhost:3000/admin)
- **Admin Login**: [`http://localhost:3000/admin/login`](http://localhost:3000/admin/login)

---

## 🔑 Demo Login Credentials

The seed script creates two pre-configured accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| 👑 **Owner** | `owner@teatime.com` | `admin123` | Full access, Price Editing, Deletions, Analytics, Audits |
| 🧑‍🍳 **Staff** | `staff@teatime.com` | `staff123` | Order progression, Availability toggles, Stock restock/wastage, Cash collection |

*(Click the 1-Tap Quick Fill buttons on `/admin/login` for instant demo access).*

---

## ⚙️ Environment Variables

### Backend (`/backend/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./teatime.db` | SQLite URL or PostgreSQL connection string |
| `SECRET_KEY` | `teatime_super_secret_jwt_key_2026` | Secret key for JWT HS256 signatures |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiration time (24 hours) |
| `RAZORPAY_KEY_ID` | `rzp_test_tea_time_cafe_key` | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | `rzp_test_tea_time_cafe_secret` | Razorpay test key secret |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin and QR target |

### Frontend (`/frontend/.env.local`)
| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | REST API endpoint |
| `NEXT_PUBLIC_WS_URL` | `ws://127.0.0.1:8000/ws` | Live WebSocket Hub endpoint |

---

## ☁️ Production Deployment Guide

### 1. Backend + PostgreSQL on Railway or Render
1. Create a new **PostgreSQL Database** on [Railway](https://railway.app) or [Render](https://render.com).
2. Create a new **Web Service** pointing to `/backend`.
3. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `SECRET_KEY`: A cryptographically secure random string.
   - `FRONTEND_URL`: Your deployed frontend URL (e.g. `https://teatime.vercel.app`).
4. Set Build Command: `pip install -r requirements.txt`
5. Set Start Command: `python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2. Frontend on Vercel
1. Import your repository into [Vercel](https://vercel.com) and set the Root Directory to `frontend`.
2. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://api.teatime.railway.app`).
   - `NEXT_PUBLIC_WS_URL`: Your deployed WebSocket URL (e.g. `wss://api.teatime.railway.app/ws`).
3. Click **Deploy**.

---

## 🧪 Automated Testing

Run the test suites in `/backend`:

```bash
cd backend

# Run all test suites
.\venv\Scripts\python test_auth.py
.\venv\Scripts\python test_menu_tables.py
.\venv\Scripts\python test_orders.py
.\venv\Scripts\python test_ws.py
.\venv\Scripts\python test_remaining_routers.py
.\venv\Scripts\python test_admin_operations.py
.\venv\Scripts\python test_final_verification.py
```

---

## 📄 License
MIT License &bull; Designed and developed for Tea Time Cafe.
