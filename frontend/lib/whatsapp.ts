/**
 * WhatsApp 1-Click Invoice & Live Tracking Dispatch Generator (100% Free / Zero API cost)
 * Customized for Surya Family Restaurant Kadiri
 */

import { PrintOrderData, PrintOutletData } from "@/lib/thermalPrint";

export interface WhatsAppOrderPayload {
    orderId?: string;
    orderType: "delivery" | "takeaway" | "dine_in";
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    landmark?: string;
    tableNumber?: string;
    pickupTime?: string;
    items: Array<{
        name: string;
        name_te?: string;
        qty: number;
        price_paise: number;
        variant_name?: string | null;
        notes?: string;
    }>;
    subtotalPaise: number;
    discountPaise?: number;
    couponCode?: string;
    taxPaise?: number;
    totalPaise: number;
    paymentPreference: "upi" | "cod" | "counter";
    cookingNotes?: string;
}

/**
 * Format a professional WhatsApp order message for Surya Family Restaurant.
 */
export function formatWhatsAppOrderMessage(order: WhatsAppOrderPayload, outletName: string = "Surya Family Restaurant"): string {
    const orderId = order.orderId || `SRY-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    const orderTypeLabel = 
        order.orderType === "delivery" ? "🛵 Home Delivery" :
        order.orderType === "takeaway" ? "🥡 Takeaway / Parcel" :
        `🍽️ Dine-In (Table ${order.tableNumber || "1"})`;

    const paymentLabel = 
        order.paymentPreference === "upi" ? "⚡ UPI Online (GPay / PhonePe / Paytm to 9880358634@upi)" :
        order.paymentPreference === "cod" ? "💵 Cash on Delivery (COD)" :
        "🍽️ Pay at Counter";

    const subtotalRs = (order.subtotalPaise / 100).toFixed(0);
    const discountRs = order.discountPaise ? (order.discountPaise / 100).toFixed(0) : "0";
    const totalRs = (order.totalPaise / 100).toFixed(0);

    let itemsText = "";
    order.items.forEach((it, idx) => {
        const itemTotalRs = ((it.price_paise * it.qty) / 100).toFixed(0);
        itemsText += `${idx + 1}. *${it.name}* (x${it.qty})${it.variant_name ? ` [${it.variant_name}]` : ""} - ₹${itemTotalRs}\n`;
        if (it.notes) {
            itemsText += `   ↳ _Note: ${it.notes}_\n`;
        }
    });

    return `☀️ *${outletName.toUpperCase()} — NEW ONLINE ORDER* ☀️
-----------------------------------------
📋 *Order ID:* #${orderId}
📅 *Time:* ${dateStr}, ${timeStr}
🏷️ *Order Type:* ${orderTypeLabel}

👤 *CUSTOMER DETAILS:*
• *Name:* ${order.customerName || "Valued Customer"}
• *Phone:* ${order.customerPhone || "Not provided"}
${order.orderType === "delivery" && order.deliveryAddress ? `• *Delivery Address:* ${order.deliveryAddress}\n` : ""}${order.orderType === "delivery" && order.landmark ? `• *Landmark:* ${order.landmark}\n` : ""}${order.orderType === "takeaway" && order.pickupTime ? `• *Pickup Time:* ${order.pickupTime}\n` : ""}${order.orderType === "dine_in" && order.tableNumber ? `• *Table Number:* Table ${order.tableNumber}\n` : ""}
🍲 *ORDERED DISHES:*
${itemsText}-----------------------------------------
💵 *Subtotal:* ₹${subtotalRs}
${Number(discountRs) > 0 ? `🎉 *Discount (${order.couponCode || "COUPON"}):* -₹${discountRs}\n` : ""}📦 *Delivery / Packaging:* FREE
✨ *TOTAL AMOUNT:* *₹${totalRs}*
-----------------------------------------
💳 *Payment Mode:* ${paymentLabel}
${order.cookingNotes ? `📝 *Special Instructions:* ${order.cookingNotes}\n-----------------------------------------\n` : ""}📍 *Surya Family Restaurant*
Dhandubatu Street, Bypass Road, Opp. RTC Bus Stand, Kadiri
📞 *098803 58634*
-----------------------------------------
_Please accept and confirm preparation time. Thank you!_ 🙏`;
}

/**
 * Generate a WhatsApp deep link to send customer's order directly to Surya Restaurant's phone (098803 58634).
 */
export function getWhatsAppOrderLink(order: WhatsAppOrderPayload, targetPhone: string = "919880358634"): string {
    const message = formatWhatsAppOrderMessage(order);
    const cleanPhone = targetPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Launch WhatsApp with the pre-filled order receipt.
 */
export function openWhatsAppOrder(order: WhatsAppOrderPayload, targetPhone: string = "919880358634"): void {
    const link = getWhatsAppOrderLink(order, targetPhone);
    if (typeof window !== "undefined") {
        window.open(link, "_blank");
    }
}
export function getCustomerWhatsAppInvoiceLink(order: PrintOrderData, outlet?: PrintOutletData | null): string {
    const outletName = outlet?.name || "Surya Family Restaurant";
    const subtotalRs = (((order.subtotal_paise || (order as any).total_price_paise || 0)) / 100).toFixed(2);
    const discountRs = ((order.discount_paise || 0) / 100).toFixed(2);
    const taxRs = (((order.tax_paise || 0)) / 100).toFixed(2);
    const totalRs = (((order.total_paise || (order as any).total_price_paise || 0)) / 100).toFixed(2);
    const isDelivery = order.order_type === "delivery";

    let itemLines = "";
    order.items.forEach((it, idx) => {
        const itemTotal = ((it.total_price_paise || 0) / 100).toFixed(2);
        itemLines += `${idx + 1}. *${it.item_name}* (x${it.qty}) ${it.variant_name ? `[${it.variant_name}]` : ""} - ₹${itemTotal}\n`;
    });

    const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}/order?branch=1` : `http://localhost:3000/order?branch=1`;

    const message = 
`☀️ *${outletName.toUpperCase()}* ☀️
🧾 *Order Confirmation & Tax Invoice*
--------------------------------
🔢 *Order No:* #${order.order_number}
📅 *Type:* ${isDelivery ? "🛵 Free Home Delivery" : `🍽️ Dine-in Table ${order.table_label || "1"}`}
👤 *Customer:* ${order.customer_name || "Valued Customer"}
${isDelivery && order.delivery_address ? `📍 *Delivery Address:* ${order.delivery_address}\n` : ""}--------------------------------
🍲 *ORDERED ITEMS:*
${itemLines}--------------------------------
💵 *Subtotal:* ₹${subtotalRs}
${(order.discount_paise || 0) > 0 ? `🎉 *Discount (${order.coupon_code || "PROMO"}):* -₹${discountRs}\n` : ""}📊 *GST/Tax:* ₹${taxRs}
✨ *FINAL TOTAL:* *₹${totalRs}*
💳 *Payment Mode:* ${(order.payment_method || "COD").toUpperCase()} (${(order.payment_status || "PENDING").toUpperCase()})
--------------------------------
📍 *Track Your Live Order Online:*
${trackingUrl}

Thank you for dining at *${outletName}*! For any queries, call us at ${outlet?.phone || "+91 98803 58634"}.`;

    const cleanPhone = (order.customer_phone || "").replace(/\D/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Open customer WhatsApp link directly in new window / WhatsApp app.
 */
export function dispatchCustomerWhatsApp(order: PrintOrderData, outlet?: PrintOutletData | null) {
    const link = getCustomerWhatsAppInvoiceLink(order, outlet);
    if (typeof window !== "undefined") {
        window.open(link, "_blank");
    }
}

/**
 * Generate a WhatsApp deep-link to send store owner the daily End-of-Day (EOD) Z-Report & revenue summary.
 */
export function getEODWhatsAppSummaryLink(report: any, ownerPhone: string = "9880358634"): string {
    const outletName = report.outlet?.name || "Surya Family Restaurant";
    const dateStr = report.report_date || new Date().toISOString().split("T")[0];
    const s = report.sales_summary || {};
    const pm = report.payment_methods || {};
    const oc = report.order_channels || {};
    const topItems = report.top_selling_items || [];

    let topItemsText = "";
    topItems.forEach((it: any, idx: number) => {
        topItemsText += `  ${idx + 1}. *${it.item_name}* (x${it.qty_sold}) - ₹${(it.revenue_rupees || 0).toFixed(2)}\n`;
    });

    const msg = 
`☀️ *${outletName.toUpperCase()}* ☀️
📊 *DAILY EOD SALES & Z-REPORT*
📅 *Date:* ${dateStr}
🕒 *Generated:* ${new Date(report.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
--------------------------------
📊 *SALES OVERVIEW:*
• Total Orders: *${s.total_orders || 0}*
• Dine-in: *${oc.dine_in?.count || 0}* (₹${(oc.dine_in?.total_rupees || 0).toFixed(2)})
• Delivery: *${oc.delivery?.count || 0}* (₹${(oc.delivery?.total_rupees || 0).toFixed(2)})
• Gross Sales: ₹${(s.gross_sales_rupees || 0).toFixed(2)}
• Total Discounts: -₹${(s.total_discount_rupees || 0).toFixed(2)}
• Net Sales: *₹${(s.net_sales_rupees || 0).toFixed(2)}*
• Total GST Tax: +₹${(s.total_tax_rupees || 0).toFixed(2)}
✨ *TOTAL REVENUE:* *₹${(s.total_revenue_rupees || 0).toFixed(2)}*
--------------------------------
💵 *PAYMENT DRAWER RECONCILIATION:*
• Cash in Drawer: *₹${(pm.cash?.total_rupees || 0).toFixed(2)}* (${pm.cash?.count || 0} bills)
• UPI Collections: *₹${(pm.upi?.total_rupees || 0).toFixed(2)}* (${pm.upi?.count || 0} bills)
${pm.card?.count ? `• Card/POS: ₹${(pm.card?.total_rupees || 0).toFixed(2)}\n` : ""}${pm.counter?.count ? `• Counter Direct: ₹${(pm.counter?.total_rupees || 0).toFixed(2)}\n` : ""}--------------------------------
🍲 *TOP 5 BEST SELLERS:*
${topItemsText || "  No item sales recorded today\n"}--------------------------------
_Generated automatically via Surya DineOS_`;

    const cleanPhone = ownerPhone.replace(/\D/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
}

export function dispatchEODWhatsApp(report: any, ownerPhone?: string) {
    const link = getEODWhatsAppSummaryLink(report, ownerPhone || report.outlet?.phone || "9880358634");
    if (typeof window !== "undefined") {
        window.open(link, "_blank");
    }
}

/**
 * Generate a WhatsApp deep-link for Post-Dining Customer Feedback & 5-Star Google Maps Review.
 */
export function getPostDiningReviewWhatsAppLink(order: PrintOrderData, outlet?: PrintOutletData | null): string {
    const outletName = outlet?.name || "Surya Family Restaurant";
    const custName = order.customer_name || "Valued Guest";
    const googleReviewUrl = "https://maps.app.goo.gl/mx51L23iDJuwmThY8";

    const msg =
`☀️ *${outletName.toUpperCase()}* ☀️

Dear *${custName}*,

Thank you for dining with us today! We hope you loved your delicious meal at Surya Family Restaurant (Order #${order.order_number}).

⭐ *HOW WAS YOUR EXPERIENCE TODAY?*
If you enjoyed our Biryani, Punjabi Curries & service, could you please take 15 seconds to leave us a 5-Star rating on Google? It means a lot to our team!

👉 *Tap here to review us on Google Maps:*
${googleReviewUrl}

🎁 *Special Reward:* Show your 5-star review on your next visit to receive a complimentary dessert or special discount on your family table bill! ✨

_Warm regards,_
*${outletName} Team, Kadiri*`;

    const cleanPhone = (order.customer_phone || "").replace(/\D/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
}

export function dispatchPostDiningReview(order: PrintOrderData, outlet?: PrintOutletData | null) {
    const link = getPostDiningReviewWhatsAppLink(order, outlet);
    if (typeof window !== "undefined") {
        window.open(link, "_blank");
    }
}
