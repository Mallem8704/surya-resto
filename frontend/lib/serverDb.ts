/**
 * Server-Side Data Layer & State Store for Standalone Next.js App.
 * Handles Outlets, Categories, Menu, Tables, Orders, Payments, Reservations, and Realtime Events.
 */
import { SURYA_CATEGORIES, SURYA_MENU_ITEMS, StaticMenuItem, StaticCategory } from "./suryaMenuData";

// ── Realtime Event Emitter for SSE ──
export interface RealtimeMessage {
    type: string;
    payload: any;
    timestamp: string;
}

type SSEListener = (msg: RealtimeMessage) => void;
const sseListeners = new Set<SSEListener>();

export function subscribeRealtime(listener: SSEListener): () => void {
    sseListeners.add(listener);
    return () => sseListeners.delete(listener);
}

export function broadcastRealtime(type: string, payload: any) {
    const msg: RealtimeMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
    };
    for (const listener of sseListeners) {
        try {
            listener(msg);
        } catch (err) {
            console.error("Error in SSE listener:", err);
        }
    }
}

// ── Outlets ──
export interface OutletData {
    id: number;
    name: string;
    address: string;
    phone: string;
    currency: string;
    tax_rate_percent: number;
    opening_hours: string;
    tagline: string;
    logo_url: string;
    gstin: string;
    fssai_license_number: string;
    upi_vpa: string;
    allow_table_booking: boolean;
    allow_table_ordering: boolean;
    allow_delivery: boolean;
}

export const OUTLET_SURYA: OutletData = {
    id: 1,
    name: "Surya Family Restaurant",
    address: "Dhandubatu Street, Bypass Road, Opp. RTC Bus Stand, Kadiri, Andhra Pradesh 515591",
    phone: "+91 98803 58634",
    currency: "INR",
    tax_rate_percent: 5,
    opening_hours: "11:00 AM – 11:30 PM",
    tagline: "Authentic Andhra & Hyderabadi Delights, Biryanis & Tandoor",
    logo_url: "/dishes/cat_biryani.jpg",
    gstin: "37AAAAA0000A1Z5",
    fssai_license_number: "10123000000000",
    upi_vpa: "9880358634@upi",
    allow_table_booking: true,
    allow_table_ordering: true,
    allow_delivery: true,
};

// ── Tables ──
export interface TableData {
    id: number;
    outlet_id: number;
    label: string;
    qr_code_url: string;
    status: "free" | "occupied" | "reserved";
    active_order_id?: number | null;
}

const initialTables: TableData[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    outlet_id: 1,
    label: `T${i + 1}`,
    qr_code_url: `/order?branch=1&table=T${i + 1}`,
    status: "free",
    active_order_id: null,
}));

// ── Orders ──
export interface OrderItemData {
    id: number;
    order_id: number;
    item_id?: number | null;
    variant_id?: number | null;
    variant_name?: string | null;
    selected_addons_json?: string | null;
    item_name: string;
    qty: number;
    unit_price_paise: number;
    total_price_paise: number;
    notes?: string | null;
}

export interface OrderData {
    id: number;
    outlet_id: number;
    table_id?: number | null;
    table_label?: string | null;
    idempotency_key?: string | null;
    order_type: "dine_in" | "delivery" | "takeaway";
    customer_name?: string | null;
    customer_phone?: string | null;
    delivery_address?: string | null;
    delivery_status: "pending" | "out_for_delivery" | "delivered";
    delivery_fee_paise: number;
    order_number: string;
    status: "placed" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "served" | "cancelled";
    subtotal_paise: number;
    tax_paise: number;
    discount_paise: number;
    coupon_code?: string | null;
    total_paise: number;
    payment_status: "pending" | "paid" | "failed";
    payment_method: "upi" | "card" | "cash" | "counter" | "cod";
    customer_notes?: string | null;
    created_at: string;
    updated_at: string;
    items: OrderItemData[];
    payments: PaymentData[];
}

export interface PaymentData {
    id: number;
    order_id: number;
    method: string;
    txn_id?: string | null;
    amount_paise: number;
    status: "pending" | "completed" | "failed" | "refunded";
    paid_at: string;
    notes?: string | null;
}

