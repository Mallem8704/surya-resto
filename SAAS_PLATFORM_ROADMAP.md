# 🚀 Restaurant DineOS — Multi-Tenant B2B SaaS Architectural Blueprint & Roadmap

> **Author**: Senior Product Engineering & Systems Architecture  
> **Target**: Multi-Tenant WhatsApp-First Restaurant Operating System  
> **Flagship Reference**: Surya Family Restaurant, Kadiri  
> **Core Value Proposition**: 0% Commission Direct WhatsApp & QR Ordering, Instant UPI Payments, Zero Hardware Lock-in.

---

## 📌 Strategic Directive: Execution Priority

1. **Phase 0 (IMMEDIATE PRIORITY)**: Complete, harden, and launch the **Flagship Reference Store (Surya Family Restaurant)** into live production. Achieve real daily orders, flawless mobile UX, and owner validation.
2. **Phase 1+ (POST-LAUNCH)**: Execute the multi-tenant SaaS architecture documented below to onboard Customer #2, #3, and beyond in under 15 minutes.

---

## 1. Executive Vision & Market Positioning

### The Market Problem
Traditional restaurant software is broken for 95% of small and mid-sized restaurants in India:
- **Swiggy / Zomato**: Take a punitive **25% to 30% commission** on every order and delay cash settlements by days.
- **Enterprise POS (Petpooja, Posist/Restroworks)**: Require ₹15,000–₹35,000 upfront hardware costs, bulky billing terminals, complex staff training, and high annual renewals.
- **DotPe / Thrive**: Charge transaction cuts and introduce checkout friction (mandatory app downloads, OTP verification drop-offs).

### The SaaS Solution ("WhatsApp-First DineOS")
- **0% Commission Direct Ordering**: Every rupee goes straight into the restaurant owner's UPI account (GPay / PhonePe / Paytm).
- **Zero App Download / Zero OTP Login**: Customers order via instant browser QR or 1-tap WhatsApp deep link (`wa.me`).
- **Zero Meta API Cost**: Uses client-side WhatsApp intent protocol — **₹0 cost per message** for both the platform and the restaurant.
- **Zero Hardware Requirement**: Any ₹8,000 Android smartphone in the restaurant acts as the primary order receiver.

---

## 2. System Architecture & Multi-Tenancy Design

### 2.1 Tenancy Isolation Model
We employ a **Shared Database, Shared Schema with Strict Tenant Scoping (`tenant_id`)**. This provides the highest developer velocity, unified zero-downtime migrations, and lowest cloud infrastructure cost (~$7–$15/month for 500+ stores).

