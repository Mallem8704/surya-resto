"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Clock,
    Sparkles,
    ChefHat,
    CheckCircle2,
    UtensilsCrossed,
    XCircle,
    Bell,
    Banknote,
    CreditCard,
    ArrowRight,
    Droplets,
    Receipt,
    Sparkle,
    Filter,
    RefreshCw,
    Truck,
    Bike,
    Phone,
    MapPin,
    User,
    Store,
    PhoneCall,
    Printer,
    MessageCircle,
    Star,
    Calendar,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { printKOT, printPOSReceipt } from "@/lib/thermalPrint";
import { dispatchCustomerWhatsApp, dispatchPostDiningReview } from "@/lib/whatsapp";
import { useAdminSocket } from "@/hooks/useSockets";
import { formatRupees, formatRelativeTime, formatTimeOnly } from "@/lib/formatters";
import { soundManager } from "@/lib/sound";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";

const KANBAN_COLUMNS = [
    { key: "placed", titleKey: "status_placed", color: "border-blue-300 bg-blue-50/50", headerBg: "bg-blue-500", nextStatus: "accepted", nextLabel: "Accept" },
    { key: "accepted", titleKey: "status_accepted", color: "border-indigo-300 bg-indigo-50/50", headerBg: "bg-indigo-500", nextStatus: "preparing", nextLabel: "Start Prep" },
    { key: "preparing", titleKey: "status_preparing", color: "border-saffron-300 bg-saffron-50/50", headerBg: "bg-saffron-500", nextStatus: "ready", nextLabel: "Mark Ready" },
    { key: "ready", titleKey: "status_ready", color: "border-emerald-300 bg-emerald-50/50", headerBg: "bg-emerald-500", nextStatus: "served", nextLabel: "Mark Served" },
    { key: "served", titleKey: "status_served", color: "border-cream-300 bg-cream-100/50", headerBg: "bg-espresso-800", nextStatus: null, nextLabel: null },
];

export default function AdminLiveOrdersKanbanPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { t } = useLanguage();
    const toast = useToast();
    const router = useRouter();
    const { outlet } = useOutlet();

    const [orders, setOrders] = useState<any[]>([]);
    const [pendingServiceCalls, setPendingServiceCalls] = useState<any[]>([]);
    const [todayReservationsCount, setTodayReservationsCount] = useState<number>(0);
    const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
    const [animatingOrderId, setAnimatingOrderId] = useState<number | null>(null);
    const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "dine_in" | "delivery">("all");
    const [mobileColumnFilter, setMobileColumnFilter] = useState<string>("all");

    // Auth Route Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    // Fetch Initial Orders, Service Calls & Reservations
    const fetchOrders = useCallback(async () => {
        setIsLoadingOrders(true);
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const [ordersResult, callsResult, reservationsResult] = await Promise.allSettled([
                api.getOrders({ outlet_id: outlet?.id }),
                api.getServiceCalls("pending", outlet?.id),
                api.getReservations({ outlet_id: outlet?.id, date: todayStr }),
            ]);

            if (ordersResult.status === "fulfilled" && Array.isArray(ordersResult.value)) {
                setOrders(ordersResult.value);
            }
            if (callsResult.status === "fulfilled" && Array.isArray(callsResult.value)) {
                setPendingServiceCalls(callsResult.value);
            }
            if (reservationsResult.status === "fulfilled" && Array.isArray(reservationsResult.value)) {
                setTodayReservationsCount(
                    reservationsResult.value.filter((r) => r.status === "confirmed" || r.status === "seated").length
                );
            }
        } catch {
            // Silently handle any unexpected errors
        } finally {
            setIsLoadingOrders(false);
        }
    }, [outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated, fetchOrders]);

    // Real-Time WebSocket Hook with Audio Chimes
    const { isConnected: wsConnected } = useAdminSocket(outlet?.id || 1, (event) => {
        console.log("[AdminKanban] Received event:", event);

        if (event.event === "new_order" && event.data) {
            soundManager.playNewOrderChime();
            setOrders((prev) => [event.data, ...prev.filter((o) => o.id !== event.data.id)]);
            setAnimatingOrderId(event.data.id);
            if (event.data.order_type === "delivery") {
                toast.success(`New Delivery Order #${event.data.order_number} (${event.data.customer_name || "Customer"})!`);
            } else {
                toast.success(`New Table Order #${event.data.order_number} at Table ${event.data.table_label}!`);
            }
            setTimeout(() => setAnimatingOrderId(null), 4000);
        } else if (event.event === "new_reservation" && event.data) {
            soundManager.playNewOrderChime();
            setTodayReservationsCount((prev) => prev + 1);
            toast.success(`👑 New Table Pre-Booking #${event.data.reservation_number}: ${event.data.customer_name} (${event.data.party_size} Guests)!`);
        } else if ((event.event === "order_status_updated" || event.event === "order_updated") && event.data) {
            setOrders((prev) =>
                prev.map((o) => (o.id === event.data.id ? { ...o, status: event.data.status, payment_status: event.data.payment_status || o.payment_status } : o))
            );
        } else if (event.event === "service_call" && event.data) {
            soundManager.playServiceCallAlert();
            setPendingServiceCalls((prev) => [event.data, ...prev.filter((c) => c.id !== event.data.id)]);
            toast.info(`Table Alert: Table ${event.data.table_label} requested ${event.data.call_type.toUpperCase()}`);
        } else if (event.event === "service_call_attended" && event.data) {
            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== event.data.id));
        }
    });

    // Advance Status Handler
    const handleAdvanceStatus = async (orderId: number, nextStatus: string) => {
        try {
            const updated = await api.updateOrderStatus(orderId, nextStatus);
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
            toast.success(`Order #${updated.order_number} moved to ${nextStatus.toUpperCase()}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update order status");
        }
    };

    // Cancel Order Handler
    const handleCancelOrder = async (orderId: number) => {
        if (!confirm("Are you sure you want to cancel this order? Stock will be restored.")) return;
        try {
            const updated = await api.updateOrderStatus(orderId, "cancelled");
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
            toast.info(`Order #${updated.order_number} cancelled`);
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel order");
        }
    };

    // Reconcile Cash Paid Handler
    const handleMarkCashPaid = async (orderId: number) => {
        try {
            await api.markCashPaid(orderId, "Collected at counter / on delivery");
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, payment_status: "paid", payment_method: "cash" } : o))
            );
            toast.success("Payment marked as paid!");
        } catch (err: any) {
            toast.error(err.message || "Failed to reconcile payment");
        }
    };

    // Attend Service Call
    const handleAttendServiceCall = async (callId: number) => {
        try {
            await api.attendServiceCall(callId);
            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== callId));
            toast.success("Service call marked as attended");
        } catch (err: any) {
            toast.error("Failed to update service call");
        }
    };

    // Filter counts
    const dineInCount = orders.filter((o) => o.order_type !== "delivery").length;
    const deliveryCount = orders.filter((o) => o.order_type === "delivery").length;

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-cream-100 flex items-center justify-center text-espresso-700">
                Verifying authorization...
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-cream-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <AdminHeader
                    wsConnected={wsConnected}
                    pendingServiceCalls={pendingServiceCalls}
                    onAttendServiceCall={handleAttendServiceCall}
                />

                {/* PENDING SERVICE CALLS BANNER */}
                {pendingServiceCalls.length > 0 && (
                    <div className="bg-red-500 text-white px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto shadow-inner animate-in fade-in">
                        <div className="flex items-center gap-3 shrink-0">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span className="text-xs font-extrabold uppercase tracking-wide">
                                Active Table Assistance Requests:
                            </span>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto">
                            {pendingServiceCalls.map((call) => (
                                <div
                                    key={call.id}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold whitespace-nowrap"
                                >
                                    <span>
                                        Table {call.table_label}: {call.call_type.toUpperCase()}
                                    </span>
                                    <button
                                        onClick={() => handleAttendServiceCall(call.id)}
                                        className="px-2.5 py-0.5 rounded-full bg-white text-red-600 hover:bg-cream-100 text-[10px] font-extrabold cursor-pointer transition"
                                    >
                                        Attend
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KANBAN BOARD CONTAINER */}
                <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 bg-cream-100 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                        <div>
                            <h2 className="text-xl font-extrabold text-espresso-950 tracking-tight flex items-center gap-2">
                                Live Kitchen & Dispatch Kanban
                            </h2>
                            <p className="text-xs text-espresso-600">
                                Real-time pipeline for Dine-in Tables & Free Home Delivery.
                            </p>
                        </div>

                        {/* Order Type Filter Tabs */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <div className="flex items-center bg-white p-1 rounded-xl border border-cream-300 shadow-2xs">
                                <button
                                    onClick={() => setOrderTypeFilter("all")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                                        orderTypeFilter === "all"
                                            ? "bg-espresso-900 text-white"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                >
                                    All ({orders.length})
                                </button>
                                <button
                                    onClick={() => setOrderTypeFilter("dine_in")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                                        orderTypeFilter === "dine_in"
                                            ? "bg-amber-600 text-white"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                >
                                    <Store className="w-3 h-3" />
                                    Dine-in ({dineInCount})
                                </button>
                                <button
                                    onClick={() => setOrderTypeFilter("delivery")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                                        orderTypeFilter === "delivery"
                                            ? "bg-cyan-600 text-white"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                >
                                    <Bike className="w-3 h-3" />
                                    Delivery ({deliveryCount})
                                </button>
                            </div>

                            <Link
                                href="/admin/reservations"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-saffron-500/20 to-amber-500/20 border border-saffron-400/60 hover:border-saffron-500 text-espresso-900 text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                                <Calendar className="w-3.5 h-3.5 text-saffron-600" />
                                <span>Pre-Bookings ({todayReservationsCount})</span>
                            </Link>

                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                onClick={fetchOrders}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Column Switcher (Visible on phone screens < md) */}
                    <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0">
                        <button
                            type="button"
                            onClick={() => setMobileColumnFilter("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                                mobileColumnFilter === "all"
                                    ? "bg-espresso-950 text-white shadow-xs"
                                    : "bg-white border border-cream-300 text-espresso-700"
                            }`}
                        >
                            All Stages
                        </button>
                        {KANBAN_COLUMNS.map((col) => {
                            const count = orders.filter((o) => {
                                if (orderTypeFilter === "dine_in" && o.order_type === "delivery") return false;
                                if (orderTypeFilter === "delivery" && o.order_type !== "delivery") return false;
                                if (col.key === "ready") return o.status === "ready" || o.status === "out_for_delivery";
                                if (col.key === "served") return o.status === "served" || o.status === "delivered";
                                return o.status === col.key;
                            }).length;

                            return (
                                <button
                                    key={col.key}
                                    type="button"
                                    onClick={() => setMobileColumnFilter(col.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                        mobileColumnFilter === col.key
                                            ? "bg-espresso-950 text-white shadow-xs"
                                            : "bg-white border border-cream-300 text-espresso-700"
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${col.headerBg}`} />
                                    <span>{t(col.titleKey as any)}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Columns Grid */}
                    <div className="flex-1 flex md:grid md:grid-cols-5 gap-4 min-w-full md:min-w-0 pb-2 overflow-x-auto md:overflow-hidden snap-x">
                        {KANBAN_COLUMNS.map((col) => {
                            if (mobileColumnFilter !== "all" && mobileColumnFilter !== col.key) {
                                return null;
                            }

                            const columnOrders = orders.filter((o) => {
                                if (orderTypeFilter === "dine_in" && o.order_type === "delivery") return false;
                                if (orderTypeFilter === "delivery" && o.order_type !== "delivery") return false;

                                if (col.key === "ready") {
                                    return o.status === "ready" || o.status === "out_for_delivery";
                                }
                                if (col.key === "served") {
                                    return o.status === "served" || o.status === "delivered";
                                }
                                return o.status === col.key;
                            });

                            return (
                                <div
                                    key={col.key}
                                    className={`rounded-2xl border ${col.color} flex flex-col h-full overflow-hidden shadow-2xs min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-start flex-1`}
                                >
                                    {/* Column Header */}
                                    <div className="p-3.5 border-b border-cream-200 bg-white flex items-center justify-between shrink-0">
                                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${col.headerBg}`} />
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-espresso-900">
                                                {t(col.titleKey as any)}
                                            </h3>
                                        </div>
                                        <span className="w-5 h-5 rounded-full bg-cream-200 text-espresso-800 text-[11px] font-extrabold flex items-center justify-center">
                                            {columnOrders.length}
                                        </span>
                                    </div>

                                    {/* Cards Scrollable Area */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                        {isLoadingOrders ? (
                                            <div className="space-y-3">
                                                {[1, 2].map((k) => (
                                                    <div key={k} className="bg-white rounded-xl p-3.5 border border-cream-200 shadow-2xs space-y-2.5 animate-pulse">
                                                        <div className="h-4 w-24 bg-cream-200 rounded"></div>
                                                        <div className="h-3 w-32 bg-cream-100 rounded"></div>
                                                        <div className="h-8 w-full bg-cream-100 rounded-lg"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : columnOrders.length === 0 ? (
                                            <div className="h-32 flex items-center justify-center text-espresso-400 text-xs font-medium border border-dashed border-cream-300 rounded-xl">
                                                No orders in {col.key}
                                            </div>
                                        ) : (
                                            columnOrders.map((order) => {
                                                const isFlash = animatingOrderId === order.id;
                                                const isDelivery = order.order_type === "delivery";

                                                return (
                                                    <div
                                                        key={order.id}
                                                        className={`bg-white rounded-xl p-3.5 border shadow-2xs flex flex-col gap-2.5 transition-all duration-300 ${
                                                            isFlash
                                                                ? "ring-4 ring-saffron-400 border-saffron-500 scale-[1.02] shadow-lg animate-pulse"
                                                                : isDelivery
                                                                ? "border-cyan-300 hover:border-cyan-500 hover:shadow-sm"
                                                                : "border-cream-300 hover:border-terracotta-300 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        {/* Card Header */}
                                                        <div className="flex items-start justify-between gap-1">
                                                            <div>
                                                                {isDelivery ? (
                                                                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-cyan-700 text-white flex items-center gap-1">
                                                                        <Bike className="w-3 h-3" />
                                                                        Delivery #{order.order_number}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-espresso-900 text-white">
                                                                        Table {order.table_label || `T${order.table_id}`}
                                                                    </span>
                                                                )}
                                                                {!isDelivery && (
                                                                    <span className="text-[11px] text-espresso-500 font-semibold block mt-1">
                                                                        #{order.order_number}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-espresso-400 font-medium">
                                                                {formatRelativeTime(order.created_at)}
                                                            </span>
                                                        </div>

                                                        {/* Delivery Customer Details Box */}
                                                        {isDelivery && (
                                                            <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs space-y-1">
                                                                <div className="flex items-center justify-between font-bold text-cyan-950">
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="w-3 h-3 text-cyan-700" />
                                                                        {order.customer_name || "Customer"}
                                                                    </span>
                                                                    {order.customer_phone && (
                                                                        <a
                                                                            href={`tel:${order.customer_phone}`}
                                                                            className="text-cyan-800 hover:text-cyan-950 underline flex items-center gap-1 text-[11px]"
                                                                        >
                                                                            <Phone className="w-3 h-3" />
                                                                            {order.customer_phone}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                {order.delivery_address && (
                                                                    <p className="text-[11px] text-cyan-900 flex items-start gap-1 leading-snug">
                                                                        <MapPin className="w-3 h-3 text-cyan-700 shrink-0 mt-0.5" />
                                                                        <span>{order.delivery_address}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Items List with Variants & Add-ons */}
                                                        <div className="divide-y divide-cream-100 text-xs">
                                                            {order.items?.map((it: any) => {
                                                                let addonsList: Array<{ name: string; price_paise: number }> = [];
                                                                if (it.selected_addons_json) {
                                                                    try {
                                                                        addonsList = JSON.parse(it.selected_addons_json);
                                                                    } catch {}
                                                                }

                                                                return (
                                                                    <div key={it.id} className="py-1.5">
                                                                        <div className="flex justify-between items-start font-bold text-espresso-900">
                                                                            <div className="flex-1 pr-2">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span>{it.qty}x {it.item_name}</span>
                                                                                    {it.variant_name && (
                                                                                        <span className="text-[10px] font-black uppercase bg-saffron-100 text-saffron-900 border border-saffron-300 px-1.5 py-0.2 rounded-md">
                                                                                            {it.variant_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {addonsList.length > 0 && (
                                                                                    <p className="text-[10px] text-terracotta-700 font-semibold mt-0.5">
                                                                                        + {addonsList.map((a) => a.name).join(", ")}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-espresso-600 font-medium shrink-0">
                                                                                {formatRupees(it.total_price_paise)}
                                                                            </span>
                                                                        </div>
                                                                        {it.notes && (
                                                                            <p className="text-[10px] text-espresso-500 italic mt-0.5">
                                                                                "{it.notes}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Customer Notes */}
                                                        {order.customer_notes && (
                                                            <div className="p-2 rounded-lg bg-cream-100 text-[10px] text-espresso-700 italic border border-cream-200">
                                                                Note: {order.customer_notes}
                                                            </div>
                                                        )}

                                                        {/* Thermal POS & WhatsApp Dispatch Strip */}
                                                        <div className="flex flex-wrap items-center gap-1 py-1 px-1.5 rounded-xl bg-cream-50/80 border border-cream-200 text-[10px]">
                                                            <button
                                                                onClick={() => printKOT(order, outlet)}
                                                                className="px-2 py-1 rounded-md bg-white border border-cream-300 hover:bg-cream-100 text-espresso-800 font-bold flex items-center gap-1 transition cursor-pointer"
                                                                title="Print Kitchen Order Ticket (KOT)"
                                                            >
                                                                <Printer className="w-2.5 h-2.5 text-amber-600" />
                                                                <span>KOT</span>
                                                            </button>

                                                            <button
                                                                onClick={() => printPOSReceipt(order, outlet)}
                                                                className="px-2 py-1 rounded-md bg-white border border-cream-300 hover:bg-cream-100 text-espresso-800 font-bold flex items-center gap-1 transition cursor-pointer"
                                                                title="Print Customer Tax Invoice / Bill"
                                                            >
                                                                <Printer className="w-2.5 h-2.5 text-emerald-600" />
                                                                <span>Bill</span>
                                                            </button>

                                                            {order.order_type === "delivery" && order.customer_phone && (
                                                                <button
                                                                    onClick={() => dispatchCustomerWhatsApp(order, outlet)}
                                                                    className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1 transition cursor-pointer"
                                                                    title="Send WhatsApp Confirmation & Live Tracking"
                                                                >
                                                                    <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                                                    <span>Invoice</span>
                                                                </button>
                                                            )}

                                                            {order.customer_phone && (
                                                                <button
                                                                    onClick={() => dispatchPostDiningReview(order, outlet)}
                                                                    className="px-2 py-1 rounded-md bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-1 transition cursor-pointer ml-auto"
                                                                    title="Send 5-Star Google Review Invite on WhatsApp"
                                                                >
                                                                    <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                                                    <span>Review</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Financial & Payment Row */}
                                                        <div className="pt-2 border-t border-cream-100 flex items-center justify-between text-xs">
                                                            <div>
                                                                <span className="font-extrabold text-espresso-950 block">
                                                                    {formatRupees(order.total_paise)}
                                                                </span>
                                                                <span className="text-[10px] font-bold inline-flex items-center gap-1">
                                                                    {order.payment_status === "paid" ? (
                                                                        <>
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                            <span className="text-emerald-700">Paid ({order.payment_method.toUpperCase()})</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Clock className="w-3 h-3 text-saffron-600 shrink-0" />
                                                                            <span className="text-saffron-700">
                                                                                {isDelivery ? "Cash on Delivery (COD)" : "Pay at Counter"}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {order.payment_status !== "paid" && (
                                                                <button
                                                                    onClick={() => handleMarkCashPaid(order.id)}
                                                                    className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold transition cursor-pointer"
                                                                >
                                                                    Mark Paid
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="pt-1 flex items-center gap-1.5">
                                                            {isDelivery ? (
                                                                <>
                                                                    {order.status === "placed" && (
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-1 py-1.5 text-[11px]"
                                                                            onClick={() => handleAdvanceStatus(order.id, "accepted")}
                                                                        >
                                                                            Accept Order
                                                                        </Button>
                                                                    )}
                                                                    {order.status === "accepted" && (
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-1 py-1.5 text-[11px]"
                                                                            onClick={() => handleAdvanceStatus(order.id, "preparing")}
                                                                        >
                                                                            Start Cooking
                                                                        </Button>
                                                                    )}
                                                                    {order.status === "preparing" && (
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-1 py-1.5 text-[11px] bg-cyan-700 hover:bg-cyan-800"
                                                                            onClick={() => handleAdvanceStatus(order.id, "out_for_delivery")}
                                                                            rightIcon={<Bike className="w-3 h-3" />}
                                                                        >
                                                                            Dispatch Rider
                                                                        </Button>
                                                                    )}
                                                                    {order.status === "ready" && (
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-1 py-1.5 text-[11px] bg-cyan-700 hover:bg-cyan-800"
                                                                            onClick={() => handleAdvanceStatus(order.id, "out_for_delivery")}
                                                                            rightIcon={<Bike className="w-3 h-3" />}
                                                                        >
                                                                            Dispatch Rider
                                                                        </Button>
                                                                    )}
                                                                    {order.status === "out_for_delivery" && (
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-1 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                                                                            onClick={() => handleAdvanceStatus(order.id, "delivered")}
                                                                            rightIcon={<CheckCircle2 className="w-3 h-3" />}
                                                                        >
                                                                            Mark Delivered
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                col.nextStatus && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        className="flex-1 py-1.5 text-[11px]"
                                                                        onClick={() => handleAdvanceStatus(order.id, col.nextStatus!)}
                                                                        rightIcon={<ArrowRight className="w-3 h-3" />}
                                                                    >
                                                                        {col.nextLabel}
                                                                    </Button>
                                                                )
                                                            )}

                                                            {order.status !== "served" && order.status !== "delivered" && order.status !== "cancelled" && (
                                                                <button
                                                                    onClick={() => handleCancelOrder(order.id)}
                                                                    className="p-1.5 rounded-lg text-espresso-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-bold transition cursor-pointer"
                                                                    title="Cancel Order"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
        </div>
    );
}
