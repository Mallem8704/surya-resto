"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ChefHat,
    Clock,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    CheckSquare,
    Square,
    RefreshCw,
    Utensils,
    Flame,
    ArrowRight,
    AlertTriangle,
    Bike,
    Truck,
    Printer,
    Volume2,
    VolumeX,
    Bell,
} from "lucide-react";
import { printKOT } from "@/lib/thermalPrint";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAdminSocket } from "@/hooks/useSockets";
import { soundManager } from "@/lib/sound";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";

function parseUtcDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const normalized = dateStr.includes("Z") || dateStr.includes("+") ? dateStr : `${dateStr}Z`;
    return new Date(normalized);
}

function getElapsedSeconds(dateStr: string): number {
    if (!dateStr) return 0;
    const orderTime = parseUtcDate(dateStr).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - orderTime) / 1000));
}

function formatElapsed(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function KitchenDisplaySystemPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { t } = useLanguage();
    const toast = useToast();
    const router = useRouter();
    const { outlet } = useOutlet();

    const [orders, setOrders] = useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [pendingServiceCalls, setPendingServiceCalls] = useState<any[]>([]);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [showReady, setShowReady] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    // Fetch Active Orders
    const fetchOrders = useCallback(async () => {
        setIsLoadingOrders(true);
        try {
            const [ordersResult, callsResult] = await Promise.allSettled([
                api.getOrders({ outlet_id: outlet?.id }),
                api.getServiceCalls("pending", outlet?.id),
            ]);
            if (ordersResult.status === "fulfilled" && Array.isArray(ordersResult.value)) {
                setOrders(ordersResult.value);
            }
            if (callsResult.status === "fulfilled" && Array.isArray(callsResult.value)) {
                setPendingServiceCalls(callsResult.value);
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

    // Timer Ticker every 1s
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // WebSocket Hook
    const { isConnected: wsConnected } = useAdminSocket(outlet?.id || 1, (event) => {
        if (event.event === "new_order" && event.data) {
            if (soundEnabled) {
                soundManager.playNewOrderChime();
            }
            setOrders((prev) => [event.data, ...prev.filter((o) => o.id !== event.data.id)]);
            toast.success(`New Kitchen Ticket #${event.data.order_number} for Table ${event.data.table_label}`);
        } else if ((event.event === "order_status_updated" || event.event === "order_updated") && event.data) {
            setOrders((prev) =>
                prev.map((o) => (o.id === event.data.id ? { ...o, status: event.data.status } : o))
            );
        } else if (event.event === "service_call" && event.data) {
            if (soundEnabled) {
                soundManager.playServiceCallAlert();
            }
            setPendingServiceCalls((prev) => {
                if (prev.some((c) => c.id === event.data.id)) return prev;
                return [...prev, event.data];
            });
        }
    });

    const toggleItemCheck = (orderId: number, itemId: number) => {
        const key = `${orderId}_${itemId}`;
        setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleUpdateStatus = async (orderId: number, newStatus: string) => {
        try {
            await api.updateOrderStatus(orderId, newStatus);
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );
            toast.success(`Ticket status updated to ${newStatus}`);
        } catch {
            toast.error("Failed to update ticket status");
        }
    };

    // Filter orders to show only active kitchen tickets
    const kdsOrders = orders.filter((o) => {
        if (showReady) {
            return ["placed", "preparing", "ready"].includes(o.status);
        }
        return ["placed", "preparing"].includes(o.status);
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-espresso-950 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-saffron-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-espresso-950 flex font-sans">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <AdminHeader
                    pendingServiceCalls={pendingServiceCalls}
                    wsConnected={wsConnected}
                    onAttendServiceCall={async (id) => {
                        try {
                            await api.attendServiceCall(id);
                            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== id));
                        } catch (err) {
                            console.error("Failed to attend service call", err);
                        }
                    }}
                />

                {/* Subheader Toolbar */}
                <div className="p-4 sm:p-5 bg-espresso-900 border-b border-espresso-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-400 shrink-0">
                            <ChefHat className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2.5">
                                <span>Kitchen Display System (KDS)</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-saffron-500/20 text-saffron-300 font-extrabold border border-saffron-500/30">
                                    {kdsOrders.length} Active Tickets
                                </span>
                            </h2>
                            <p className="text-xs text-espresso-300 font-medium">
                                High-visibility line prep board • Real-time 10-foot glanceability
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Audio Chime Toggle */}
                        <button
                            type="button"
                            onClick={() => {
                                const next = !soundEnabled;
                                setSoundEnabled(next);
                                if (next) soundManager.playNewOrderChime();
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                soundEnabled
                                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                                    : "bg-espresso-800 border-espresso-700 text-espresso-400 hover:text-white"
                            }`}
                            title="Toggle Kitchen Order Chime"
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                            <span>{soundEnabled ? "Chime: ON" : "Chime: MUTE"}</span>
                        </button>

                        <label className="flex items-center gap-2 text-xs font-bold text-espresso-300 cursor-pointer select-none bg-espresso-800/60 px-3 py-1.5 rounded-xl border border-espresso-700">
                            <input
                                type="checkbox"
                                checked={showReady}
                                onChange={(e) => setShowReady(e.target.checked)}
                                className="w-4 h-4 rounded-md accent-saffron-500 cursor-pointer"
                            />
                            <span>Show Ready</span>
                        </label>

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-espresso-800 text-white border-espresso-700 hover:bg-espresso-700 cursor-pointer"
                            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                            onClick={fetchOrders}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* KDS Tickets Grid */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-espresso-950">
                    {isLoadingOrders ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-64 rounded-3xl bg-espresso-900/60 border border-espresso-800 animate-pulse p-5 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="h-6 w-28 bg-espresso-800 rounded-lg" />
                                        <div className="h-4 w-36 bg-espresso-800/60 rounded-md" />
                                        <div className="space-y-2 pt-4">
                                            <div className="h-4 w-full bg-espresso-800/40 rounded" />
                                            <div className="h-4 w-3/4 bg-espresso-800/40 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-10 w-full bg-espresso-800 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : kdsOrders.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center text-espresso-400 text-center border-2 border-dashed border-espresso-800 rounded-3xl p-8">
                            <Utensils className="w-16 h-16 mb-4 opacity-30 text-saffron-400" />
                            <h3 className="text-lg font-bold text-white">All Kitchen Orders Cleared!</h3>
                            <p className="text-xs text-espresso-400 mt-1 max-w-sm">
                                No tickets currently pending in the kitchen. New incoming QR orders will appear here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                            {kdsOrders.map((order) => {
                                const elapsed = getElapsedSeconds(order.created_at);
                                const isOverdue = elapsed > 900; // > 15m
                                const isWarning = elapsed > 420 && elapsed <= 900; // 7-15m

                                return (
                                    <div
                                        key={order.id}
                                        className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                                            isOverdue
                                                ? "bg-espresso-900 border-red-500/90 ring-2 ring-red-500/40 shadow-red-500/10"
                                                : order.status === "preparing"
                                                ? "bg-espresso-900 border-saffron-500/70 ring-2 ring-saffron-500/20"
                                                : order.status === "ready"
                                                ? "bg-espresso-900/90 border-emerald-500/70"
                                                : "bg-espresso-900 border-espresso-700"
                                        }`}
                                    >
                                        {/* Ticket Top Banner - 10-Foot Glanceability Header */}
                                        <div>
                                            <div className="p-4 bg-espresso-800/95 border-b border-espresso-700 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {order.order_type === "delivery" ? (
                                                        <span className="text-sm font-black px-3.5 py-1.5 rounded-xl bg-cyan-600 text-white shadow-md flex items-center gap-1.5 tracking-wide">
                                                            <Bike className="w-4 h-4" />
                                                            DELIVERY
                                                        </span>
                                                    ) : (
                                                        <span className="text-base font-black px-3.5 py-1.5 rounded-xl bg-terracotta-500 text-white shadow-md tracking-wide">
                                                            Table {order.table_label || `T${order.table_id}`}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-mono font-bold text-espresso-300">
                                                        #{order.order_number.slice(-6)}
                                                    </span>
                                                </div>

                                                {/* Elapsed Timer with Urgency Color Psychology */}
                                                <div
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black border tracking-wider ${
                                                        isOverdue
                                                            ? "bg-red-950 border-red-500 text-red-200 animate-pulse shadow-md shadow-red-500/30"
                                                            : isWarning
                                                            ? "bg-amber-950 border-amber-500 text-amber-300"
                                                            : "bg-emerald-950 border-emerald-500 text-emerald-300"
                                                    }`}
                                                >
                                                    {isOverdue ? (
                                                        <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                                                    ) : (
                                                        <Clock className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>{formatElapsed(elapsed)}</span>
                                                    {isOverdue && <span className="text-[10px] uppercase font-black">RUSH</span>}
                                                </div>
                                            </div>

                                            {/* Checklist of Items */}
                                            <div className="p-5 space-y-3">
                                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-espresso-400 flex items-center justify-between">
                                                    <span>Items Checklist ({order.items?.length || 0})</span>
                                                    <span className="text-[10px] text-espresso-500">Tap to cross out</span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {order.items?.map((it: any) => {
                                                        const isChecked = checkedItems[`${order.id}_${it.id}`];

                                                        return (
                                                            <div
                                                                key={it.id}
                                                                onClick={() => toggleItemCheck(order.id, it.id)}
                                                                className={`p-3.5 rounded-2xl border cursor-pointer select-none transition flex items-start gap-3.5 ${
                                                                    isChecked
                                                                        ? "bg-espresso-950/80 border-espresso-800 text-espresso-500 opacity-50 line-through"
                                                                        : "bg-espresso-800/90 border-espresso-700 text-white hover:border-saffron-500 hover:bg-espresso-800"
                                                                }`}
                                                            >
                                                                <div className="shrink-0 mt-0.5">
                                                                    {isChecked ? (
                                                                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                                                                    ) : (
                                                                        <Square className="w-5 h-5 text-espresso-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                                        <span className="text-base font-black tracking-tight">
                                                                            {it.qty}x {it.item_name}
                                                                        </span>
                                                                        {it.variant_name && (
                                                                            <span className="text-xs font-black uppercase tracking-wider bg-saffron-400 text-espresso-950 px-2 py-0.5 rounded-md shadow-xs">
                                                                                {it.variant_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {it.selected_addons_json && (() => {
                                                                        try {
                                                                            const addons = JSON.parse(it.selected_addons_json);
                                                                            if (Array.isArray(addons) && addons.length > 0) {
                                                                                return (
                                                                                    <div className="text-xs font-bold text-saffron-300 mt-1 pl-1">
                                                                                        + {addons.map((a: any) => a.name).join(", ")}
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        } catch {}
                                                                        return null;
                                                                    })()}
                                                                    {it.notes && (
                                                                        <span className="text-xs text-saffron-300 font-bold flex items-center gap-1 mt-1 bg-saffron-950/60 px-2 py-0.5 rounded-lg border border-saffron-500/30">
                                                                            <AlertTriangle className="w-3.5 h-3.5 text-saffron-400 shrink-0" />
                                                                            <span>{it.notes}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Customer Instructions */}
                                                {order.customer_notes && (
                                                    <div className="p-3.5 rounded-2xl bg-espresso-950 border border-saffron-500/40 text-xs text-saffron-200">
                                                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-saffron-400 block mb-1 flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            Special Customer Request:
                                                        </span>
                                                        <p className="font-semibold italic">&ldquo;{order.customer_notes}&rdquo;</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="p-4 bg-espresso-900 border-t border-espresso-800 flex items-center gap-2">
                                            {/* 1-Tap KOT Thermal Print */}
                                            <button
                                                onClick={() => printKOT(order, outlet)}
                                                className="p-3 rounded-xl bg-espresso-800 hover:bg-espresso-700 text-espresso-300 hover:text-white border border-espresso-700 transition flex items-center justify-center shrink-0 cursor-pointer"
                                                title="Print Physical KOT Slip"
                                            >
                                                <Printer className="w-4 h-4 text-amber-400" />
                                            </button>

                                            {order.status === "placed" ? (
                                                <Button
                                                    size="md"
                                                    className="flex-1 bg-saffron-500 hover:bg-saffron-400 text-espresso-950 font-black cursor-pointer shadow-md"
                                                    leftIcon={<Flame className="w-4 h-4" />}
                                                    onClick={() => handleUpdateStatus(order.id, "preparing")}
                                                >
                                                    Start Preparing
                                                </Button>
                                            ) : order.status === "preparing" ? (
                                                <Button
                                                    size="md"
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-md"
                                                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                                                    onClick={() => handleUpdateStatus(order.id, "ready")}
                                                >
                                                    Mark as Ready
                                                </Button>
                                            ) : (
                                                <div className="flex-1 text-center py-2 text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded-xl">
                                                    Ready for Serving / Packing
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
