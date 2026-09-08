/**
 * Reusable API Client for Tea Time Cafe Backend.
 */

export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
        ? "https://tea-time-backend-1f44.onrender.com"
        : "http://127.0.0.1:8000");

import { safeStorage } from "@/lib/safeStorage";

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;

    let url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });
        const queryString = queryParams.toString();
        if (queryString) {
            url += `${url.includes("?") ? "&" : "?"}${queryString}`;
        }
    }

    const defaultHeaders: Record<string, string> = {};

    // Do not set Content-Type if uploading FormData
    if (!(customConfig.body instanceof FormData)) {
        defaultHeaders["Content-Type"] = "application/json";
    }

    // Inject JWT token if available in client storage
    if (endpoint.startsWith("/api/customer") || endpoint.startsWith("/customer")) {
        const custToken = safeStorage.getItem("surya_customer_token");
        if (custToken) {
            defaultHeaders["Authorization"] = `Bearer ${custToken}`;
        }
    } else {
        const token = safeStorage.getItem("surya_token") || safeStorage.getItem("teatime_token");
        if (token) {
            defaultHeaders["Authorization"] = `Bearer ${token}`;
        }
    }

    const config: RequestInit = {
        ...customConfig,
        headers: {
            ...defaultHeaders,
            ...headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
            // Keep default message if body is not JSON
        }
        const error: any = new Error(errorMessage);
        error.status = response.status;
        throw error;
    }

    // Return raw blob/buffer if content-type is an image
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("image/")) {
        return (await response.blob()) as unknown as T;
    }

    if (response.status === 204) {
        return {} as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
}

