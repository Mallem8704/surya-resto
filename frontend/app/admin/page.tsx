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
    BellRing,
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
    LayoutList,
    Columns,
    Search,
    Flame,
    AlertTriangle,
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
import { formatRupees, formatRelativeTime, formatTimeOnly, normalizeDate } from "@/lib/formatters";
import { soundManager } from "@/lib/sound";
import { AudioUnlockBanner } from "@/components/admin/AudioUnlockBanner";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";

const KANBAN_COLUMNS = [
    { key: "placed", titleKey: "status_placed", color: "border-blue-300 bg-blue-50/50", headerBg: "bg-blue-500", nextStatus: "accepted", nextLabel: "Accept" },
    { key: "accepted", titleKey: "status_accepted", color: "border-indigo-300 bg-indigo-50/50", headerBg: "bg-indigo-500", nextStatus: "preparing", nextLabel: "Start Prep" },
    { key: "preparing", titleKey: "status_preparing", color: "border-saffron-300 bg-saffron-50/50", headerBg: "bg-saffron-500", nextStatus: "ready", nextLabel: "Mark Ready" },
    { key: "ready", titleKey: "status_ready", color: "border-emerald-300 bg-emerald-50/50", headerBg: "bg-emerald-500", nextStatus: "served", nextLabel: "Mark Served" },
    { key: "served", titleKey: "status_served", color: "border-cream-300 bg-cream-100/50", headerBg: "bg-espresso-800", nextStatus: null, nextLabel: null },
];

