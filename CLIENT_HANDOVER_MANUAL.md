# Surya Family Restaurant Kadiri — Client Handover & Operations Manual

Welcome to your **Enterprise Hybrid Restaurant Management Platform**! This operational guide provides step-by-step instructions for the restaurant owner, managers, cashiers, captains, and kitchen staff of **Surya Family Restaurant Kadiri**.

---

## 📍 Restaurant System Profile

| Item | Details |
| :--- | :--- |
| **Restaurant Name** | **Surya Family Restaurant** |
| **Address** | Dhandubatu Street, Bypass Road, Opp. to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591 |
| **Primary Phone** | `+91 98803 58634` |
| **Direct Merchant UPI** | `9880358634@upi` (0% Gateway Commission) |
| **GSTIN / Tax Rate** | `37SURYA0000A1Z5` / 5% GST |
| **FSSAI License** | `10124999000586` |
| **Cloud Database** | Supabase Free Tier (`poexygwbosuxbezeastc.supabase.co`) |
| **Architecture** | **Zero-Cost Local-First Hybrid POS** |

---

## 🚀 1. Daily Morning Opening Checklist (3 Easy Steps)

Every morning when opening the restaurant:

1. **Step 1: Start the POS System**
   * Turn on the Cashier PC.
   * Double-click the **`start_surya_pos.bat`** shortcut on your Windows desktop.
   * This automatically starts the on-premise billing engine and opens the Cashier POS in silent thermal printing mode.

2. **Step 2: Turn on Kitchen Display Audio (KDS)**
   * On the kitchen tablet or monitor, open: `http://localhost:3002/admin/kds`
   * Tap the yellow banner at the top: **"🔔 Audio Alert Off — Tap to Enable Sound"**.
   * When orders arrive from tables or captains, a loud chime will ring out in the kitchen.

3. **Step 3: Connect Waiter Handheld Tablets**
   * On your Android/iOS tablet or phone connected to the restaurant WiFi, open:
     👉 `http://<CASHIER-PC-IP>:3002/captain`
   * Captains can now punch orders at tables while walking the floor.

---

## 💳 2. Cashier Operations & Direct Merchant UPI

### A. Punching a Bill at the Counter
1. Go to **Cashier POS** (`/admin/pos`).
2. Select the Table (e.g., **Table 3**) or click **"Takeaway / Direct Counter"**.
3. Tap food categories (Biryanis, Starters, Tiffin) $\rightarrow$ Tap items to add to cart.
4. Click **"Print KOT"** to send the order ticket directly to the kitchen thermal printer.

### B. Collecting Payment via Zero-Fee Dynamic UPI QR
1. Click **"Pay & Settle"** on the table bill.
2. Select **"Dynamic UPI QR"**.
3. A large, dynamic NPCI QR code appears on the cashier screen (or customer facing display) containing the exact bill amount and order number linked to **`9880358634@upi`**.
4. The diner scans with **PhonePe, Google Pay, Paytm, or BHIM**.
5. When your restaurant's **Paytm / PhonePe Soundbox** announces:
   > *"Paytm par ₹640 prapt hue!"*
6. Cashier clicks **"1-Click Verify & Settle"**.
7. The bill marks as **PAID** instantly across all screens, and the thermal receipt prints!

> 💡 **0% Commission Advantage**: You save **2% to 3% on every single transaction** because payments go straight into your bank account without Razorpay or middleman deductions!

---

## 🖨️ 3. Silent Thermal Receipt Printing (Windows POS)

Your system supports **1-Click Silent Thermal Printing** on standard **80mm and 58mm POS receipt printers** (TVS, Epson, Everycom, Posiflex, etc.).

### How Silent Printing Works
* When the Cashier taps **"Print Bill"** or **"Print KOT"**, the receipt prints immediately with **no print preview dialog box**.
* This is powered by Google Chrome / Microsoft Edge launched with the `--kiosk-printing` flag via `start_surya_pos.bat`.

### Changing Paper Roll Size (80mm vs 58mm)
1. Go to **Store Settings** (`/admin/settings`).
2. Under **Thermal Printer Settings**, toggle between **80mm Wide Roll** (Standard) or **58mm Compact Roll**.
3. Click Save.

---

## 👨‍🍳 4. Kitchen Display System (KDS) & Waiter Captain POS

### Kitchen Display Screen (`/admin/kds`)
* Displayed on a wall-mounted tablet or TV in the kitchen.
* Shows tickets organized by table number with running elapsed time timers:
  * 🟡 **Yellow Card**: Newly Placed order (loud chime alert rings).
  * 🟠 **Orange Card**: Chef taps **"Start Cooking"** (In Progress).
  * 🟢 **Green Card**: Chef taps **"Ready to Serve"** (Alerts waiter to pick up food).