// ── In-Memory Database Container (Shared per process) ──
interface DBState {
    categories: StaticCategory[];
    menuItems: StaticMenuItem[];
    tables: TableData[];
    orders: OrderData[];
    payments: PaymentData[];
    serviceCalls: any[];
    reservations: any[];
    shifts: any[];
    coupons: any[];
    customers: Map<string, any>;
    nextOrderId: number;
    nextPaymentId: number;
    nextReservationId: number;
    nextShiftId: number;
}

const globalForDB = globalThis as unknown as { __SURYA_DB_STATE__?: DBState };

if (!globalForDB.__SURYA_DB_STATE__) {
    globalForDB.__SURYA_DB_STATE__ = {
        categories: [...SURYA_CATEGORIES],
        menuItems: [...SURYA_MENU_ITEMS],
        tables: [...initialTables],
        orders: [],
        payments: [],
        serviceCalls: [],
        reservations: [],
        shifts: [
            {
                id: 1,
                outlet_id: 1,
                cashier_id: 1,
                cashier_name: "Surya Managing Director",
                shift_name: "Morning Counter Shift",
                status: "open",
                opened_at: new Date().toISOString(),
                opening_float_paise: 200000, // ₹2,000 float
                cash_sales_paise: 0,
                upi_sales_paise: 0,
                card_sales_paise: 0,
                petty_cash_in_paise: 0,
                petty_cash_out_paise: 0,
                expected_cash_paise: 200000,
            },
        ],
        coupons: [
            {
                id: 1,
                code: "WELCOME50",
                description: "Flat ₹50 OFF on Kadiri Deliveries",
                discount_type: "flat",
                discount_value: 5000, // 5000 paise = ₹50
                min_order_paise: 30000, // ₹300
                is_active: true,
                times_used: 12,
            },
            {
                id: 2,
                code: "MANDI10",
                description: "10% OFF on Orders above ₹500",
                discount_type: "percent",
                discount_value: 10,
                min_order_paise: 50000, // ₹500
                max_discount_paise: 10000, // ₹100 max
                is_active: true,
                times_used: 28,
            },
        ],
        customers: new Map(),
        nextOrderId: 101,
        nextPaymentId: 201,
        nextReservationId: 301,
        nextShiftId: 2,
    };
}

const db = globalForDB.__SURYA_DB_STATE__;

// ── Database Access Operations ──

