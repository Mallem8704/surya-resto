"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Users,
    Clock,
    Plus,
    Minus,
    Trash2,
    Search,
    RefreshCw,
    ChefHat,
    Printer,
    ArrowRight,
    ArrowLeftRight,
    CheckCircle2,
    AlertCircle,
    Bell,
    Phone,
    X,
    QrCode,
    Utensils,
    Flame,
    Coffee,
    Sparkles,
    Shield,
    Bike,
    Smartphone,
    Download,
    Share2,
    Layers,
    Banknote,
    CreditCard,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupees, formatRelativeTime } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import { useOutlet } from "@/context/OutletContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAdminSocket, SocketEvent } from "@/hooks/useSockets";
import { printKOT, printRunningKOT, printPOSReceipt } from "@/lib/thermalPrint";
import { soundManager } from "@/lib/sound";
import { PaymentSettlementModal } from "@/components/admin/PaymentSettlementModal";

interface CafeTableData {
    id: number;
    label: string;
    status: "available" | "occupied" | "reserved" | "billing";
    outlet_id: number;
}

interface MenuItemData {
    id: number;
    name: string;
    name_te?: string;
    price_paise: number;
    category_id: number;
    is_veg: boolean;
    is_available: boolean;
    has_variants?: boolean;
    variants?: Array<{ id: number; name: string; price_paise: number }>;
    addons?: Array<{ id: number; name: string; price_paise: number }>;
}

const QUICK_NOTES = [
    "Extra Spicy",
    "Medium Spicy",
    "Less Spicy",
    "Separate Salan Gravy",
    "Extra Garlic Mayo",
    "Extra Lemon & Onion",
    "Crispy Meat",
    "Serve Hot",
];