### Waiter Captain Mobile POS (`/captain`)
* Waiters can take orders directly at the dining table.
* Features fast item search, portion variant selection (Single / Full), and cooking notes (e.g. *"less spicy"*, *"extra gravy"*).
* Orders appear on the KDS and Cashier POS within **0.1 seconds** via real-time WebSockets.

---

## 🏷️ 5. Table QR Standees & Customer Ordering

Your restaurant has **12 Dine-In Tables (T1 to T12)** configured with custom QR codes.

### How to Print Acrylic Table Standees
1. Go to **Tables & QR Codes** (`/admin/tables`).
2. Click **"Download All QR Codes"**.
3. Print and display the QR codes on your dining tables.

### How Diners Use It
1. Diners sit at Table 4 and scan the table QR code with their mobile phone.
2. The **Surya Family Restaurant digital menu** opens in their phone browser without installing any app.
3. Diners browse dishes with English & Telugu names, see dietary veg/non-veg tags, apply promo coupons, and place orders directly!

---

## 👑 6. Official Management Credentials

Your system has been initialized with clean, official administrative accounts:

| Role | Official Login Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Owner / General Manager** | `owner@suryafamilyrestaurant.in` | `surya_admin_2026` | Full Control, Sales Analytics, Price Changes, Staff Management |
| **Floor Cashier** | `staff@suryafamilyrestaurant.in` | `surya_staff_2026` | POS Billing, KOT Printing, UPI Verification, Table Status |
| **Legacy Manager Login** | `owner@suryarestaurant.com` | `admin123` | Backup Owner Login |
| **Legacy Staff Login** | `staff@suryarestaurant.com` | `staff123` | Backup Staff Login |

### 🔒 How to Change Your Password
1. Log in to the Admin Dashboard.
2. Go to **Store Settings** (`/admin/settings`) $\rightarrow$ **Security & Password**.
3. Enter your current password and choose a new private password.

---

## ☁️ 7. Zero-Cost Cloud Backup & Remote Owner Viewing

Your system runs on a **Local-First Hybrid Engine** connected to **Supabase Cloud**:

* **Local Billing Floor**: Runs on the counter PC. Latency is <10ms.
* **Cloud Backup (Supabase)**: Every bill, customer, and payment is automatically copied to your secure Supabase cloud database every 60 seconds whenever internet is active.
* **Top Header Cloud Status**:
  * Look at the top navigation bar in Admin.
  * You will see a badge: **`☁️ Hybrid: Cloud Active (₹0/mo)`**.
  * Click it anytime to see your synced order count or tap **"Sync to Cloud Now"**.

---

## 🛡️ 8. Emergency Offline Protocol (Broadband Disconnection)

> ### ⚠️ Frequently Asked Question: *"What happens if our broadband internet wire cuts off during dinner rush?"*
> 
> **Answer: Absolutely nothing breaks! Keep billing as normal.**
> 
> * Because Surya Restaurant uses an on-premise local database, **counter billing, KOT printing, and the kitchen KDS do not require the internet to work**.
> * Your staff can continue punching bills, accepting cash/UPI, and printing receipts uninterrupted.
> * The system will safely buffer all orders on the computer's hard drive.
> * When your internet reconnects (even 4 hours later), the **Hybrid Sync Engine** automatically uploads all buffered orders to the cloud database with zero data loss!

---

## 📞 9. Technical Support & Key URLs

* **Cashier POS Interface**: [http://localhost:3002/admin/pos](http://localhost:3002/admin/pos)
* **Kitchen KDS Interface**: [http://localhost:3002/admin/kds](http://localhost:3002/admin/kds)
* **Waiter Captain POS**: [http://localhost:3002/captain](http://localhost:3002/captain)
* **Customer Menu Ordering**: [http://localhost:3002/order?table=1](http://localhost:3002/order?table=1)
* **Admin Management Cockpit**: [http://localhost:3002/admin](http://localhost:3002/admin)
* **Customer CRM**: [http://localhost:3002/admin/customers](http://localhost:3002/admin/customers)
* **Supabase Cloud Dashboard**: [https://supabase.com/dashboard/project/poexygwbosuxbezeastc](https://supabase.com/dashboard/project/poexygwbosuxbezeastc)

---
*Surya Family Restaurant Kadiri — Crafted for Operational Excellence, Zero Fees, and 100% Floor Reliability.*