export const api = {
    // Auth
    login: (credentials: { email: string; password: string }) =>
        apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    getMe: () => apiFetch("/api/auth/me"),
    changePassword: (data: { current_password: string; new_password: string }) =>
        apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    switchBranch: (data: { target_outlet_id: number; admin_password: string; admin_email?: string }) =>
        apiFetch("/api/auth/switch-branch", { method: "POST", body: JSON.stringify(data) }),

    // Categories
    getCategories: (activeOnly = true, outletId?: number) =>
        apiFetch("/api/categories", { params: { active_only: activeOnly, ...(outletId ? { outlet_id: outletId } : {}) } }),
    createCategory: (data: any) =>
        apiFetch("/api/categories", { method: "POST", body: JSON.stringify(data) }),
    updateCategory: (id: number, data: any) =>
        apiFetch(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCategory: (id: number) =>
        apiFetch(`/api/categories/${id}`, { method: "DELETE" }),

    // Menu Items
    getMenu: (outletIdOrParams?: number | { category_id?: number; is_available?: boolean; is_veg?: boolean; search?: string }, extraParams?: { category_id?: number; is_available?: boolean; is_veg?: boolean; search?: string }) => {
        if (typeof outletIdOrParams === "number") {
            return apiFetch("/api/menu", { params: { outlet_id: outletIdOrParams, ...extraParams } });
        }
        return apiFetch("/api/menu", { params: outletIdOrParams });
    },
    getMenuItem: (id: number) =>
        apiFetch(`/api/menu/${id}`),
    createMenuItem: (data: any) =>
        apiFetch("/api/menu", { method: "POST", body: JSON.stringify(data) }),
    updateMenuItem: (id: number, data: any) =>
        apiFetch(`/api/menu/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateItemPrice: (id: number, price_paise: number) =>
        apiFetch(`/api/menu/${id}/price`, { method: "PATCH", body: JSON.stringify({ price_paise }) }),
    toggleItemAvailability: (id: number, is_available: boolean) =>
        apiFetch(`/api/menu/${id}/availability`, { method: "PATCH", body: JSON.stringify({ is_available }) }),
    adjustItemStock: (id: number, change_qty: number, reason: string, notes?: string) =>
        apiFetch(`/api/menu/${id}/stock`, { method: "PATCH", body: JSON.stringify({ change_qty, reason, notes }) }),
    deleteMenuItem: (id: number) =>
        apiFetch(`/api/menu/${id}`, { method: "DELETE" }),
    addMenuItemVariant: (itemId: number, data: { name: string; name_te?: string; price_paise: number; is_default?: boolean; is_available?: boolean }) =>
        apiFetch(`/api/menu/${itemId}/variants`, { method: "POST", body: JSON.stringify(data) }),
    updateMenuItemVariant: (variantId: number, data: { name?: string; name_te?: string; price_paise?: number; is_default?: boolean; is_available?: boolean }) =>
        apiFetch(`/api/menu/variants/${variantId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMenuItemVariant: (variantId: number) =>
        apiFetch(`/api/menu/variants/${variantId}`, { method: "DELETE" }),
    addMenuItemAddon: (itemId: number, data: { name: string; name_te?: string; price_paise: number; is_available?: boolean }) =>
        apiFetch(`/api/menu/${itemId}/addons`, { method: "POST", body: JSON.stringify(data) }),
    updateMenuItemAddon: (addonId: number, data: { name?: string; name_te?: string; price_paise?: number; is_available?: boolean }) =>
        apiFetch(`/api/menu/addons/${addonId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMenuItemAddon: (addonId: number) =>
        apiFetch(`/api/menu/addons/${addonId}`, { method: "DELETE" }),
    uploadImage: (formData: FormData) =>
        apiFetch("/api/menu/upload-image", { method: "POST", body: formData }),
    getImageUrl: (path?: string | null) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
    },

    // Tables
    getTables: (outletId?: number) => apiFetch("/api/tables", { params: outletId ? { outlet_id: outletId } : undefined }),
    getTable: (id: number) => apiFetch(`/api/tables/${id}`),
    createTable: (data: { label: string; qr_code_url?: string }) =>
        apiFetch("/api/tables", { method: "POST", body: JSON.stringify(data) }),
    updateTable: (id: number, data: { label?: string; status?: string }) =>
        apiFetch(`/api/tables/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateTableStatus: (id: number, status: string) =>
        apiFetch(`/api/tables/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    deleteTable: (id: number) =>
        apiFetch(`/api/tables/${id}`, { method: "DELETE" }),
    getTableQrUrl: (id: number, overrideUrl?: string) => {
        const origin = overrideUrl || (typeof window !== "undefined" && window.location.origin ? window.location.origin : "");
        const param = origin ? `?frontend_url=${encodeURIComponent(origin)}` : "";
        return `${API_BASE}/api/tables/${id}/qr${param}`;
    },
    callService: (tableId: number, call_type: string) =>
        apiFetch(`/api/tables/${tableId}/call`, { method: "POST", body: JSON.stringify({ call_type }) }),
    getTableActiveOrder: (tableId: number) =>
        apiFetch(`/api/tables/${tableId}/active-order`),
    settleAndFreeTable: (tableId: number, paymentData?: { method?: string; amount_paise?: number; tendered_paise?: number; change_returned_paise?: number; txn_id?: string; notes?: string }) =>
        apiFetch(`/api/tables/${tableId}/settle-and-free`, { method: "POST", body: JSON.stringify(paymentData || {}) }),

    // Orders
    createOrder: (data: {
        table_id?: number;
        outlet_id?: number;
        idempotency_key?: string;
        order_type?: "dine_in" | "delivery" | "takeaway";
        customer_name?: string;
        customer_phone?: string;
        delivery_address?: string;
        discount_paise?: number;
        coupon_code?: string;
        items: Array<{ item_id: number; variant_id?: number; addon_ids?: number[]; qty: number; notes?: string }>;
        customer_notes?: string;
        payment_method?: string;
    }) =>
        apiFetch("/api/orders", { method: "POST", body: JSON.stringify(data) }),
    getOrder: (orderId: number) =>
        apiFetch(`/api/orders/${orderId}`),
    getOrders: (params?: { outlet_id?: number; status?: string; table_id?: number; order_type?: string; date?: string }) =>
        apiFetch("/api/orders", { params }),
    updateOrderStatus: (orderId: number, status: string) =>
        apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    appendOrderItems: (orderId: number, items: Array<{ item_id: number; variant_id?: number; addon_ids?: number[]; qty: number; notes?: string }>, notes?: string) =>
        apiFetch(`/api/orders/${orderId}/append-items`, { method: "POST", body: JSON.stringify({ items, notes }) }),
    transferOrderTable: (orderId: number, target_table_id: number) =>
        apiFetch(`/api/orders/${orderId}/transfer-table`, { method: "POST", body: JSON.stringify({ target_table_id }) }),
    changeOrderPaymentMethod: (orderId: number, payment_method: string, notes?: string) =>
        apiFetch(`/api/orders/${orderId}/change-payment-method`, { method: "PATCH", body: JSON.stringify({ payment_method, notes }) }),
    voidOrder: (orderId: number, reason: string, staff_notes?: string) =>
        apiFetch(`/api/orders/${orderId}/void`, { method: "PATCH", body: JSON.stringify({ reason, staff_notes }) }),

    // Cashier Shifts & Cash Register
    getCurrentShift: (outletId?: number) =>
        apiFetch("/api/shifts/current", { params: outletId ? { outlet_id: outletId } : undefined }),
    openShift: (data: { opening_float_paise: number; shift_name?: string; notes?: string }, outletId?: number) =>
        apiFetch("/api/shifts/open", { method: "POST", params: outletId ? { outlet_id: outletId } : undefined, body: JSON.stringify(data) }),
    closeShift: (shiftId: number, data: { actual_cash_paise: number; denominations_json?: string; closing_notes?: string }) =>
        apiFetch(`/api/shifts/${shiftId}/close`, { method: "POST", body: JSON.stringify(data) }),
    getPastShifts: (outletId?: number, limit = 20) =>
        apiFetch("/api/shifts", { params: { outlet_id: outletId, limit } }),

    // Stock & Inventory
    getStockOverview: (outletId?: number) => apiFetch("/api/stock", { params: outletId ? { outlet_id: outletId } : undefined }),
    getLowStockItems: (outletId?: number) => apiFetch("/api/stock/low", { params: outletId ? { outlet_id: outletId } : undefined }),
    getStockLogs: (params?: { outlet_id?: number; item_id?: number; reason?: string; limit?: number }) =>
        apiFetch("/api/stock/logs", { params }),
    adjustStockManual: (data: { item_id: number; change_qty: number; reason: string; notes?: string }) =>
        apiFetch("/api/stock/adjust", { method: "POST", body: JSON.stringify(data) }),
    adjustStock: (data: { item_id: number; change_qty: number; reason: string; notes?: string }) =>
        apiFetch("/api/stock/adjust", { method: "POST", body: JSON.stringify(data) }),

    // Payments
    createRazorpayOrder: (orderId: number) =>
        apiFetch("/api/payments/create-razorpay-order", { method: "POST", body: JSON.stringify({ order_id: orderId }) }),
    verifyRazorpayPayment: (data: { order_id: number; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        apiFetch("/api/payments/verify-razorpay-payment", { method: "POST", body: JSON.stringify(data) }),
    markCashPaid: (orderId: number, notes?: string) =>
        apiFetch(`/api/payments/${orderId}/mark-cash-paid`, { method: "POST", body: JSON.stringify({ notes }) }),
    recordPayment: (orderId: number, data: { method: string; amount_paise: number; tendered_paise?: number; change_returned_paise?: number; txn_id?: string; notes?: string }) =>
        apiFetch(`/api/payments/${orderId}/record-payment`, { method: "POST", body: JSON.stringify(data) }),
    splitPayment: (orderId: number, data: { payments: Array<{ method: string; amount_paise: number; tendered_paise?: number; change_returned_paise?: number; txn_id?: string; notes?: string }>; notes?: string }) =>
        apiFetch(`/api/payments/${orderId}/split-payment`, { method: "POST", body: JSON.stringify(data) }),
    getDynamicUpi: (orderId: number) =>
        apiFetch(`/api/payments/${orderId}/dynamic-upi`),
    getPayments: (params?: { outlet_id?: number; method?: string; status?: string }) =>
        apiFetch("/api/payments", { params }),

    // Service Calls
    getServiceCalls: (status?: string, outletId?: number) =>
        apiFetch("/api/service-calls", { params: { status, outlet_id: outletId } }),
    createServiceCall: (table_id: number, call_type: string, notes?: string) =>
        apiFetch("/api/service-calls", { method: "POST", body: JSON.stringify({ table_id, call_type, notes }) }),
    attendServiceCall: (callId: number) =>
        apiFetch(`/api/service-calls/${callId}/attend`, { method: "PATCH" }),

    // Table Reservations & Pre-Booking
    createReservation: (data: {
        outlet_id: number;
        customer_name: string;
        customer_phone: string;
        customer_email?: string;
        party_size: number;
        reservation_date: string;
        reservation_time: string;
        seating_preference?: string;
        occasion?: string;
        special_requests?: string;
    }) => apiFetch("/api/reservations", { method: "POST", body: JSON.stringify(data) }),
    getReservations: (params?: { outlet_id?: number; date?: string; status?: string }) =>
        apiFetch("/api/reservations", { params }),
    lookupReservation: (queryStr: string) =>
        apiFetch(`/api/reservations/lookup/${encodeURIComponent(queryStr)}`),
    updateReservationStatus: (id: number, data: { status: string; table_id?: number }) =>
        apiFetch(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),

    // Analytics
    getAnalyticsSummary: (params?: { outlet_id?: number; start_date?: string; end_date?: string; days?: number }) =>
        apiFetch("/api/analytics/summary", { params }),
    getRevenueTrend: (days = 7, outletId?: number) =>
        apiFetch("/api/analytics/revenue-over-time", { params: { days, outlet_id: outletId } }),
    getChannelsBreakdown: (days = 7, outletId?: number) =>
        apiFetch("/api/analytics/channels", { params: { days, outlet_id: outletId } }),
    getPaymentMethodsBreakdown: (days = 7, outletId?: number) =>
        apiFetch("/api/analytics/payment-methods", { params: { days, outlet_id: outletId } }),
    getTopItems: (limit = 10, outletId?: number, days = 30) =>
        apiFetch("/api/analytics/top-items", { params: { limit, outlet_id: outletId, days } }),
    getHourlyDistribution: (outletId?: number, days = 30) =>
        apiFetch("/api/analytics/hourly-distribution", { params: { outlet_id: outletId, days } }),
    getCategoryBreakdown: (outletId?: number, days = 30) =>
        apiFetch("/api/analytics/category-breakdown", { params: { outlet_id: outletId, days } }),
    getTableTurnover: (outletId?: number, days = 7) =>
        apiFetch("/api/analytics/table-turnover", { params: { outlet_id: outletId, days } }),
    getBranchComparison: (days = 30) =>
        apiFetch("/api/analytics/branch-comparison", { params: { days } }),
    getEODReport: (date?: string, outletId?: number) =>
        apiFetch("/api/analytics/eod-report", { params: { date, outlet_id: outletId } }),

    // Audit Logs
    getAuditLogs: (params?: { outlet_id?: number; entity_type?: string; limit?: number }) =>
        apiFetch("/api/audit", { params }),

    // Outlet Settings
    getOutlet: (outletId = 1) =>
        apiFetch("/api/outlets/single", { params: { outlet_id: outletId } }),
    getOutlets: () =>
        apiFetch("/api/outlets/list"),
    updateOutlet: (outletId: number, data: any) =>
        apiFetch(`/api/outlets?outlet_id=${outletId}`, { method: "PUT", body: JSON.stringify(data) }),

    // Customer Auth & Reorder (Zero-Cost Instant Phone Recognition)
    quickLoginCustomer: (data: { phone: string; name?: string }) =>
        apiFetch("/api/customer/quick-login", { method: "POST", body: JSON.stringify(data) }),
    sendCustomerOtp: (phone: string) =>
        apiFetch("/api/customer/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
    verifyCustomerOtp: (data: { phone: string; otp_code: string; name?: string }) =>
        apiFetch("/api/customer/verify-otp", { method: "POST", body: JSON.stringify(data) }),
    getCustomerProfile: () =>
        apiFetch("/api/customer/profile"),
    addCustomerAddress: (data: { label: string; address_line: string; landmark?: string; is_default?: boolean }) =>
        apiFetch("/api/customer/address", { method: "POST", body: JSON.stringify(data) }),
    getCustomerOrders: () =>
        apiFetch("/api/customer/orders"),
    getReorderPayload: (orderId: number) =>
        apiFetch(`/api/customer/reorder/${orderId}`),

    // Promo Codes & Coupons
    validateCoupon: (data: { code: string; subtotal_paise: number; outlet_id?: number }) =>
        apiFetch("/api/coupons/validate", { method: "POST", body: JSON.stringify(data) }),
    getCoupons: (outletId?: number) =>
        apiFetch("/api/coupons", { params: outletId ? { outlet_id: outletId } : undefined }),
    createCoupon: (data: any) =>
        apiFetch("/api/coupons", { method: "POST", body: JSON.stringify(data) }),
    deleteCoupon: (id: number) =>
        apiFetch(`/api/coupons/${id}`, { method: "DELETE" }),
};