export const serverDb = {
    // Outlets
    getOutlet() {
        return OUTLET_SURYA;
    },

    // Categories
    getCategories(activeOnly = true) {
        if (activeOnly) {
            return db.categories.filter((c) => (c as any).is_active !== false);
        }
        return db.categories;
    },

    getCategoryById(id: number) {
        return db.categories.find((c) => c.id === id);
    },

    // Menu Items
    getMenuItems(params?: { category_id?: number; is_veg?: boolean; search?: string }) {
        let items = db.menuItems;
        if (params?.category_id) {
            items = items.filter((i) => i.category_id === Number(params.category_id));
        }
        if (params?.is_veg !== undefined) {
            items = items.filter((i) => i.is_veg === params.is_veg);
        }
        if (params?.search) {
            const q = params.search.toLowerCase();
            items = items.filter(
                (i) =>
                    i.name.toLowerCase().includes(q) ||
                    (i.name_te && i.name_te.toLowerCase().includes(q)) ||
                    (i.description && i.description.toLowerCase().includes(q))
            );
        }
        return items;
    },

    getMenuItemById(id: number) {
        return db.menuItems.find((i) => i.id === id);
    },

    toggleItemAvailability(id: number, is_available: boolean) {
        const item = db.menuItems.find((i) => i.id === id);
        if (item) {
            item.is_available = is_available;
            broadcastRealtime("STOCK_CHANGED", { itemId: id, is_available });
        }
        return item;
    },

    // Tables
    getTables() {
        return db.tables;
    },

    getTableById(id: number) {
        return db.tables.find((t) => t.id === id);
    },

    updateTableStatus(id: number, status: "free" | "occupied" | "reserved", active_order_id?: number | null) {
        const table = db.tables.find((t) => t.id === id);
        if (table) {
            table.status = status;
            if (active_order_id !== undefined) {
                table.active_order_id = active_order_id;
            }
            broadcastRealtime("TABLE_STATUS_CHANGED", table);
        }
        return table;
    },

    // Service Calls
    createServiceCall(tableId: number, callType: string) {
        const call = {
            id: Date.now(),
            outlet_id: 1,
            table_id: tableId,
            call_type: callType,
            status: "pending",
            created_at: new Date().toISOString(),
        };
        db.serviceCalls.push(call);
        broadcastRealtime("SERVICE_CALL", call);
        return call;
    },

    attendServiceCall(id: number) {
        const call = db.serviceCalls.find((c) => c.id === id);
        if (call) {
            call.status = "attended";
            broadcastRealtime("SERVICE_CALL_ATTENDED", call);
        }
        return call;
    },

    // Orders
    getOrders(filter?: { status?: string; order_type?: string; limit?: number }) {
        let orders = [...db.orders].reverse();
        if (filter?.status) {
            orders = orders.filter((o) => o.status === filter.status);
        }
        if (filter?.order_type) {
            orders = orders.filter((o) => o.order_type === filter.order_type);
        }
        if (filter?.limit) {
            orders = orders.slice(0, filter.limit);
        }
        return orders;
    },

    getOrderById(id: number) {
        return db.orders.find((o) => o.id === id);
    },

    createOrder(input: {
        order_type?: "dine_in" | "delivery" | "takeaway";
        table_id?: number | null;
        customer_name?: string | null;
        customer_phone?: string | null;
        delivery_address?: string | null;
        delivery_fee_paise?: number;
        items: {
            item_id: number;
            variant_id?: number | null;
            qty: number;
            notes?: string;
            selected_addons_json?: string;
        }[];
        customer_notes?: string | null;
        payment_method?: "upi" | "card" | "cash" | "counter" | "cod";
        idempotency_key?: string | null;
        coupon_code?: string | null;
    }): OrderData {
        // Idempotency guard
        if (input.idempotency_key) {
            const existing = db.orders.find((o) => o.idempotency_key === input.idempotency_key);
            if (existing) {
                return existing;
            }
        }

        const id = db.nextOrderId++;
        const orderNumber = `ORD-${String(id).padStart(4, "0")}`;
        let subtotalPaise = 0;
        const lineItems: OrderItemData[] = [];

        input.items.forEach((it, idx) => {
            const dish = db.menuItems.find((m) => m.id === it.item_id);
            let unitPrice = dish ? dish.price_paise : 20000;
            let variantName = null;

            if (it.variant_id && dish?.variants) {
                const v = dish.variants.find((vr) => vr.id === it.variant_id);
                if (v) {
                    unitPrice = v.price_paise;
                    variantName = v.name;
                }
            }

            const itemTotal = unitPrice * it.qty;
            subtotalPaise += itemTotal;

            lineItems.push({
                id: Date.now() + idx,
                order_id: id,
                item_id: it.item_id,
                variant_id: it.variant_id,
                variant_name: variantName,
                selected_addons_json: it.selected_addons_json || null,
                item_name: dish ? dish.name : `Item #${it.item_id}`,
                qty: it.qty,
                unit_price_paise: unitPrice,
                total_price_paise: itemTotal,
                notes: it.notes || null,
            });
        });

        // Compute 5% GST
        const taxPaise = Math.round(subtotalPaise * 0.05);
        let discountPaise = 0;

        // Apply coupon if valid
        if (input.coupon_code) {
            const c = db.coupons.find(
                (cp) => cp.code.toUpperCase() === input.coupon_code?.toUpperCase() && cp.is_active
            );
            if (c && subtotalPaise >= c.min_order_paise) {
                if (c.discount_type === "flat") {
                    discountPaise = c.discount_value;
                } else {
                    discountPaise = Math.round((subtotalPaise * c.discount_value) / 100);
                    if (c.max_discount_paise) {
                        discountPaise = Math.min(discountPaise, c.max_discount_paise);
                    }
                }
                c.times_used++;
            }
        }

        const deliveryFee = input.delivery_fee_paise || 0;
        const totalPaise = Math.max(0, subtotalPaise + taxPaise + deliveryFee - discountPaise);

        const table = input.table_id ? db.tables.find((t) => t.id === input.table_id) : null;

        const newOrder: OrderData = {
            id,
            outlet_id: 1,
            table_id: input.table_id || null,
            table_label: table ? table.label : null,
            idempotency_key: input.idempotency_key || null,
            order_type: input.order_type || (input.table_id ? "dine_in" : "delivery"),
            customer_name: input.customer_name || "Guest Diner",
            customer_phone: input.customer_phone || null,
            delivery_address: input.delivery_address || null,
            delivery_status: "pending",
            delivery_fee_paise: deliveryFee,
            order_number: orderNumber,
            status: "placed",
            subtotal_paise: subtotalPaise,
            tax_paise: taxPaise,
            discount_paise: discountPaise,
            coupon_code: input.coupon_code || null,
            total_paise: totalPaise,
            payment_status: "pending",
            payment_method: input.payment_method || "counter",
            customer_notes: input.customer_notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            items: lineItems,
            payments: [],
        };

        db.orders.push(newOrder);

        // Update table if dine_in
        if (input.table_id) {
            serverDb.updateTableStatus(input.table_id, "occupied", id);
        }

        // Broadcast real-time new order event to KDS & POS
        broadcastRealtime("NEW_ORDER", newOrder);

        return newOrder;
    },

    updateOrderStatus(
        id: number,
        status: "placed" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "served" | "cancelled"
    ) {
        const order = db.orders.find((o) => o.id === id);
        if (order) {
            order.status = status;
            order.updated_at = new Date().toISOString();

            if (status === "served" || status === "delivered" || status === "cancelled") {
                if (order.table_id) {
                    serverDb.updateTableStatus(order.table_id, "free", null);
                }
            }

            broadcastRealtime("ORDER_STATUS_CHANGED", order);
        }
        return order;
    },

    // Payments
    submitUpiRef(orderId: number, txnId: string) {
        const order = db.orders.find((o) => o.id === orderId);
        if (!order) return null;

        const payment: PaymentData = {
            id: db.nextPaymentId++,
            order_id: orderId,
            method: "upi",
            txn_id: txnId,
            amount_paise: order.total_paise,
            status: "pending",
            paid_at: new Date().toISOString(),
            notes: `Customer submitted UTR: ${txnId}`,
        };

        order.payments.push(payment);
        order.payment_method = "upi";
        broadcastRealtime("UPI_PAYMENT_PENDING", { order, payment });
        return payment;
    },

    verifyUpiPayment(orderId: number, isApproved: boolean) {
        const order = db.orders.find((o) => o.id === orderId);
        if (!order) return null;

        if (isApproved) {
            order.payment_status = "paid";
            if (order.status === "placed") {
                order.status = "accepted";
            }
            order.payments.forEach((p) => {
                p.status = "completed";
            });
            broadcastRealtime("PAYMENT_CONFIRMED", order);
        } else {
            order.payment_status = "failed";
            order.payments.forEach((p) => {
                p.status = "failed";
            });
            broadcastRealtime("PAYMENT_REJECTED", order);
        }
        return order;
    },

    tenderCash(orderId: number, tenderedPaise: number) {
        const order = db.orders.find((o) => o.id === orderId);
        if (!order) return null;

        const changePaise = Math.max(0, tenderedPaise - order.total_paise);
        const payment: PaymentData = {
            id: db.nextPaymentId++,
            order_id: orderId,
            method: "cash",
            amount_paise: order.total_paise,
            status: "completed",
            paid_at: new Date().toISOString(),
            notes: `Tendered: ₹${(tenderedPaise / 100).toFixed(2)}, Change: ₹${(changePaise / 100).toFixed(2)}`,
        };

        order.payments.push(payment);
        order.payment_status = "paid";
        order.payment_method = "cash";

        broadcastRealtime("PAYMENT_CONFIRMED", order);
        return { order, payment, change_paise: changePaise };
    },

    // Reservations
    createReservation(input: {
        customer_name: string;
        customer_phone: string;
        party_size: number;
        reservation_date: string;
        reservation_time: string;
        seating_preference?: string;
        occasion?: string;
        special_requests?: string;
    }) {
        const id = db.nextReservationId++;
        const reservationNumber = `RES-${String(id).padStart(4, "0")}`;

        const res = {
            id,
            outlet_id: 1,
            reservation_number: reservationNumber,
            customer_name: input.customer_name,
            customer_phone: input.customer_phone,
            party_size: input.party_size,
            reservation_date: input.reservation_date,
            reservation_time: input.reservation_time,
            seating_preference: input.seating_preference || "standard",
            occasion: input.occasion || null,
            special_requests: input.special_requests || null,
            status: "confirmed",
            created_at: new Date().toISOString(),
        };

        db.reservations.push(res);
        broadcastRealtime("NEW_RESERVATION", res);
        return res;
    },

    getReservations(date?: string) {
        if (date) {
            return db.reservations.filter((r) => r.reservation_date === date);
        }
        return [...db.reservations].reverse();
    },

    // Shifts
    getCurrentShift() {
        return db.shifts.find((s) => s.status === "open") || null;
    },

    openShift(openingFloatPaise: number, cashierName: string, cashierId = 1) {
        const shift = {
            id: db.nextShiftId++,
            outlet_id: 1,
            cashier_id: cashierId,
            cashier_name: cashierName,
            shift_name: "Counter Billing Shift",
            status: "open",
            opened_at: new Date().toISOString(),
            opening_float_paise: openingFloatPaise,
            cash_sales_paise: 0,
            upi_sales_paise: 0,
            card_sales_paise: 0,
            petty_cash_in_paise: 0,
            petty_cash_out_paise: 0,
            expected_cash_paise: openingFloatPaise,
        };
        db.shifts.push(shift);
        return shift;
    },

    recordPettyCash(shiftId: number, type: "in" | "out", amountPaise: number, reason: string) {
        const shift = db.shifts.find((s) => s.id === shiftId && s.status === "open");
        if (!shift) return null;

        if (type === "in") {
            shift.petty_cash_in_paise += amountPaise;
            shift.expected_cash_paise += amountPaise;
        } else {
            shift.petty_cash_out_paise += amountPaise;
            shift.expected_cash_paise -= amountPaise;
        }

        const entry = {
            id: Date.now(),
            shift_id: shiftId,
            type,
            amount_paise: amountPaise,
            reason,
            timestamp: new Date().toISOString(),
        };
        broadcastRealtime("PETTY_CASH_RECORDED", { shift, entry });
        return { shift, entry };
    },

    closeShift(shiftId: number, actualCashPaise: number, denominationsJson?: string, closingNotes?: string) {
        const shift = db.shifts.find((s) => s.id === shiftId);
        if (shift) {
            shift.status = "closed";
            shift.closed_at = new Date().toISOString();
            shift.actual_cash_paise = actualCashPaise;
            shift.difference_paise = actualCashPaise - shift.expected_cash_paise;
            shift.denominations_json = denominationsJson || null;
            shift.closing_notes = closingNotes || null;
        }
        return shift;
    },

    cancelOrder(orderId: number, reason?: string) {
        const order = db.orders.find((o) => o.id === orderId);
        if (order) {
            order.status = "cancelled";
            order.updated_at = new Date().toISOString();
            if (order.table_id) {
                serverDb.updateTableStatus(order.table_id, "free", null);
            }
            broadcastRealtime("ORDER_STATUS_CHANGED", { ...order, cancel_reason: reason });
        }
        return order;
    },

    // Customer CRM
    checkCustomer(phone: string) {
        const cleanPhone = phone.replace(/\D/g, "");
        const cust = db.customers.get(cleanPhone);
        if (cust) {
            return { exists: true, customer: cust };
        }
        return { exists: false };
    },

    quickLoginCustomer(phone: string, name?: string) {
        const cleanPhone = phone.replace(/\D/g, "");
        let cust = db.customers.get(cleanPhone);
        if (!cust) {
            cust = {
                id: db.customers.size + 1,
                phone: cleanPhone,
                name: name || `Customer ${cleanPhone.slice(-4)}`,
                default_address: null,
                created_at: new Date().toISOString(),
                orders_count: 0,
            };
            db.customers.set(cleanPhone, cust);
        } else if (name && cust.name !== name) {
            cust.name = name;
        }
        return cust;
    },

    saveCustomerAddress(phone: string, address: string) {
        const cleanPhone = phone.replace(/\D/g, "");
        let cust = db.customers.get(cleanPhone);
        if (!cust) {
            cust = serverDb.quickLoginCustomer(cleanPhone);
        }
        cust.default_address = address;
        return cust;
    },

    getCustomerOrders(phone: string) {
        const cleanPhone = phone.replace(/\D/g, "");
        return db.orders
            .filter((o) => o.customer_phone && o.customer_phone.replace(/\D/g, "") === cleanPhone)
            .reverse();
    },

    // Reservations
    updateReservationStatus(id: number, status: "confirmed" | "seated" | "cancelled" | "completed") {
        const res = db.reservations.find((r) => r.id === id);
        if (res) {
            res.status = status;
            broadcastRealtime("RESERVATION_STATUS_CHANGED", res);
        }
        return res;
    },

    // Analytics
    getAnalyticsSummary() {
        const totalOrders = db.orders.length;
        const totalRevenuePaise = db.orders
            .filter((o) => o.payment_status === "paid")
            .reduce((sum, o) => sum + o.total_paise, 0);

        const dineInOrders = db.orders.filter((o) => o.order_type === "dine_in").length;
        const deliveryOrders = db.orders.filter((o) => o.order_type === "delivery").length;

        return {
            today_revenue_paise: totalRevenuePaise,
            today_orders_count: totalOrders,
            average_order_value_paise: totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0,
            active_tables_occupied: db.tables.filter((t) => t.status === "occupied").length,
            dine_in_count: dineInOrders,
            delivery_count: deliveryOrders,
        };
    },

    getTopItems(limit = 10) {
        const counts: Record<string, { id: number; name: string; qty: number; revenue_paise: number }> = {};
        for (const order of db.orders) {
            for (const item of order.items) {
                const key = String(item.item_id || item.item_name);
                if (!counts[key]) {
                    counts[key] = {
                        id: item.item_id || 0,
                        name: item.item_name,
                        qty: 0,
                        revenue_paise: 0,
                    };
                }
                counts[key].qty += item.qty;
                counts[key].revenue_paise += item.total_price_paise;
            }
        }
        return Object.values(counts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, limit);
    },

    getRevenueOverTime() {
        const byHour: Record<string, { hour: string; revenue_paise: number; orders_count: number }> = {};
        for (let i = 11; i <= 23; i++) {
            const h = `${String(i).padStart(2, "0")}:00`;
            byHour[h] = { hour: h, revenue_paise: 0, orders_count: 0 };
        }
        for (const order of db.orders) {
            if (order.payment_status === "paid") {
                const d = new Date(order.created_at);
                const h = `${String(d.getHours()).padStart(2, "0")}:00`;
                if (byHour[h]) {
                    byHour[h].revenue_paise += order.total_paise;
                    byHour[h].orders_count += 1;
                }
            }
        }
        return Object.values(byHour);
    },

    getPaymentMethodsBreakdown() {
        const breakdown: Record<string, { method: string; count: number; total_paise: number }> = {
            upi: { method: "upi", count: 0, total_paise: 0 },
            cash: { method: "cash", count: 0, total_paise: 0 },
            card: { method: "card", count: 0, total_paise: 0 },
            counter: { method: "counter", count: 0, total_paise: 0 },
            cod: { method: "cod", count: 0, total_paise: 0 },
        };
        for (const order of db.orders) {
            const m = order.payment_method || "counter";
            if (!breakdown[m]) {
                breakdown[m] = { method: m, count: 0, total_paise: 0 };
            }
            breakdown[m].count += 1;
            if (order.payment_status === "paid") {
                breakdown[m].total_paise += order.total_paise;
            }
        }
        return Object.values(breakdown);
    },

    // Coupons
    getActiveCoupons() {
        return db.coupons.filter((c) => c.is_active);
    },

    validateCoupon(code: string, subtotalPaise: number) {
        const coupon = db.coupons.find(
            (c) => c.code.toUpperCase() === code.toUpperCase() && c.is_active
        );
        if (!coupon) {
            return { valid: false, message: "Invalid or expired promo code" };
        }
        if (subtotalPaise < coupon.min_order_paise) {
            return {
                valid: false,
                message: `Minimum order amount for this code is ₹${coupon.min_order_paise / 100}`,
            };
        }
        let discount = 0;
        if (coupon.discount_type === "flat") {
            discount = coupon.discount_value;
        } else {
            discount = Math.round((subtotalPaise * coupon.discount_value) / 100);
            if (coupon.max_discount_paise) {
                discount = Math.min(discount, coupon.max_discount_paise);
            }
        }
        return {
            valid: true,
            discount_paise: discount,
            coupon,
        };
    },
};
