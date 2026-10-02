/**
 * Google Analytics 4 (GA4) & Local SEO Conversion Tracker for Surya Family Restaurant.
 * Safe for SSR and client-side execution.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Low-level event dispatcher to GA4
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    window.gtag("event", eventName, {
      restaurant_id: 1,
      restaurant_name: "Surya Family Restaurant Kadiri",
      ...params,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA4:trackEvent] Failed:", err);
    }
  }
}

/**
 * Track virtual page views across Next.js client-side navigations
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;
  try {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title || document.title,
      page_location: window.location.href,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA4:trackPageView] Failed:", err);
    }
  }
}

// ============================================================================
// RESTAURANT-SPECIFIC E-COMMERCE & CONVERSION EVENTS
// ============================================================================

/**
 * 1. View Menu Category (SEO discovery & user intent tracking)
 */
export function trackViewCategory(categoryName: string, categoryId?: number) {
  trackEvent("view_item_list", {
    item_list_name: categoryName,
    item_list_id: categoryId ? String(categoryId) : undefined,
  });
}

/**
 * 2. Search Menu Item (identifies popular customer demand)
 */
export function trackMenuSearch(searchTerm: string) {
  if (!searchTerm.trim()) return;
  trackEvent("search", {
    search_term: searchTerm.trim(),
  });
}

/**
 * 3. Add Dish to Cart (High-intent conversion step)
 */
export function trackAddToCart(item: {
  id?: number;
  name: string;
  priceRupees: number;
  qty?: number;
  variant?: string;
  category?: string;
}) {
  trackEvent("add_to_cart", {
    currency: "INR",
    value: item.priceRupees * (item.qty || 1),
    items: [
      {
        item_id: item.id ? String(item.id) : item.name.toLowerCase().replace(/\s+/g, "_"),
        item_name: item.name,
        item_category: item.category || "Restaurant Menu",
        item_variant: item.variant || "Standard",
        price: item.priceRupees,
        quantity: item.qty || 1,
      },
    ],
  });
}

/**
 * 4. Remove Dish from Cart
 */
export function trackRemoveFromCart(dishName: string, priceRupees?: number) {
  trackEvent("remove_from_cart", {
    currency: "INR",
    value: priceRupees || 0,
    items: [{ item_name: dishName }],
  });
}

/**
 * 5. Begin Checkout / Open Cart Drawer
 */
export function trackBeginCheckout(orderType: string, totalRupees: number, itemCount: number) {
  trackEvent("begin_checkout", {
    currency: "INR",
    value: totalRupees,
    order_type: orderType, // 'dine_in' | 'delivery' | 'takeaway'
    total_items: itemCount,
  });
}

/**
 * 6. Order Placed / Purchase (Primary Conversion Metric for Google Ads & SEO)
 */
export function trackOrderPlaced(data: {
  orderNumber: string;
  orderType: string;
  totalRupees: number;
  tableLabel?: string;
  customerPhone?: string;
  paymentMethod?: string;
  items?: Array<{ name: string; priceRupees: number; qty: number; variant?: string | null }>;
}) {
  trackEvent("purchase", {
    transaction_id: data.orderNumber,
    value: data.totalRupees,
    currency: "INR",
    tax: 0,
    shipping: 0,
    order_type: data.orderType,
    table_label: data.tableLabel || "Delivery",
    payment_method: data.paymentMethod || "counter",
    items: data.items?.map((it) => ({
      item_name: it.name,
      price: it.priceRupees,
      quantity: it.qty,
      item_variant: it.variant,
    })),
  });
}

/**
 * 7. Table Pre-Booking / Reservation Lead
 */
export function trackTableReservation(data: {
  reservationNumber?: string;
  partySize: number;
  date: string;
  time: string;
  occasion?: string;
}) {
  trackEvent("generate_lead", {
    event_category: "Reservation",
    reservation_number: data.reservationNumber,
    party_size: data.partySize,
    reservation_date: data.date,
    reservation_time: data.time,
    occasion: data.occasion || "casual",
  });
}

/**
 * 8. Digital Waiter / Service Buzzer Pressed
 */
export function trackCallWaiter(tableLabel: string, callType: string = "waiter") {
  trackEvent("call_waiter", {
    table_label: tableLabel,
    call_type: callType,
  });
}

/**
 * 9. PWA App Install Event
 */
export function trackPWAInstall() {
  trackEvent("pwa_install", {
    app_name: "Surya Family Restaurant",
  });
}