```
                             [ Customer / Staff Browser ]
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              ▼                                                       ▼
   https://surya.dineos.in                                 https://bawarchi.dineos.in
   (or custom domain)                                      (or custom domain)
              │                                                       │
              └───────────────────────────┬───────────────────────────┘
                                          ▼
                             [ Next.js Edge Middleware ]
                         • Extracts tenant subdomain/slug
                         • Injects `x-tenant-slug` header
                         • Rewrites route to `/_tenants/[slug]/*`
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       [ Dynamic White-Label UI ]                   [ FastAPI Multi-Tenant Core ]
       • Dynamic Theme CSS Variables                • Global `tenant_id` query filter
       • Dynamic Logo & Favicon                     • Tenant-scoped JWT authentication
       • Tenant WhatsApp & UPI VPA                  • Isolated WebSockets (`/ws/{tenant}`)
       • Offline Seed Fallback                      • Dynamic Table QR Code Generator
```

---

## 3. Database Schema Migration Plan

### 3.1 New `tenants` Table
```sql
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) UNIQUE NOT NULL,         -- e.g. 'surya', 'bawarchi', 'chaipoint'
    name VARCHAR(150) NOT NULL,               -- e.g. 'Surya Family Restaurant'
    custom_domain VARCHAR(255) UNIQUE,        -- e.g. 'order.suryarestaurant.com'
    whatsapp_phone VARCHAR(20) NOT NULL,      -- e.g. '919880358634'
    upi_vpa VARCHAR(100) NOT NULL,            -- e.g. '9880358634@upi'
    tagline VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    plan VARCHAR(30) DEFAULT 'growth',        -- 'starter', 'growth', 'pro'
    theme_json JSONB DEFAULT '{}'::jsonb,     -- primary_color, dark_color, accent, logo_url
    is_active BOOLEAN DEFAULT TRUE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
```

### 3.2 Tenant Scoping Across All Domain Entities
Every child table adds a mandatory foreign key with indexing:
```sql
ALTER TABLE categories ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE menu_items ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE cafe_tables ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
```

---

## 4. Dynamic Frontend White-Labeling Engine

### 4.1 Zero-CSS-Rebuild Dynamic Theming
Instead of compiling different CSS bundles, branding is applied at runtime via **CSS Custom Properties**:

```tsx
// frontend/components/TenantThemeProvider.tsx
export function TenantThemeProvider({ tenant, children }: { tenant: TenantConfig; children: React.ReactNode }) {
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--brand-primary", tenant.theme.primary || "#E5A93C");
        root.style.setProperty("--brand-dark", tenant.theme.primaryDark || "#1A0800");
        root.style.setProperty("--brand-accent", tenant.theme.accent || "#8B2020");
    }, [tenant]);

    return <>{children}</>;
}
```

---

## 5. The "15-Minute Onboarding" & Preset Menu Engine

Restaurant owners do not want to enter 100 dishes manually. We build a **1-Click Menu Preset Cloner**:

| Preset Template | Target Restaurants | Sample Seed Catalog |
|---|---|---|
| **🍗 Biryani & Multi-Cuisine** | Family restaurants, Dhaba, Mandi houses | 48 dishes: Dum Biryani, Punjabi Curries, Tandoori Kebabs, Naans, Starters (Source: Surya) |
| **☕ Chai & Cafe** | Tea points, Bakeries, Breakfast joints | 35 dishes: Irani Chai, Filter Coffee, Samosas, Bun Maska, Sandwiches, Shakes |
| **🍕 Fast Food & Street Treats** | Quick-service restaurants (QSR), Pizzerias | 40 dishes: Burgers, Pizzas, Fried Chicken, Momos, Rolls, Mojitos |

---

## 6. Table QR Stand Printable Generator (PDF)

Every onboarded restaurant gets a 1-click **Printable QR Table Tent PDF** (5x7 inch standard acrylic stand format):
- Restaurant Name & Logo in high resolution
- Table Number (Table 1 through 20)
- QR Code pointing directly to `https://[slug].dineos.in/order?table=T1`
- Instructional copy: *"1. Scan QR ➔ 2. Select Dishes ➔ 3. Send Order on WhatsApp"*
- Accepted Payments banner: GPay, PhonePe, Paytm, BHIM UPI.

Owners can print 10 cards at any local printing shop for ₹50 and start on Day 1.

---

## 7. SaaS Packaging, Pricing & Monetization

### 7.1 Pricing Structure
| Feature | **Starter** (₹499 / mo) | **Growth** (₹1,299 / mo) | **Pro Chain** (₹2,499 / mo) |
|---|:---:|:---:|:---:|
| **Digital Menu + WhatsApp Ordering** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Direct UPI QR Payments (0% fee)** | ✅ | ✅ | ✅ |
| **Table Dine-In QR Ordering** | 5 Tables | 25 Tables | Unlimited |
| **Cashier POS & Thermal Printing** | ❌ | ✅ | ✅ |
| **Live Kitchen Order Ticket (KOT)** | ❌ | ✅ | ✅ |
| **Sales Analytics & Reports** | Basic | Advanced | Multi-Branch |
| **Custom Domain Support** | ❌ | ❌ | ✅ |

### 7.2 Revenue Projections
- **25 Restaurants @ ₹1,299/mo** = **₹32,475 / month**
- **100 Restaurants @ ₹1,299/mo** = **₹1,29,900 / month** ($1,550 MRR)
- **500 Restaurants @ ₹1,299/mo** = **₹6,49,500 / month** ($7,800 MRR)

---

## 8. Immediate Action Plan (Right Now)

1. ✅ **Master Blueprint Saved**: Persisted in `SAAS_PLATFORM_ROADMAP.md`.
2. 🎯 **Immediate Focus**: Ensure **Surya Family Restaurant (Flagship)** is 100% hardened, tested, and validated for live customers and staff.
3. 🔜 **Next Milestone**: After flagship launch, branch into multi-tenancy starting with the `tenants` table and dynamic `/store/[slug]` routing.