function getElapsedMinutes(dateStr: string | Date): number {
    if (!dateStr) return 0;
    const date = normalizeDate(dateStr);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
}

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
    const [alarmOrder, setAlarmOrder] = useState<any>(null);

    // Dual-Mode View Switcher: "horizontal" queue (default) vs "kanban" columns
    const [viewMode, setViewMode] = useState<"horizontal" | "kanban">("horizontal");
    const [stageFilter, setStageFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<"urgent" | "newest">("urgent");

    // Load persisted view mode preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem("surya_admin_view_mode");
            if (saved === "horizontal" || saved === "kanban") {
                setViewMode(saved);
            }
        } catch {
            // Storage access fallback
        }
    }, []);

    const handleSetViewMode = (mode: "horizontal" | "kanban") => {
        setViewMode(mode);
        try {
            localStorage.setItem("surya_admin_view_mode", mode);
        } catch {
            // Ignore storage write issues
        }
    };

    // Subscribe to continuous repeating order alarm
    useEffect(() => {
        const unsub = soundManager.subscribeAlarm((isRinging, order) => {
            setAlarmOrder(isRinging ? order : null);
        });
        return unsub;
    }, []);

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
                setOrders((prev) => {
                    // Safety net check: if there is any unaccepted order (status === "placed")
                    // that arrived while disconnected, ensure alarm rings!
                    if (prev.length > 0) {
                        const prevIds = new Set(prev.map((o) => o.id));
                        const unacceptedIncoming = ordersResult.value.filter(
                            (o: any) => !prevIds.has(o.id) && (o.status === "placed" || o.status === "pending")
                        );
                        if (unacceptedIncoming.length > 0) {
                            soundManager.startContinuousOrderAlarm(unacceptedIncoming[0]);
                        }
                    }
                    return ordersResult.value;
                });
            }
            if (callsResult.status === "fulfilled" && Array.isArray(callsResult.value)) {
                setPendingServiceCalls(callsResult.value);
            }
            if (reservationsResult.status === "fulfilled" && Array.isArray(reservationsResult.value)) {
                setTodayReservationsCount(
                    reservationsResult.value.filter((r) => r.status === "confirmed" || r.status === "seated").length
                );
            }
        } catch (err: any) {
            // If token is expired/invalid, the apiFetch auto-logout handler will redirect.
            // For other errors, show a non-intrusive warning on first failure only.
            if (err?.status !== 401 && err?.status !== 0) {
                // Only log — don't toast on every 8-second poll failure
                if (process.env.NODE_ENV === "development") {
                    console.warn("[Admin] Failed to fetch orders:", err.message);
                }
            }
        } finally {
            setIsLoadingOrders(false);
        }
    }, [outlet?.id]);

    // Initial load + 8-second resilient polling safety net (dual-channel sync with WebSockets)
    useEffect(() => {
        if (!isAuthenticated) return;
        fetchOrders();
        soundManager.requestNotificationPermission();

        const pollInterval = setInterval(() => {
            fetchOrders();
        }, 8000);

        return () => clearInterval(pollInterval);
    }, [isAuthenticated, fetchOrders]);

    // Real-Time WebSocket Hook with Audio Chimes & Continuous Alarm
    const { isConnected: wsConnected } = useAdminSocket(outlet?.id || 1, (event) => {
        if (process.env.NODE_ENV === "development") console.log("[AdminKanban] Received event:", event);

        if (event.event === "new_order" && event.data) {
            soundManager.startContinuousOrderAlarm(event.data);
            setOrders((prev) => [event.data, ...prev.filter((o) => o.id !== event.data.id)]);
            setAnimatingOrderId(event.data.id);
            if (event.data.order_type === "delivery") {
                toast.success(`🚨 New Delivery Order #${event.data.order_number} (${event.data.customer_name || "Customer"})!`);
            } else {
                toast.success(`🚨 New Table Order #${event.data.order_number} at Table ${event.data.table_label}!`);
            }
            setTimeout(() => setAnimatingOrderId(null), 4000);
        } else if (event.event === "new_reservation" && event.data) {
            soundManager.playReservationVoiceAlert(event.data);
            setTodayReservationsCount((prev) => prev + 1);
            toast.success(`New Table Pre-Booking #${event.data.reservation_number}: ${event.data.customer_name} (${event.data.party_size} Guests)!`);
        } else if (event.event === "running_kot_added" && event.data) {
            soundManager.playRunningKotVoiceAlert(event.data.table_label || event.data.table_id || "Table");
            setOrders((prev) => {
                const exists = prev.some((o) => o.id === event.data.id);
                if (exists) {
                    return prev.map((o) => (o.id === event.data.id ? event.data : o));
                }
                return [event.data, ...prev];
            });
            toast.info(`Running KOT appended to Table ${event.data.table_label || event.data.table_id} (#${event.data.order_number})`);
        } else if ((event.event === "order_status_updated" || event.event === "order_updated") && event.data) {
            if (event.data.payment_status === "paid" && event.data.total_paise) {
                const totalRs = Math.round(event.data.total_paise / 100);
                soundManager.playPaymentSoundbox(totalRs, event.data.payment_method?.toUpperCase() || "UPI", event.data.table_label);
            }
            setOrders((prev) =>
                prev.map((o) => (o.id === event.data.id ? { ...o, status: event.data.status, payment_status: event.data.payment_status || o.payment_status } : o))
            );
        } else if (event.event === "service_call" && event.data) {
            soundManager.playServiceCallVoiceAlert(event.data);
            setPendingServiceCalls((prev) => [event.data, ...prev.filter((c) => c.id !== event.data.id)]);
            toast.info(`Table Alert: Table ${event.data.table_label} requested ${event.data.call_type.toUpperCase()}`);
        } else if (event.event === "service_call_attended" && event.data) {
            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== event.data.id));
        }
    });

    // Advance Status Handler
    const handleAdvanceStatus = async (orderId: number, nextStatus: string) => {
        soundManager.stopContinuousOrderAlarm();
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

    // Stage counts for Horizontal View
    const countAll = orders.length;
    const countPlaced = orders.filter((o) => o.status === "placed" || o.status === "pending").length;
    const countAccepted = orders.filter((o) => o.status === "accepted").length;
    const countPreparing = orders.filter((o) => o.status === "preparing").length;
    const countReady = orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery").length;
    const countCompleted = orders.filter((o) => o.status === "served" || o.status === "delivered").length;

    // Filtered & sorted orders for Horizontal Queue
    const filteredHorizontalOrders = orders
        .filter((o) => {
            if (orderTypeFilter === "dine_in" && o.order_type === "delivery") return false;
            if (orderTypeFilter === "delivery" && o.order_type !== "delivery") return false;

            if (stageFilter === "placed") {
                if (o.status !== "placed" && o.status !== "pending") return false;
            } else if (stageFilter === "accepted") {
                if (o.status !== "accepted") return false;
            } else if (stageFilter === "preparing") {
                if (o.status !== "preparing") return false;
            } else if (stageFilter === "ready") {
                if (o.status !== "ready" && o.status !== "out_for_delivery") return false;
            } else if (stageFilter === "completed") {
                if (o.status !== "served" && o.status !== "delivered") return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesOrderNo = o.order_number?.toString().toLowerCase().includes(q);
                const matchesName = o.customer_name?.toLowerCase().includes(q);
                const matchesPhone = o.customer_phone?.toLowerCase().includes(q);
                const matchesTable = (o.table_label || o.table_id)?.toString().toLowerCase().includes(q);
                const matchesItem = o.items?.some((it: any) => it.item_name?.toLowerCase().includes(q));
                if (!matchesOrderNo && !matchesName && !matchesPhone && !matchesTable && !matchesItem) {
                    return false;
                }
            }

            return true;
        })
        .sort((a, b) => {
            if (sortBy === "urgent") {
                const isAActive = a.status !== "served" && a.status !== "delivered" && a.status !== "cancelled";
                const isBActive = b.status !== "served" && b.status !== "delivered" && b.status !== "cancelled";

                if (isAActive && !isBActive) return -1;
                if (!isAActive && isBActive) return 1;

                if (isAActive && isBActive) {
                    const isAPlaced = a.status === "placed" || a.status === "pending";
                    const isBPlaced = b.status === "placed" || b.status === "pending";
                    if (isAPlaced && !isBPlaced) return -1;
                    if (!isAPlaced && isBPlaced) return 1;

                    const timeA = new Date(normalizeDate(a.created_at)).getTime();
                    const timeB = new Date(normalizeDate(b.created_at)).getTime();
                    return timeA - timeB;
                }

                const timeA = new Date(normalizeDate(a.created_at)).getTime();
                const timeB = new Date(normalizeDate(b.created_at)).getTime();
                return timeB - timeA;
            } else {
                const timeA = new Date(normalizeDate(a.created_at)).getTime();
                const timeB = new Date(normalizeDate(b.created_at)).getTime();
                return timeB - timeA;
            }
        });

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

                {/* RESTAURANT SOUNDBOX BANNER */}
                <AudioUnlockBanner />

                {/* URGENT UNACCEPTED ORDER ALARM BANNER */}
                {alarmOrder && (
                    <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl border-b-4 border-yellow-400 animate-pulse shrink-0">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                                <BellRing className="w-7 h-7 text-yellow-300 animate-bounce" />
                            </div>
                            <div>
                                <h3 className="font-black text-base sm:text-lg uppercase tracking-wider flex items-center gap-2">
                                    <span>🚨 NEW {alarmOrder.order_type === "delivery" ? "DELIVERY" : alarmOrder.order_type === "takeaway" ? "TAKEAWAY" : "TABLE"} ORDER #{alarmOrder.order_number || alarmOrder.id}!</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-red-100 font-medium mt-0.5">
                                    Amount: <strong>₹{Math.round((alarmOrder.total_paise || 0) / 100)}</strong> • Customer: <strong>{alarmOrder.customer_name || "Guest"}</strong> {alarmOrder.customer_phone ? `(${alarmOrder.customer_phone})` : ""} • Placed from Website
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    handleAdvanceStatus(alarmOrder.id, "accepted");
                                    soundManager.stopContinuousOrderAlarm();
                                }}
                                className="flex-1 sm:flex-none px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs sm:text-sm rounded-xl uppercase tracking-wider transition shadow-xl cursor-pointer"
                            >
                                ✓ ACCEPT ORDER & SILENCE ALARM
                            </button>
                            <button
                                type="button"
                                onClick={() => soundManager.stopContinuousOrderAlarm()}
                                className="px-3.5 py-3 bg-black/40 hover:bg-black/60 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                                Silence Audio
                            </button>
                        </div>
                    </div>
                )}

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

                {/* MAIN CONTENT CONTAINER (DUAL-MODE: HORIZONTAL QUEUE OR KANBAN COLUMNS) */}
                <main className={`flex-1 p-4 sm:p-6 bg-cream-100 flex flex-col ${viewMode === "horizontal" ? "overflow-y-auto" : "overflow-x-auto overflow-y-hidden"}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 shrink-0">
                        <div>
                            <h2 className="text-xl font-extrabold text-espresso-950 tracking-tight flex items-center gap-2">
                                {viewMode === "horizontal" ? "Live Order Queue (Widescreen)" : "Live Kitchen & Dispatch Kanban"}
                            </h2>
                            <p className="text-xs text-espresso-600">
                                {viewMode === "horizontal"
                                    ? "Real-time horizontal order stream with live timers, kitchen breakdowns, and instant actions."
                                    : "Real-time pipeline for Dine-in Tables & Free Home Delivery."}
                            </p>
                        </div>

                        {/* Top Controls Strip: Dual-Mode Switcher, Type Filters & Quick Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            {/* Dual Mode Switcher */}
                            <div className="flex items-center bg-white p-1 rounded-xl border border-cream-300 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => handleSetViewMode("horizontal")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                                        viewMode === "horizontal"
                                            ? "bg-espresso-950 text-white shadow-xs"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                    title="Switch to Widescreen Horizontal Queue"
                                >
                                    <LayoutList className="w-3.5 h-3.5" />
                                    <span>Horizontal</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetViewMode("kanban")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                                        viewMode === "kanban"
                                            ? "bg-espresso-950 text-white shadow-xs"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                    title="Switch to 5-Column Kanban Board"
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    <span>Kanban</span>
                                </button>
                            </div>

                            {/* Order Type Filter Tabs */}
                            <div className="flex items-center bg-white p-1 rounded-xl border border-cream-300 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("all")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                        orderTypeFilter === "all"
                                            ? "bg-espresso-900 text-white"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                >
                                    All ({orders.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("dine_in")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                                        orderTypeFilter === "dine_in"
                                            ? "bg-amber-600 text-white"
                                            : "text-espresso-600 hover:text-espresso-900"
                                    }`}
                                >
                                    <Store className="w-3 h-3" />
                                    Dine-in ({dineInCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderTypeFilter("delivery")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
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

                    {/* ========================================================================= */}
                    {/* VIEW MODE 1: WIDESCREEN HORIZONTAL ORDER QUEUE                           */}
                    {/* ========================================================================= */}
                    {viewMode === "horizontal" ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Horizontal Stage Filter Tabs & Search / Sort Strip */}
                            <div className="bg-white rounded-2xl border border-cream-200 p-3 mb-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                                {/* Stage Filter Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("all")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                                            stageFilter === "all"
                                                ? "bg-espresso-950 text-white shadow-xs"
                                                : "bg-cream-100 hover:bg-cream-200 text-espresso-700"
                                        }`}
                                    >
                                        All ({countAll})
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("placed")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                            stageFilter === "placed"
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${countPlaced > 0 ? "bg-red-500 animate-ping" : "bg-blue-500"}`} />
                                        <span>Placed</span>
                                        <span className="font-mono text-[11px] font-extrabold">({countPlaced})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("accepted")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                            stageFilter === "accepted"
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                        <span>Accepted</span>
                                        <span className="font-mono text-[11px] font-extrabold">({countAccepted})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("preparing")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                            stageFilter === "preparing"
                                                ? "bg-saffron-600 text-white shadow-xs"
                                                : "bg-saffron-50 text-saffron-800 hover:bg-saffron-100 border border-saffron-200"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-saffron-500" />
                                        <span>Cooking</span>
                                        <span className="font-mono text-[11px] font-extrabold">({countPreparing})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("ready")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                            stageFilter === "ready"
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span>Ready / Out</span>
                                        <span className="font-mono text-[11px] font-extrabold">({countReady})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStageFilter("completed")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                            stageFilter === "completed"
                                                ? "bg-espresso-800 text-white shadow-xs"
                                                : "bg-cream-100 text-espresso-700 hover:bg-cream-200 border border-cream-300"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-espresso-500" />
                                        <span>Completed</span>
                                        <span className="font-mono text-[11px] font-extrabold">({countCompleted})</span>
                                    </button>
                                </div>

                                {/* Search Bar & Urgent Sort Switcher */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search order, phone, dish..."
                                            className="w-full pl-8 pr-7 py-1.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-medium text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:border-espresso-900 transition"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-espresso-700 text-xs font-black cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Sort Mode */}
                                    <div className="flex items-center bg-cream-100 p-0.5 rounded-xl border border-cream-300">
                                        <button
                                            type="button"
                                            onClick={() => setSortBy("urgent")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                                sortBy === "urgent"
                                                    ? "bg-white text-espresso-950 shadow-2xs"
                                                    : "text-espresso-600 hover:text-espresso-900"
                                            }`}
                                            title="Longest waiting orders first"
                                        >
                                            Urgent First
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSortBy("newest")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                                sortBy === "newest"
                                                    ? "bg-white text-espresso-950 shadow-2xs"
                                                    : "text-espresso-600 hover:text-espresso-900"
                                            }`}
                                            title="Newest orders first"
                                        >
                                            Newest First
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Horizontal Cards Stream */}
                            <div className="space-y-3 pb-8">
                                {isLoadingOrders ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((k) => (
                                            <div key={k} className="bg-white rounded-2xl p-5 border border-cream-200 shadow-2xs space-y-3 animate-pulse">
                                                <div className="flex justify-between items-center">
                                                    <div className="h-5 w-32 bg-cream-200 rounded-lg"></div>
                                                    <div className="h-5 w-24 bg-cream-100 rounded-lg"></div>
                                                </div>
                                                <div className="h-12 w-full bg-cream-100 rounded-xl"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredHorizontalOrders.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-dashed border-cream-300 p-12 text-center my-4 flex flex-col items-center justify-center">
                                        <UtensilsCrossed className="w-10 h-10 text-espresso-300 mb-3" />
                                        <h4 className="font-extrabold text-espresso-900 text-sm">No orders found</h4>
                                        <p className="text-xs text-espresso-500 mt-1 max-w-sm">
                                            {searchQuery
                                                ? `No orders match your search "${searchQuery}". Try clearing the search.`
                                                : stageFilter !== "all"
                                                ? `There are currently no orders in the "${stageFilter}" stage.`
                                                : "No live orders at the moment. When a customer places an order, it will appear here in real time."}
                                        </p>
                                        {(searchQuery || stageFilter !== "all") && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setStageFilter("all");
                                                }}
                                                className="mt-4 px-4 py-1.5 rounded-xl bg-espresso-950 text-white text-xs font-bold transition hover:bg-espresso-800 cursor-pointer"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredHorizontalOrders.map((order) => {
                                        const isFlash = animatingOrderId === order.id;
                                        const isDelivery = order.order_type === "delivery";
                                        const isUnaccepted = order.status === "placed" || order.status === "pending";
                                        const elapsedMins = getElapsedMinutes(order.created_at);
                                        const isCompleted = order.status === "served" || order.status === "delivered";
                                        const displayToken = order.daily_token || order.token_number || order.token_no || (typeof order.order_number === "string" ? order.order_number.replace(/\D/g, "").slice(-3) : order.id) || order.id;

                                        return (
                                            <div
                                                key={order.id}
                                                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col xl:flex-row items-stretch xl:items-start justify-between gap-4 sm:gap-6 ${
                                                    isFlash
                                                        ? "ring-4 ring-saffron-400 border-saffron-500 scale-[1.01] shadow-lg animate-pulse"
                                                        : isUnaccepted
                                                        ? "border-red-400 bg-red-50/20 ring-2 ring-red-200"
                                                        : isDelivery
                                                        ? "border-cyan-200 hover:border-cyan-400"
                                                        : "border-cream-300 hover:border-terracotta-300"
                                                }`}
                                            >
                                                {/* ZONE 1: Identifier, Token & Urgency Elapsed Timer */}
                                                <div className="xl:w-56 shrink-0 flex flex-col justify-between gap-3 border-b xl:border-b-0 xl:border-r border-cream-200 pb-3 xl:pb-0 xl:pr-5">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                                            {isDelivery ? (
                                                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-cyan-700 text-white flex items-center gap-1.5 shadow-2xs">
                                                                    <Bike className="w-3.5 h-3.5" />
                                                                    DELIVERY
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-espresso-950 text-white flex items-center gap-1.5 shadow-2xs">
                                                                    <Store className="w-3.5 h-3.5 text-saffron-400" />
                                                                    TABLE {order.table_label || order.table_id || "Dine"}
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-cream-200 text-espresso-900 font-mono">
                                                                #{order.order_number}
                                                            </span>
                                                        </div>

                                                        {/* Prominent Daily Token */}
                                                        <div className="mt-1">
                                                            <span className="text-[11px] font-bold text-espresso-500">Billing Token:</span>
                                                            <div className="mt-0.5">
                                                                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-sm font-black font-mono inline-block">
                                                                    Token #{displayToken}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Elapsed Timer & Urgency Highlight */}
                                                    <div className="space-y-1">
                                                        {!isCompleted ? (
                                                            elapsedMins < 10 ? (
                                                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>{elapsedMins}m waiting</span>
                                                                </div>
                                                            ) : elapsedMins < 20 ? (
                                                                <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>{elapsedMins}m waiting</span>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-1.5 text-xs font-black text-red-900 bg-red-100 px-2.5 py-1 rounded-lg border border-red-300 animate-pulse">
                                                                    <Flame className="w-3.5 h-3.5 text-red-600 fill-red-500" />
                                                                    <span>{elapsedMins}m DELAYED!</span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-espresso-600 bg-cream-200 px-2.5 py-1 rounded-lg">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Completed</span>
                                                            </div>
                                                        )}
                                                        <div className="text-[11px] text-espresso-400 font-medium pl-0.5">
                                                            Placed: {formatTimeOnly(order.created_at)} ({formatRelativeTime(order.created_at)})
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ZONE 2: Customer, Contact & Delivery Address */}
                                                <div className="xl:w-64 shrink-0 flex flex-col justify-between gap-3 border-b xl:border-b-0 xl:border-r border-cream-200 pb-3 xl:pb-0 xl:pr-5">
                                                    <div className="space-y-2">
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-extrabold text-espresso-950 text-sm">
                                                                    {order.customer_name || "Surya Diner"}
                                                                </span>
                                                                {order.customer_order_count && order.customer_order_count >= 5 ? (
                                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-400 flex items-center gap-0.5">
                                                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                                                        VIP ({order.customer_order_count})
                                                                    </span>
                                                                ) : order.customer_order_count && order.customer_order_count > 1 ? (
                                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                                        Repeat ({order.customer_order_count})
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            {order.customer_phone && (
                                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                                    <span className="font-mono text-xs font-bold text-espresso-700 flex items-center gap-1">
                                                                        <Phone className="w-3 h-3 text-espresso-400" />
                                                                        +91 {order.customer_phone}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <a
                                                                            href={`tel:${order.customer_phone}`}
                                                                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-emerald-100 text-espresso-700 hover:text-emerald-800 transition cursor-pointer"
                                                                            title="Call Customer"
                                                                        >
                                                                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                                                                        </a>
                                                                        <a
                                                                            href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-emerald-100 text-espresso-700 hover:text-emerald-800 transition cursor-pointer"
                                                                            title="Open WhatsApp Chat"
                                                                        >
                                                                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Delivery Address */}
                                                        {isDelivery && order.delivery_address && (
                                                            <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950">
                                                                <div className="flex items-start gap-1.5 font-medium leading-snug">
                                                                    <MapPin className="w-3.5 h-3.5 text-cyan-700 shrink-0 mt-0.5" />
                                                                    <span>{order.delivery_address}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Special Cooking Request */}
                                                        {order.customer_notes && (
                                                            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                                                                <span className="font-bold">Special Request:</span> {order.customer_notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ZONE 3: Food Items Breakdown */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                    <div>
                                                        <div className="text-xs font-black uppercase tracking-wider text-espresso-600 mb-2 flex items-center justify-between">
                                                            <span>Items ({order.items?.reduce((acc: number, it: any) => acc + (it.qty || 1), 0) || 0})</span>
                                                            <span className="text-[11px] text-espresso-400 font-normal">Kitchen Breakdown</span>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {order.items?.map((it: any) => {
                                                                let addonsList: Array<{ name: string; price_paise: number }> = [];
                                                                if (it.selected_addons_json) {
                                                                    try {
                                                                        addonsList = JSON.parse(it.selected_addons_json);
                                                                    } catch {}
                                                                }

                                                                return (
                                                                    <div
                                                                        key={it.id}
                                                                        className="p-2.5 rounded-xl bg-cream-50/80 border border-cream-200 text-xs flex flex-col justify-between"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-1.5">
                                                                            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                                                                <span className="w-5 h-5 rounded-md bg-espresso-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                                                                                    {it.qty}x
                                                                                </span>
                                                                                <span className="font-extrabold text-espresso-950 truncate">
                                                                                    {it.item_name}
                                                                                </span>
                                                                                {it.variant_name && (
                                                                                    <span className="text-[10px] font-black uppercase bg-saffron-100 text-saffron-900 border border-saffron-300 px-1.5 py-0.2 rounded-md shrink-0">
                                                                                        {it.variant_name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className="font-bold text-espresso-700 shrink-0">
                                                                                {formatRupees(it.total_price_paise)}
                                                                            </span>
                                                                        </div>

                                                                        {addonsList.length > 0 && (
                                                                            <p className="text-[10px] text-terracotta-700 font-semibold mt-1">
                                                                                + {addonsList.map((a) => a.name).join(", ")}
                                                                            </p>
                                                                        )}

                                                                        {it.notes && (
                                                                            <p className="text-[10px] text-espresso-500 italic mt-0.5">
                                                                                "{it.notes}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ZONE 4: Financials, POS Thermal Strip & 1-Click Status Action Hub */}
                                                <div className="xl:w-64 shrink-0 flex flex-col justify-between gap-3 border-t xl:border-t-0 xl:border-l border-cream-200 pt-3 xl:pt-0 xl:pl-5">
                                                    <div>
                                                        {/* Amount & Payment Status */}
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <div>
                                                                <span className="text-[11px] text-espresso-500 font-bold block">Bill Total</span>
                                                                <span className="text-lg font-black text-espresso-950 font-mono">
                                                                    {formatRupees(order.total_paise)}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                {order.payment_status === "paid" ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        PAID ({order.payment_method?.toUpperCase() || "UPI"})
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                                                            {isDelivery ? "Cash on Delivery" : "Pay at Counter"}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMarkCashPaid(order.id)}
                                                                            className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                                                        >
                                                                            Mark Paid
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Thermal POS & WhatsApp Strip */}
                                                        <div className="grid grid-cols-4 gap-1 p-1 bg-cream-100 rounded-xl border border-cream-200 mb-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => printKOT(order, outlet)}
                                                                className="py-1 px-1 rounded-lg bg-white hover:bg-cream-200 text-espresso-900 text-[10px] font-extrabold border border-cream-300 flex items-center justify-center gap-1 transition cursor-pointer"
                                                                title="Print Kitchen Order Ticket"
                                                            >
                                                                <Printer className="w-2.5 h-2.5 text-amber-600" />
                                                                KOT
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => printPOSReceipt(order, outlet)}
                                                                className="py-1 px-1 rounded-lg bg-white hover:bg-cream-200 text-espresso-900 text-[10px] font-extrabold border border-cream-300 flex items-center justify-center gap-1 transition cursor-pointer"
                                                                title="Print Customer Tax Bill"
                                                            >
                                                                <Receipt className="w-2.5 h-2.5 text-emerald-600" />
                                                                Bill
                                                            </button>
                                                            {order.customer_phone ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => dispatchCustomerWhatsApp(order, outlet)}
                                                                    className="py-1 px-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10px] font-extrabold border border-emerald-300 flex items-center justify-center gap-1 transition cursor-pointer"
                                                                    title="Send WhatsApp Invoice"
                                                                >
                                                                    <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                                                    Inv
                                                                </button>
                                                            ) : (
                                                                <div />
                                                            )}
                                                            {order.customer_phone ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => dispatchPostDiningReview(order, outlet)}
                                                                    className="py-1 px-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300 flex items-center justify-center gap-1 transition cursor-pointer"
                                                                    title="Send Google Review Invite"
                                                                >
                                                                    <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                                                    Rev
                                                                </button>
                                                            ) : (
                                                                <div />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Primary Status Workflow Action Button */}
                                                    <div className="space-y-1.5">
                                                        {isDelivery ? (
                                                            <>
                                                                {order.status === "placed" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "accepted")}
                                                                    >
                                                                        ✓ Accept Order
                                                                    </Button>
                                                                )}
                                                                {order.status === "accepted" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-saffron-600 hover:bg-saffron-700 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "preparing")}
                                                                    >
                                                                        🍳 Start Cooking
                                                                    </Button>
                                                                )}
                                                                {(order.status === "preparing" || order.status === "ready") && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-cyan-700 hover:bg-cyan-800 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "out_for_delivery")}
                                                                        rightIcon={<Bike className="w-3.5 h-3.5" />}
                                                                    >
                                                                        🛵 Dispatch Rider
                                                                    </Button>
                                                                )}
                                                                {order.status === "out_for_delivery" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "delivered")}
                                                                        rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                                                    >
                                                                        ✓ Mark Delivered
                                                                    </Button>
                                                                )}
                                                                {order.status === "delivered" && (
                                                                    <div className="text-center py-2 px-3 rounded-xl bg-cream-200 text-espresso-700 font-extrabold text-xs">
                                                                        ✓ Delivered
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {order.status === "placed" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "accepted")}
                                                                    >
                                                                        ✓ Accept Order
                                                                    </Button>
                                                                )}
                                                                {order.status === "accepted" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-saffron-600 hover:bg-saffron-700 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "preparing")}
                                                                    >
                                                                        🍳 Start Prep
                                                                    </Button>
                                                                )}
                                                                {order.status === "preparing" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "ready")}
                                                                        rightIcon={<Bell className="w-3.5 h-3.5" />}
                                                                    >
                                                                        🛎️ Mark Ready
                                                                    </Button>
                                                                )}
                                                                {order.status === "ready" && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="md"
                                                                        className="w-full py-2.5 text-xs font-black bg-espresso-900 hover:bg-espresso-800 text-white uppercase tracking-wider"
                                                                        onClick={() => handleAdvanceStatus(order.id, "served")}
                                                                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                                                                    >
                                                                        🍽️ Mark Served
                                                                    </Button>
                                                                )}
                                                                {order.status === "served" && (
                                                                    <div className="text-center py-2 px-3 rounded-xl bg-cream-200 text-espresso-700 font-extrabold text-xs">
                                                                        ✓ Served & Settled
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {order.status !== "served" && order.status !== "delivered" && order.status !== "cancelled" && (
                                                            <div className="flex justify-end pt-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCancelOrder(order.id)}
                                                                    className="text-[11px] text-espresso-400 hover:text-red-600 flex items-center gap-1 font-bold transition cursor-pointer"
                                                                    title="Cancel Order"
                                                                >
                                                                    <XCircle className="w-3 h-3" />
                                                                    Cancel Order
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ========================================================================= */
                        /* VIEW MODE 2: MULTI-COLUMN KANBAN BOARD                                   */
                        /* ========================================================================= */
                        <div className="flex-1 flex flex-col min-h-0">
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

                                                                {/* Customer Intelligence & Delivery Box */}
                                                                {(order.customer_name || order.customer_phone || isDelivery) && (
                                                                    <div className={`p-2.5 rounded-xl text-xs space-y-1.5 ${
                                                                        isDelivery
                                                                            ? "bg-cyan-50/80 border border-cyan-200"
                                                                            : "bg-amber-50/60 border border-amber-200/70"
                                                                    }`}>
                                                                        <div className="flex items-center justify-between gap-1 flex-wrap font-bold">
                                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                                <User className={`w-3.5 h-3.5 shrink-0 ${isDelivery ? "text-cyan-700" : "text-amber-700"}`} />
                                                                                <span className={`truncate text-xs ${isDelivery ? "text-cyan-950" : "text-amber-950"}`}>
                                                                                    {order.customer_name || "Surya Diner"}
                                                                                </span>
                                                                            </div>

                                                                            {/* Customer Loyalty / Repeat Order Badge */}
                                                                            {order.customer_order_count && order.customer_order_count >= 5 ? (
                                                                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-400 flex items-center gap-0.5">
                                                                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                                                                    VIP ({order.customer_order_count} Orders)
                                                                                </span>
                                                                            ) : order.customer_order_count && order.customer_order_count > 1 ? (
                                                                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                                                    Returning ({order.customer_order_count})
                                                                                </span>
                                                                            ) : order.customer_order_count === 1 ? (
                                                                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-900 border border-blue-200">
                                                                                    New Diner
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {/* Phone & 1-Click Communications */}
                                                                        {order.customer_phone && (
                                                                            <div className="flex items-center justify-between gap-2 pt-0.5">
                                                                                <span className="font-mono text-[11px] font-bold text-espresso-700 flex items-center gap-1">
                                                                                    <Phone className="w-3 h-3 text-espresso-400" />
                                                                                    +91 {order.customer_phone}
                                                                                </span>
                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                    <a
                                                                                        href={`tel:${order.customer_phone}`}
                                                                                        className="p-1 rounded-md bg-white border border-cream-300 hover:bg-cream-100 text-espresso-700 transition"
                                                                                        title="Call Diner"
                                                                                    >
                                                                                        <PhoneCall className="w-3 h-3 text-emerald-600" />
                                                                                    </a>
                                                                                    <a
                                                                                        href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="p-1 rounded-md bg-white border border-cream-300 hover:bg-emerald-50 text-espresso-700 transition"
                                                                                        title="Open WhatsApp Chat"
                                                                                    >
                                                                                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                                                                                    </a>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Delivery Address (if Delivery order) */}
                                                                        {isDelivery && order.delivery_address && (
                                                                            <p className="text-[11px] text-cyan-900 flex items-start gap-1 leading-snug pt-1 border-t border-cyan-200/60">
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
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
