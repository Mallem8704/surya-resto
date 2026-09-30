# 🍛 Surya Family Restaurant Kadiri — POS & QR Dining Platform

A full-stack, local-first, zero-cost restaurant platform built for **Surya Family Restaurant** (సూర్య ఫ్యామిలీ రెస్టారెంట్), Kadiri, Andhra Pradesh.

- **Live Production URL**: [https://suryafamilyrestaurant.com](https://suryafamilyrestaurant.com)
- **Direct Merchant UPI VPA**: `9880358634@upi` (Zero gateway fees, direct to restaurant bank account)
- **Location**: Dhandubatu Street, Bypass Road, Opp. RTC Bus Stand, Kadiri, Andhra Pradesh 515591
- **Phone**: `+91 98803 58634`

---

## 🌟 Platform Highlights

### 📱 Customer Digital Dining (Mobile & Web)
- **Table QR Ordering (`/order?table=1`)**: Dine-in guests scan table QR stands to explore authentic bilingual menus (English + Telugu - తెలుగు) with item variants (Full / Half / Family Pack) and custom addons.
- **Direct NPCI UPI QR Payment**: Dynamic on-screen QR codes generated with exact amount and order reference directly to `9880358634@upi` with 12-digit UTR submission.
- **Online Takeaway & Delivery (`/delivery`)**: Customers order food online with address auto-fill and real-time status tracking.
- **Table Reservation (`/book-table`)**: Advance table booking with party size, date/time picker, and instant confirmation.
- **Digital Waiter Call Buzzer**: 1-tap table calls for Water, Waiter, Cleaning, or the Bill.

### 💼 Staff Operations & Counter Billing
- **Cashier POS Cockpit (`/admin/pos`)**: High-speed counter billing with 1-click soundbox UPI verification, cash tender calculator, split bill support, and silent thermal receipt printing (80mm & 58mm).
- **Kitchen Display System (`/admin/kds`)**: High-contrast kitchen ticket display with order countdown timers, item completion checklists, and Web Audio API order chimes.
- **Waiter / Captain Mobile POS (`/captain`)**: Fast mobile table-side ordering designed for waiters on smartphones or tablets.
- **Table Floor Plan Management (`/admin/tables`)**: Real-time visual floor map of all 12 tables with occupancy status and printable QR cards.
- **Customer CRM & Order History (`/admin/customers`)**: Diner profiles, visit counts, total lifetime spend, and loyalty lookup.
- **Live Sales & Analytics Dashboard (`/admin/analytics`)**: Real-time revenue metrics, peak hour rush heatmaps, dish leaderboard, and shift reconciliation.

---

## 🔐 Official Staff Credentials

| Role | Email | Password | Access Privileges |
|---|---|---|---|
| 👑 **Owner / GM** | `owner@suryafamilyrestaurant.in` | `surya_admin_2026` | Full Access, Analytics, Audits, Menu & Price Control |
| 🧑‍🍳 **Floor Cashier** | `staff@suryafamilyrestaurant.in` | `surya_staff_2026` | Billing, Order Progression, Stock Toggles, Cashier Shifts |
| 👑 **Backup Manager** | `owner@suryarestaurant.com` | `admin123` | Secondary Admin Account |
| 🧑‍🍳 **Backup Staff** | `staff@suryarestaurant.com` | `staff123` | Secondary Cashier Account |

---

## 🏗️ Architecture & Zero-Cost Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│             SURYA FAMILY RESTAURANT KADIRI PLATFORM                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     CUSTOMER WEB APP (PWA)    │               │         ADMIN COCKPIT         │
│  - Next.js 16 (App Router)    │               │  - Cashier POS & Silent Print │
│  - Tailwind CSS               │               │  - Kitchen Display (KDS)      │
│  - English & Telugu (Bilingual)│              │  - Captain Floor Waiter App   │
│  - Direct NPCI UPI QR         │               │  - Sales Analytics & CRM      │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │ (HTTP REST + WebSockets)
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND API                             │
│  - Python 3.12 + FastAPI + Pydantic v2 + SQLAlchemy 2.0                │
│  - Zero-fee NPCI Dynamic UPI Engine                                   │
│  - Real-Time WebSocket Broadcasting                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│      LOCAL-FIRST STORAGE      │               │      SUPABASE CLOUD SYNC      │
│  - SQLite (surya_restaurant.db)│              │  - PostgreSQL Cloud DB        │
│  - 100% Offline Resilient     │               │  - Media Bucket (Food Photos) │
│  - Instant On-Premise POS     │               │  - Real-Time Hybrid Cloud Sync│
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 🚀 Running On-Premise (Windows POS PC)

### First-Time Setup
Double-click **`SETUP_FIRST_TIME.bat`**. It automatically:
1. Configures Python virtual environment and installs all dependencies.
2. Installs frontend packages.
3. Adds `SuryaPOS` shortcut to the **Windows Startup** folder so the POS auto-launches on boot.

### Daily Operation
Double-click **`start_surya_pos.bat`**:
- Launches Python backend on `http://127.0.0.1:8000`
- Launches Next.js frontend on `http://localhost:3002`
- Opens Cashier POS in Chrome with silent thermal kiosk printing enabled (`--kiosk-printing`)

---

## 🧪 Verification & Testing

Run all 22 full-platform end-to-end functional tests:
```bash
cd backend
.\venv\Scripts\python.exe test_full_platform_e2e.py
```
*(All 22/22 tests verify menu catalog, Telugu localization, coupons, customer auth, dine-in QR orders, NPCI UPI, buzzer, delivery, reservations, cashier verification, KDS, stock toggle, CRM, analytics, audit trail, and cloud sync).*