export default function CaptainWaiterPage() {
    const router = useRouter();
    const toast = useToast();
    const { user, isAuthenticated, isOwner } = useAuth();
    const { outlet, refreshOutlet } = useOutlet();
    const { language, t } = useLanguage();

    // Floor state
    const [tables, setTables] = useState<CafeTableData[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [serviceCalls, setServiceCalls] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selected Branch
    const [selectedOutletId, setSelectedOutletId] = useState<number>(outlet?.id || 1);

    // Table Filter
    const [tableFilter, setTableFilter] = useState<"all" | "occupied" | "available" | "calls">("all");
    const [tableSearch, setTableSearch] = useState("");

    // Active Table Modal state
    const [selectedTable, setSelectedTable] = useState<CafeTableData | null>(null);
    const [tableOrder, setTableOrder] = useState<any | null>(null);

    // Punch-in / Menu Sheet state
    const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [cartItems, setCartItems] = useState<
        Array<{
            item_id: number;
            name: string;
            variant_id?: number;
            variant_name?: string;
            addon_ids?: number[];
            price_paise: number;
            qty: number;
            notes?: string;
        }>
    >([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

    // Table Transfer Modal state
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTargetTableId, setTransferTargetTableId] = useState<number | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

    // PWA Install State for Staff Phones
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
                setIsStandalone(true);
            }
            const handleBeforeInstall = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
            };
            window.addEventListener("beforeinstallprompt", handleBeforeInstall);
            return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === "accepted") {
                setIsStandalone(true);
                toast.success("Surya Captain App installed successfully!");
            }
            setDeferredPrompt(null);
        } else {
            setShowInstallModal(true);
        }
    };

    // Load initial data
    const loadFloorData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tablesRes, ordersRes, catsRes, itemsRes, callsRes] = await Promise.allSettled([
                api.getTables(selectedOutletId),
                api.getOrders({
                    outlet_id: selectedOutletId,
                    status: "placed,accepted,preparing,ready,served",
                    order_type: "dine_in",
                }),
                api.getCategories(true, selectedOutletId),
                api.getMenu(selectedOutletId),
                api.getServiceCalls("pending"),
            ]);

            // Tables: Use API result or fallback to 10 standard tables
            if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value) && tablesRes.value.length > 0) {
                setTables(tablesRes.value);
            } else {
                const fallbackTables: CafeTableData[] = Array.from({ length: 10 }, (_, i) => ({
                    id: i + 1,
                    label: `T${i + 1}`,
                    status: "available",
                    outlet_id: selectedOutletId,
                }));
                setTables(fallbackTables);
            }

            // Orders
            if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
                setActiveOrders(ordersRes.value);
            } else {
                setActiveOrders([]);
            }

            // Categories
            if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
                setCategories(catsRes.value);
            }

            // Menu Items
            if (itemsRes.status === "fulfilled" && Array.isArray(itemsRes.value)) {
                setMenuItems(itemsRes.value);
            }

            // Service Calls
            if (callsRes.status === "fulfilled" && Array.isArray(callsRes.value)) {
                setServiceCalls(callsRes.value);
            } else {
                setServiceCalls([]);
            }
        } catch (err: any) {
            console.error("Failed to load Captain floor data:", err);
            // Ensure tables are always populated and visible
            setTables(
                Array.from({ length: 10 }, (_, i) => ({
                    id: i + 1,
                    label: `T${i + 1}`,
                    status: "available",
                    outlet_id: selectedOutletId,
                }))
            );
        } finally {
            setIsLoading(false);
        }
    }, [selectedOutletId]);

    useEffect(() => {
        loadFloorData();
    }, [loadFloorData]);

    // WebSocket real-time updates
    const handleWsEvent = useCallback(
        (event: SocketEvent) => {
            if (event.event === "new_order" || event.event === "order_status_updated" || event.event === "running_kot_added") {
                loadFloorData();
                soundManager.playNewOrderChime();
            } else if (event.event === "service_call") {
                loadFloorData();
                soundManager.playServiceCallAlert();
                toast.info(`🔔 Service Call from Table #${event.data?.table_id || "N/A"}`);
            }
        },
        [loadFloorData, toast]
    );

    useAdminSocket(selectedOutletId, handleWsEvent);

    // Helper: Find active order for a table
    const getOrderForTable = (tableId: number) => {
        return activeOrders.find((o) => o.table_id === tableId && o.status !== "cancelled" && o.status !== "delivered");
    };

    // Open table details
    const handleTableClick = (table: CafeTableData) => {
        setSelectedTable(table);
        const order = getOrderForTable(table.id);
        setTableOrder(order || null);
        setCartItems([]);
    };

    // Attend Service Call
    const handleAttendServiceCall = async (callId: number) => {
        try {
            await api.attendServiceCall(callId);
            setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
            toast.success("Service call cleared");
        } catch (err: any) {
            toast.error("Failed to clear service call");
        }
    };

    // Add Item to Captain Cart
    const handleAddItemToCart = (item: MenuItemData, variant?: { id: number; name: string; price_paise: number }) => {
        soundManager.playAddToCartPop();
        const price = variant ? variant.price_paise : item.price_paise;
        const variantId = variant?.id;
        const variantName = variant?.name;

        setCartItems((prev) => {
            const existingIdx = prev.findIndex(
                (ci) => ci.item_id === item.id && ci.variant_id === variantId
            );
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx].qty += 1;
                return updated;
            }
            return [
                ...prev,
                {
                    item_id: item.id,
                    name: item.name,
                    variant_id: variantId,
                    variant_name: variantName,
                    price_paise: price,
                    qty: 1,
                    notes: "",
                },
            ];
        });
    };

    // Update Cart Qty
    const handleUpdateCartQty = (idx: number, delta: number) => {
        setCartItems((prev) => {
            const updated = [...prev];
            updated[idx].qty += delta;
            if (updated[idx].qty <= 0) {
                return updated.filter((_, i) => i !== idx);
            }
            return updated;
        });
    };

    // Add quick note to cart item
    const handleAddNoteToCartItem = (idx: number, note: string) => {
        setCartItems((prev) => {
            const updated = [...prev];
            const current = updated[idx].notes || "";
            if (!current) {
                updated[idx].notes = note;
            } else if (!current.includes(note)) {
                updated[idx].notes = `${current}, ${note}`;
            }
            return updated;
        });
    };

    // Submit Order (New or Running KOT Append)
    const handleSubmitKitchenKOT = async () => {
        if (!selectedTable || cartItems.length === 0) return;
        setIsSubmittingOrder(true);
        try {
            if (tableOrder) {
                // Running KOT Append to existing active order
                const res = await api.appendOrderItems(
                    tableOrder.id,
                    cartItems.map((ci) => ({
                        item_id: ci.item_id,
                        variant_id: ci.variant_id,
                        qty: ci.qty,
                        notes: ci.notes,
                    }))
                );
                toast.success(`🔥 Running KOT dispatched to Kitchen for Table ${selectedTable.label}!`);
                soundManager.playNewOrderChime();

                // Print Running KOT
                printRunningKOT(
                    res,
                    cartItems.map((ci) => ({
                        item_name: ci.name,
                        variant_name: ci.variant_name,
                        qty: ci.qty,
                        notes: ci.notes,
                    })),
                    outlet,
                    user?.name || "Captain"
                );

                setTableOrder(res);
            } else {
                // New Order Creation for this Table
                const res = await api.createOrder({
                    table_id: selectedTable.id,
                    outlet_id: selectedOutletId,
                    order_type: "dine_in",
                    payment_method: "counter",
                    items: cartItems.map((ci) => ({
                        item_id: ci.item_id,
                        variant_id: ci.variant_id,
                        qty: ci.qty,
                        notes: ci.notes,
                    })),
                });
                toast.success(`🔥 New KOT sent to Kitchen for Table ${selectedTable.label}!`);
                soundManager.playNewOrderChime();

                // Print Kitchen KOT
                printKOT(res, outlet);
                setTableOrder(res);
            }

            setCartItems([]);
            setIsMenuSheetOpen(false);
            loadFloorData();
        } catch (err: any) {
            toast.error(err.message || "Failed to dispatch KOT");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Transfer Table
    const handleTransferTable = async () => {
        if (!tableOrder || !transferTargetTableId) return;
        setIsTransferring(true);
        try {
            const res = await api.transferOrderTable(tableOrder.id, transferTargetTableId);
            toast.success(`Order transferred to Table #${transferTargetTableId}`);
            setIsTransferModalOpen(false);
            setSelectedTable(null);
            setTableOrder(null);
            loadFloorData();
        } catch (err: any) {
            toast.error(err.message || "Failed to transfer table");
        } finally {
            setIsTransferring(false);
        }
    };

    // Filtered Tables
    const filteredTables = useMemo(() => {
        return tables.filter((t) => {
            const hasCall = serviceCalls.some((c) => c.table_id === t.id);
            const activeOrd = getOrderForTable(t.id);
            const isOccupied = !!activeOrd || t.status === "occupied";

            if (tableFilter === "occupied" && !isOccupied) return false;
            if (tableFilter === "available" && isOccupied) return false;
            if (tableFilter === "calls" && !hasCall) return false;

            if (tableSearch.trim()) {
                const q = tableSearch.toLowerCase();
                return t.label.toLowerCase().includes(q) || `${t.id}`.includes(q);
            }
            return true;
        });
    }, [tables, activeOrders, serviceCalls, tableFilter, tableSearch]);

    // Filtered Menu Items
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter((it) => {
            if (selectedCategory !== "all" && it.category_id !== selectedCategory) return false;
            if (menuSearch.trim()) {
                const q = menuSearch.toLowerCase();
                return (
                    it.name.toLowerCase().includes(q) ||
                    (it.name_te && it.name_te.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [menuItems, selectedCategory, menuSearch]);

    const cartTotalPaise = cartItems.reduce((acc, ci) => acc + ci.price_paise * ci.qty, 0);

    return (
        <div className="min-h-screen bg-[#0f0d0a] text-white flex flex-col font-sans pb-20">
            {/* TOP CAPTAIN HEADER BAR */}
            <header className="sticky top-0 z-40 bg-[#171410] border-b border-white/10 px-4 py-3 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white">
                        <Smartphone className="w-5 h-5 text-amber-400" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black text-white leading-tight">Captain Waiter POS</h1>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                                Floor Handheld
                            </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                            {outlet?.name || "Surya Family Restaurant"} • Floor Captain
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Branch Switcher Pill (Owners/SuperAdmin only; Staff locked to assigned branch) */}
                    {isOwner ? (
                        <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
                            <button
                                onClick={() => setSelectedOutletId(1)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    selectedOutletId === 1 ? "bg-amber-500 text-black" : "text-white/60"
                                }`}
                                title="Switch to Surya Family Restaurant (Kadiri)"
                            >
                                Surya
                            </button>
                            <button
                                onClick={() => setSelectedOutletId(2)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    selectedOutletId === 2 ? "bg-emerald-500 text-black" : "text-white/60"
                                }`}
                                title="Switch to Branch 2"
                            >
                                B2
                            </button>
                        </div>
                    ) : (
                        <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>B{user?.outlet_id || 1} • Surya Family Restaurant</span>
                        </div>
                    )}

                    {/* 1-Tap App Install Button */}
                    {!isStandalone && (
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
                            title="Install Captain App on Phone"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Install App</span>
                            <span className="sm:hidden">Install</span>
                        </button>
                    )}

                    <button
                        onClick={loadFloorData}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer"
                        title="Refresh Floor"
                    >
                        <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>

            {/* PENDING SERVICE CALLS ALERT BANNER */}
            {serviceCalls.length > 0 && (
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 border-b border-blue-400/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg animate-pulse">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-300 fill-blue-300 shrink-0" />
                        <span className="text-xs font-black text-white">
                            {serviceCalls.length} Pending Table Service Calls:
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto">
                            {serviceCalls.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleAttendServiceCall(c.id)}
                                    className="px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-black text-[10px] font-extrabold cursor-pointer"
                                >
                                    Table #{c.table_id} ({c.call_type || "Call"}) ✓ Clear
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FLOOR FILTER & SEARCH CONTROLS */}
            <div className="p-4 space-y-3 border-b border-white/5 bg-[#14110d]">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Quick search tables (e.g. T1, T4)..."
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-hidden focus:border-amber-500"
                        />
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: "all", label: `All Tables (${tables.length})` },
                        {
                            id: "occupied",
                            label: `🟡 Dining (${activeOrders.length})`,
                            activeClass: "bg-amber-500 text-black",
                        },
                        {
                            id: "available",
                            label: `🟢 Available (${Math.max(0, tables.length - activeOrders.length)})`,
                            activeClass: "bg-emerald-500 text-black",
                        },
                        {
                            id: "calls",
                            label: `🔔 Calls (${serviceCalls.length})`,
                            activeClass: "bg-blue-500 text-white",
                        },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setTableFilter(f.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition cursor-pointer ${
                                tableFilter === f.id
                                    ? f.activeClass || "bg-amber-500 text-black"
                                    : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLES GRID (FLOOR PLAN) */}
            <main className="flex-1 p-4">
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filteredTables.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">No tables match your filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredTables.map((table) => {
                            const order = getOrderForTable(table.id);
                            const billCall = serviceCalls.find((c) => c.table_id === table.id && c.call_type === "bill");
                            const otherCall = serviceCalls.find((c) => c.table_id === table.id && c.call_type !== "bill");
                            const isOccupied = !!order || table.status === "occupied";

                            return (
                                <div
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={`relative p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[150px] ${
                                        billCall
                                            ? "border-amber-400 bg-amber-950/60 shadow-xl shadow-amber-500/20 animate-pulse"
                                            : otherCall
                                            ? "border-blue-400 bg-blue-950/40 shadow-lg shadow-blue-500/20"
                                            : isOccupied
                                            ? "border-amber-500/80 bg-amber-950/20 shadow-md shadow-amber-500/10 hover:border-amber-400"
                                            : "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400"
                                    }`}
                                >
                                    {/* Top Status Indicators */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black font-mono text-white">
                                            {table.label}
                                        </span>
                                        {billCall ? (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                <span>🧾 Bill</span>
                                            </span>
                                        ) : otherCall ? (
                                            <span className="p-1 rounded-md bg-blue-500 text-black">
                                                <Bell className="w-3.5 h-3.5 fill-black" />
                                            </span>
                                        ) : isOccupied ? (
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                                        ) : (
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        )}
                                    </div>

                                    {/* Order Snapshot */}
                                    {order ? (
                                        <div className="space-y-1 my-auto">
                                            <p className="text-sm font-black text-amber-300 font-mono">
                                                {formatRupees(order.total_paise)}
                                            </p>
                                            <p className="text-[10px] text-white/70">
                                                {order.items?.length || 0} items •{" "}
                                                <span className="capitalize font-bold text-amber-400">
                                                    {order.status}
                                                </span>
                                            </p>
                                            <p className="text-[9px] text-white/40 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatRelativeTime(order.created_at)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="my-auto text-center">
                                            <p className="text-[11px] font-bold text-emerald-400">Vacant</p>
                                            <p className="text-[9px] text-white/40">Tap to Punch Order</p>
                                        </div>
                                    )}

                                    {/* Bottom Quick Button */}
                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                                        {isOccupied && order ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTable(table);
                                                    setTableOrder(order);
                                                    setIsSettlementModalOpen(true);
                                                }}
                                                className="w-full py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black flex items-center justify-center gap-1 shadow-sm transition"
                                            >
                                                <CreditCard className="w-3 h-3" />
                                                <span>Settle Bill</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-emerald-400">Available</span>
                                                <ArrowRight className="w-3 h-3 text-white/50" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* TABLE ACTION DRAWER / MODAL */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedTable(null)}
                    />

                    <div className="relative w-full max-w-md bg-[#16130f] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-white/10">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1c1813]">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white">{selectedTable.label}</h3>
                                    <span
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            tableOrder
                                                ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                        }`}
                                    >
                                        {tableOrder ? "Occupied Dining" : "Available"}
                                    </span>
                                </div>
                                {tableOrder && (
                                    <p className="text-xs text-white/60 font-mono mt-0.5">
                                        Order #{tableOrder.order_number} • {formatRelativeTime(tableOrder.created_at)}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedTable(null)}
                                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {tableOrder ? (
                                <div className="space-y-4">
                                    {/* Existing Items in Order */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-white/60 mb-2">
                                            <span>Current Placed Items</span>
                                            <span>{tableOrder.items?.length || 0} dishes</span>
                                        </div>
                                        <div className="space-y-2">
                                            {tableOrder.items?.map((it: any) => (
                                                <div
                                                    key={it.id}
                                                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <p className="font-bold text-white">
                                                            {it.item_name}{" "}
                                                            <span className="text-amber-400 font-mono">x{it.qty}</span>
                                                        </p>
                                                        {it.variant_name && (
                                                            <span className="text-[10px] text-amber-300/80">
                                                                Portion: {it.variant_name}
                                                            </span>
                                                        )}
                                                        {it.notes && (
                                                            <p className="text-[10px] text-rose-300">
                                                                Note: {it.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="font-mono font-bold text-white">
                                                        {formatRupees(it.total_price_paise)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bill Summary */}
                                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-white/60">
                                            <span>Subtotal</span>
                                            <span className="font-mono">{formatRupees(tableOrder.subtotal_paise)}</span>
                                        </div>
                                        <div className="flex justify-between text-white/60">
                                            <span>GST Tax</span>
                                            <span className="font-mono">{formatRupees(tableOrder.tax_paise)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-black text-amber-400 pt-1.5 border-t border-white/10">
                                            <span>Running Total</span>
                                            <span className="font-mono">{formatRupees(tableOrder.total_paise)}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Active Table */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => setIsSettlementModalOpen(true)}
                                            className="col-span-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            <span>Settle Table Bill (Dynamic UPI / Cash / Split)</span>
                                        </button>

                                        <button
                                            onClick={() => setIsMenuSheetOpen(true)}
                                            className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Items (Running KOT)</span>
                                        </button>

                                        <button
                                            onClick={() => setIsTransferModalOpen(true)}
                                            className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 cursor-pointer"
                                        >
                                            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                                            <span>Transfer Table</span>
                                        </button>

                                        <button
                                            onClick={() => printKOT(tableOrder, outlet)}
                                            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4 text-amber-400" />
                                            <span>Reprint KOT</span>
                                        </button>

                                        <button
                                            onClick={() => printPOSReceipt(tableOrder, outlet)}
                                            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4 text-emerald-400" />
                                            <span>Print Bill</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                                        <Utensils className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-white">Table is Available</h4>
                                        <p className="text-xs text-white/50 max-w-xs mx-auto mt-1">
                                            Guests are seated? Punch in their first round of Mandi, Biryani, and beverages.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setIsMenuSheetOpen(true)}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Start New Order for {selectedTable.label}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* WAITER FAST PUNCH-IN / MENU SELECTOR SHEET */}
            {isMenuSheetOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-[#120f0c] animate-in slide-in-from-bottom duration-300">
                    {/* Header */}
                    <div className="px-4 py-3 bg-[#1a1612] border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMenuSheetOpen(false)}
                                className="p-1.5 rounded-xl bg-white/5 text-white/70 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div>
                                <h3 className="text-sm font-black text-white">
                                    {tableOrder ? `Running KOT • ${selectedTable?.label}` : `New Order • ${selectedTable?.label}`}
                                </h3>
                                <p className="text-[10px] text-amber-400 font-bold">
                                    {cartItems.length} items to dispatch
                                </p>
                            </div>
                        </div>

                        {cartItems.length > 0 && (
                            <button
                                onClick={handleSubmitKitchenKOT}
                                disabled={isSubmittingOrder}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                <Flame className="w-4 h-4 text-black" />
                                <span>{isSubmittingOrder ? "Dispatching..." : `Send KOT (${formatRupees(cartTotalPaise)})`}</span>
                            </button>
                        )}
                    </div>

                    {/* Search & Category Pills */}
                    <div className="p-3 bg-[#16120e] border-b border-white/5 space-y-2">
                        <div className="relative">
                            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search dishes (e.g. Mandi, Naan, 65, Chai)..."
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-hidden focus:border-amber-500"
                            />
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                                    selectedCategory === "all"
                                        ? "bg-amber-500 text-black"
                                        : "bg-white/5 text-white/60 border border-white/10"
                                }`}
                            >
                                All Categories
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                                        selectedCategory === cat.id
                                            ? "bg-amber-500 text-black"
                                            : "bg-white/5 text-white/60 border border-white/10"
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Menu Items List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                        {filteredMenuItems.map((item) => (
                            <div
                                key={item.id}
                                className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    item.is_veg ? "bg-emerald-400" : "bg-red-400"
                                                }`}
                                            />
                                            <h4 className="text-xs font-black text-white">{item.name}</h4>
                                        </div>
                                        {item.name_te && (
                                            <p className="text-[10px] text-white/40">{item.name_te}</p>
                                        )}
                                        <p className="text-xs font-mono font-bold text-amber-400 mt-1">
                                            {formatRupees(item.price_paise)}
                                        </p>
                                    </div>

                                    {/* Add button or Variants */}
                                    {item.has_variants && item.variants && item.variants.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                            {item.variants.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => handleAddItemToCart(item, v)}
                                                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400/30 text-[10px] font-black transition cursor-pointer"
                                                >
                                                    + {v.name} ({formatRupees(v.price_paise)})
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAddItemToCart(item)}
                                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition cursor-pointer"
                                        >
                                            + Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Staged Cart Items Bar at Bottom */}
                    {cartItems.length > 0 && (
                        <div className="p-3 bg-[#181410] border-t border-white/10 space-y-2 pb-safe shrink-0">
                            <div className="flex items-center justify-between text-xs font-bold text-white/70">
                                <span>Staged for KOT ({cartItems.length})</span>
                                <span className="font-mono text-amber-400">{formatRupees(cartTotalPaise)}</span>
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-1.5">
                                {cartItems.map((ci, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex-1 pr-2">
                                            <p className="font-bold text-white leading-tight">
                                                {ci.name} {ci.variant_name ? `(${ci.variant_name})` : ""}
                                            </p>
                                            {ci.notes && (
                                                <p className="text-[10px] text-amber-300">Note: {ci.notes}</p>
                                            )}
                                        </div>

                                        {/* Quick Note Pills */}
                                        <div className="flex items-center gap-1">
                                            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => handleUpdateCartQty(idx, -1)}
                                                    className="w-5 h-5 rounded bg-white/10 text-white flex items-center justify-center cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-5 text-center font-mono font-bold">{ci.qty}</span>
                                                <button
                                                    onClick={() => handleUpdateCartQty(idx, 1)}
                                                    className="w-5 h-5 rounded bg-white/10 text-white flex items-center justify-center cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmitKitchenKOT}
                                disabled={isSubmittingOrder}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Flame className="w-4 h-4 text-black" />
                                <span>
                                    {isSubmittingOrder
                                        ? "Sending KOT..."
                                        : `Send KOT to Kitchen (${formatRupees(cartTotalPaise)})`}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TABLE TRANSFER MODAL */}
            {isTransferModalOpen && tableOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-sm bg-[#1a1612] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-black text-white">Transfer {selectedTable?.label}</h3>
                            <button
                                onClick={() => setIsTransferModalOpen(false)}
                                className="p-1 rounded-lg text-white/50 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-white/60">
                            Select destination table to move Order #{tableOrder.order_number} ({formatRupees(tableOrder.total_paise)}):
                        </p>

                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {tables
                                .filter((t) => t.id !== selectedTable?.id)
                                .map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTransferTargetTableId(t.id)}
                                        className={`p-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                                            transferTargetTableId === t.id
                                                ? "border-cyan-400 bg-cyan-950/60 text-cyan-300"
                                                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(false)}
                                className="py-2.5 rounded-xl bg-white/10 text-white/80 font-bold text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleTransferTable}
                                disabled={!transferTargetTableId || isTransferring}
                                className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs disabled:opacity-50 cursor-pointer shadow-lg"
                            >
                                {isTransferring ? "Transferring..." : "Confirm Transfer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Payment Settlement Modal */}
            {isSettlementModalOpen && tableOrder && (
                <PaymentSettlementModal
                    isOpen={isSettlementModalOpen}
                    onClose={() => setIsSettlementModalOpen(false)}
                    order={tableOrder}
                    onSuccess={() => {
                        loadFloorData();
                        setSelectedTable(null);
                    }}
                />
            )}
        </div>
    );
}
