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
    UtensilsCrossed,
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
    Droplets,
    UserCheck,
    Receipt,
    Check,
    MessageSquare,
    AlertTriangle,
    Brush,
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
import { AudioUnlockBanner } from "@/components/admin/AudioUnlockBanner";

interface CafeTableData {
    id: number;
    label: string;
    status: "available" | "free" | "occupied" | "reserved" | "billing" | "cleaning";
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
    "No Onion / Garlic",
    "Separate Salan Gravy",
    "Extra Garlic Mayo",
    "Extra Lemon & Onion",
    "Crispy Meat",
    "Serve Hot",
    "Pack Separate",
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

    // Table Filter: all | occupied | available | bill | cleaning | calls
    const [tableFilter, setTableFilter] = useState<"all" | "occupied" | "available" | "bill" | "cleaning" | "calls">("all");
    const [tableSearch, setTableSearch] = useState("");

    // Active Table Modal state
    const [selectedTable, setSelectedTable] = useState<CafeTableData | null>(null);
    const [tableOrder, setTableOrder] = useState<any | null>(null);

    // Punch-in / Menu Sheet state
    const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non_veg">("all");
    const [activeNoteItemIdx, setActiveNoteItemIdx] = useState<number | null>(null);
    const [customNoteInput, setCustomNoteInput] = useState("");

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

    // Table Transfer / Merge Modal state
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

    // Load initial floor data
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
                api.getServiceCalls("pending", selectedOutletId),
            ]);

            // Tables
            if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value) && tablesRes.value.length > 0) {
                setTables(tablesRes.value);
            } else {
                const fallbackTables: CafeTableData[] = Array.from({ length: 12 }, (_, i) => ({
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
            setTables(
                Array.from({ length: 12 }, (_, i) => ({
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
            if (
                event.event === "new_order" ||
                event.event === "order_status_updated" ||
                event.event === "running_kot_added" ||
                event.event === "table_transferred" ||
                event.event === "table_updated"
            ) {
                loadFloorData();
                if (event.event === "new_order" && event.data) {
                    soundManager.playOrderVoiceAlert(event.data);
                } else if (event.event === "running_kot_added" && event.data) {
                    soundManager.playRunningKotVoiceAlert(event.data.table_label || event.data.table_id || "Table");
                } else {
                    soundManager.playNewOrderChime();
                }
            } else if (event.event === "service_call") {
                loadFloorData();
                soundManager.playServiceCallVoiceAlert(event.data);
                const callType = event.data?.call_type ? event.data.call_type.toUpperCase() : "SERVICE";
                toast.info(`Service Call: ${callType} requested from Table #${event.data?.table_id || "N/A"}`);
            } else if (event.event === "service_call_attended") {
                loadFloorData();
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
            toast.success("Service call marked attended");
        } catch (err: any) {
            toast.error("Failed to clear service call");
        }
    };

    // Attend All Service Calls
    const handleAttendAllServiceCalls = async () => {
        try {
            await Promise.all(serviceCalls.map((c) => api.attendServiceCall(c.id)));
            setServiceCalls([]);
            toast.success("All pending service calls cleared");
        } catch (err: any) {
            toast.error("Failed to clear all service calls");
        }
    };

    // Update Table Cleaning Status
    const handleToggleCleaningStatus = async (table: CafeTableData, setClean: boolean) => {
        try {
            const newStatus = setClean ? "free" : "cleaning";
            await api.updateTableStatus(table.id, newStatus);
            // Also attend any pending clean service calls for this table
            const cleanCalls = serviceCalls.filter((c) => c.table_id === table.id && (c.call_type === "clean" || c.call_type === "cleaning"));
            for (const cc of cleanCalls) {
                await api.attendServiceCall(cc.id);
            }
            toast.success(setClean ? `Table ${table.label} marked cleaned & ready` : `Table ${table.label} flagged for cleaning`);
            loadFloorData();
            if (selectedTable?.id === table.id) {
                setSelectedTable((prev) => (prev ? { ...prev, status: newStatus } : null));
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update cleaning status");
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

    // Remove Item from Cart
    const handleRemoveCartItem = (idx: number) => {
        setCartItems((prev) => prev.filter((_, i) => i !== idx));
        if (activeNoteItemIdx === idx) {
            setActiveNoteItemIdx(null);
            setCustomNoteInput("");
        }
    };

    // Add Quick Note to Cart Item
    const handleAddNoteToCartItem = (idx: number, note: string) => {
        setCartItems((prev) => {
            const updated = [...prev];
            const current = updated[idx].notes || "";
            if (!current) {
                updated[idx].notes = note;
            } else if (current.includes(note)) {
                // Toggle off if already present
                const parts = current.split(",").map((s) => s.trim()).filter((s) => s !== note);
                updated[idx].notes = parts.join(", ");
            } else {
                updated[idx].notes = `${current}, ${note}`;
            }
            return updated;
        });
    };

    // Set Custom Freeform Note on Cart Item
    const handleSaveCustomNote = (idx: number) => {
        if (!customNoteInput.trim()) return;
        setCartItems((prev) => {
            const updated = [...prev];
            const current = updated[idx].notes || "";
            if (!current) {
                updated[idx].notes = customNoteInput.trim();
            } else {
                updated[idx].notes = `${current}, ${customNoteInput.trim()}`;
            }
            return updated;
        });
        setCustomNoteInput("");
        setActiveNoteItemIdx(null);
    };

    // Clear All Notes on Cart Item
    const handleClearItemNotes = (idx: number) => {
        setCartItems((prev) => {
            const updated = [...prev];
            updated[idx].notes = "";
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
                toast.success(`Running KOT dispatched to Kitchen for Table ${selectedTable.label}!`);
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
                toast.success(`New KOT sent to Kitchen for Table ${selectedTable.label}!`);
                soundManager.playNewOrderChime();

                // Print Kitchen KOT
                printKOT(res, outlet);
                setTableOrder(res);
            }

            setCartItems([]);
            setIsMenuSheetOpen(false);
            setActiveNoteItemIdx(null);
            loadFloorData();
        } catch (err: any) {
            toast.error(err.message || "Failed to dispatch KOT");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Transfer or Merge Table
    const handleTransferOrMergeTable = async () => {
        if (!tableOrder || !transferTargetTableId) return;
        const targetOrder = getOrderForTable(transferTargetTableId);
        const isMerging = !!targetOrder;

        setIsTransferring(true);
        try {
            const res = await api.transferOrderTable(tableOrder.id, transferTargetTableId, isMerging);
            if (isMerging) {
                toast.success(`Tables merged! Orders consolidated under Table #${transferTargetTableId}`);
            } else {
                toast.success(`Order transferred to Table #${transferTargetTableId}`);
            }
            setIsTransferModalOpen(false);
            setSelectedTable(null);
            setTableOrder(null);
            loadFloorData();
        } catch (err: any) {
            toast.error(err.message || "Failed to transfer or merge table");
        } finally {
            setIsTransferring(false);
        }
    };

    // Filtered Tables
    const filteredTables = useMemo(() => {
        return tables.filter((t) => {
            const billCall = serviceCalls.some((c) => c.table_id === t.id && c.call_type === "bill");
            const cleanCall = serviceCalls.some((c) => c.table_id === t.id && (c.call_type === "clean" || c.call_type === "cleaning"));
            const hasCall = serviceCalls.some((c) => c.table_id === t.id);
            const activeOrd = getOrderForTable(t.id);
            const isOccupied = !!activeOrd || t.status === "occupied";
            const isCleaning = cleanCall || t.status === "cleaning";
            const isBillRequested = billCall || t.status === "billing";
            const isAvailable = !isOccupied && !isCleaning && !isBillRequested;

            if (tableFilter === "occupied" && !isOccupied) return false;
            if (tableFilter === "available" && !isAvailable) return false;
            if (tableFilter === "bill" && !isBillRequested) return false;
            if (tableFilter === "cleaning" && !isCleaning) return false;
            if (tableFilter === "calls" && !hasCall) return false;

            if (tableSearch.trim()) {
                const q = tableSearch.toLowerCase();
                return t.label.toLowerCase().includes(q) || `${t.id}`.includes(q);
            }
            return true;
        });
    }, [tables, activeOrders, serviceCalls, tableFilter, tableSearch]);

    // Counts for Filter Badges
    const counts = useMemo(() => {
        let occupied = 0;
        let available = 0;
        let bill = 0;
        let cleaning = 0;

        tables.forEach((t) => {
            const billCall = serviceCalls.some((c) => c.table_id === t.id && c.call_type === "bill");
            const cleanCall = serviceCalls.some((c) => c.table_id === t.id && (c.call_type === "clean" || c.call_type === "cleaning"));
            const activeOrd = getOrderForTable(t.id);
            const isOccupied = !!activeOrd || t.status === "occupied";
            const isCleaning = cleanCall || t.status === "cleaning";
            const isBillRequested = billCall || t.status === "billing";

            if (isBillRequested) bill += 1;
            if (isCleaning) cleaning += 1;
            if (isOccupied) occupied += 1;
            if (!isOccupied && !isCleaning && !isBillRequested) available += 1;
        });

        return {
            total: tables.length,
            occupied,
            available,
            bill,
            cleaning,
            calls: serviceCalls.length,
        };
    }, [tables, activeOrders, serviceCalls]);

    // Filtered Menu Items
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter((it) => {
            if (selectedCategory !== "all" && it.category_id !== selectedCategory) return false;
            if (dietFilter === "veg" && !it.is_veg) return false;
            if (dietFilter === "non_veg" && it.is_veg) return false;
            if (menuSearch.trim()) {
                const q = menuSearch.toLowerCase();
                return (
                    it.name.toLowerCase().includes(q) ||
                    (it.name_te && it.name_te.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [menuItems, selectedCategory, dietFilter, menuSearch]);

    const cartTotalPaise = cartItems.reduce((acc, ci) => acc + ci.price_paise * ci.qty, 0);

    // Helper for Service Call Type Badges
    const renderCallTypeBadge = (call: any) => {
        const type = (call.call_type || "waiter").toLowerCase();
        if (type === "water") {
            return (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] font-bold">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>Table #{call.table_id} (Water)</span>
                </div>
            );
        }
        if (type === "bill") {
            return (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>Table #{call.table_id} (Bill)</span>
                </div>
            );
        }
        if (type === "clean" || type === "cleaning") {
            return (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Table #{call.table_id} (Clean)</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Table #{call.table_id} (Waiter)</span>
            </div>
        );
    };

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
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                                Floor Handheld
                            </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                            {outlet?.name || "Surya Family Restaurant"} • Floor Operations
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Branch Switcher (Owner/Admin only) */}
                    {isOwner ? (
                        <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
                            <button
                                onClick={() => setSelectedOutletId(1)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    selectedOutletId === 1 ? "bg-amber-500 text-black" : "text-white/60"
                                }`}
                                title="Switch to Surya Family Restaurant"
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
                            <span>B{user?.outlet_id || 1} • Surya</span>
                        </div>
                    )}

                    {/* App Install Button */}
                    {!isStandalone && (
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
                            title="Install Captain App on Tablet / Phone"
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

            {/* RESTAURANT SOUNDBOX & AUDIO UNLOCK BANNER */}
            <AudioUnlockBanner />

            {/* PENDING SERVICE CALLS ALERT BANNER */}
            {serviceCalls.length > 0 && (
                <div className="bg-gradient-to-r from-[#19152b] via-[#1f1a3a] to-[#19152b] border-b border-indigo-400/30 px-4 py-3 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <Bell className="w-4 h-4" />
                            </span>
                            <div>
                                <span className="text-xs font-black text-white">
                                    {serviceCalls.length} Incoming Table Service {serviceCalls.length === 1 ? "Request" : "Requests"}:
                                </span>
                                <p className="text-[10px] text-white/50">Tap checkmark to attend and dismiss</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                            {serviceCalls.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-xl p-1 shrink-0"
                                >
                                    {renderCallTypeBadge(c)}
                                    <button
                                        onClick={() => handleAttendServiceCall(c.id)}
                                        className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition cursor-pointer"
                                        title="Mark Call Attended"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            {serviceCalls.length > 1 && (
                                <button
                                    onClick={handleAttendAllServiceCalls}
                                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-bold transition shrink-0 cursor-pointer border border-white/10"
                                >
                                    Attend All
                                </button>
                            )}
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

                {/* Filter Pills with Lucide Icons */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setTableFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "all"
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>All Tables ({counts.total})</span>
                    </button>

                    <button
                        onClick={() => setTableFilter("occupied")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "occupied"
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dining ({counts.occupied})</span>
                    </button>

                    <button
                        onClick={() => setTableFilter("available")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "available"
                                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Available ({counts.available})</span>
                    </button>

                    <button
                        onClick={() => setTableFilter("bill")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "bill"
                                ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <Receipt className="w-3.5 h-3.5 text-amber-300" />
                        <span>Bill Requested ({counts.bill})</span>
                    </button>

                    <button
                        onClick={() => setTableFilter("cleaning")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "cleaning"
                                ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Cleaning Needed ({counts.cleaning})</span>
                    </button>

                    <button
                        onClick={() => setTableFilter("calls")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                            tableFilter === "calls"
                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        <Bell className="w-3.5 h-3.5 text-blue-400" />
                        <span>Calls ({counts.calls})</span>
                    </button>
                </div>
            </div>

            {/* TABLES GRID (FLOOR PLAN) */}
            <main className="flex-1 p-4">
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-36 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filteredTables.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">No tables match your selected filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredTables.map((table) => {
                            const order = getOrderForTable(table.id);
                            const billCall = serviceCalls.find((c) => c.table_id === table.id && c.call_type === "bill");
                            const cleanCall = serviceCalls.find((c) => c.table_id === table.id && (c.call_type === "clean" || c.call_type === "cleaning"));
                            const waterCall = serviceCalls.find((c) => c.table_id === table.id && c.call_type === "water");
                            const waiterCall = serviceCalls.find((c) => c.table_id === table.id && c.call_type === "waiter");

                            const isOccupied = !!order || table.status === "occupied";
                            const isCleaningNeeded = !!cleanCall || table.status === "cleaning";
                            const isBillRequested = !!billCall || table.status === "billing";

                            // Dynamic Card Border & Styling
                            let cardStyle = "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400";
                            if (isBillRequested) {
                                cardStyle = "border-amber-400 bg-amber-950/60 shadow-xl shadow-amber-500/20 animate-pulse";
                            } else if (isCleaningNeeded) {
                                cardStyle = "border-purple-500 bg-purple-950/40 shadow-lg shadow-purple-500/20";
                            } else if (waterCall || waiterCall) {
                                cardStyle = "border-sky-400 bg-sky-950/40 shadow-lg shadow-sky-500/20";
                            } else if (isOccupied) {
                                cardStyle = "border-amber-500/80 bg-amber-950/20 shadow-md shadow-amber-500/10 hover:border-amber-400";
                            }

                            return (
                                <div
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={`relative p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[165px] ${cardStyle}`}
                                >
                                    {/* Top Status Header */}
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-lg font-black font-mono text-white">
                                            {table.label}
                                        </span>

                                        {/* Status Badges */}
                                        <div className="flex items-center gap-1">
                                            {isBillRequested ? (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                    <Receipt className="w-3 h-3" />
                                                    <span>Bill</span>
                                                </span>
                                            ) : isCleaningNeeded ? (
                                                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" />
                                                    <span>Clean</span>
                                                </span>
                                            ) : waterCall ? (
                                                <span className="p-1 rounded-md bg-sky-500 text-black" title="Water requested">
                                                    <Droplets className="w-3.5 h-3.5" />
                                                </span>
                                            ) : waiterCall ? (
                                                <span className="p-1 rounded-md bg-blue-500 text-black" title="Waiter requested">
                                                    <Bell className="w-3.5 h-3.5" />
                                                </span>
                                            ) : isOccupied ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                                            ) : (
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Order / Table Status Body */}
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
                                    ) : isCleaningNeeded ? (
                                        <div className="my-auto text-center py-1">
                                            <p className="text-[11px] font-black text-purple-300 flex items-center justify-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                Cleaning Needed
                                            </p>
                                            <p className="text-[9px] text-white/40">Vacated table</p>
                                        </div>
                                    ) : (
                                        <div className="my-auto text-center py-1">
                                            <p className="text-[11px] font-bold text-emerald-400">Vacant</p>
                                            <p className="text-[9px] text-white/40">Tap to Punch Order</p>
                                        </div>
                                    )}

                                    {/* Bottom Quick Action */}
                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
                                        {isBillRequested && order ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTable(table);
                                                    setTableOrder(order);
                                                    setIsSettlementModalOpen(true);
                                                }}
                                                className="w-full py-1 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black flex items-center justify-center gap-1 shadow-md transition"
                                            >
                                                <CreditCard className="w-3 h-3" />
                                                <span>Settle Bill</span>
                                            </button>
                                        ) : isCleaningNeeded ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCleaningStatus(table, true);
                                                }}
                                                className="w-full py-1 px-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-black flex items-center justify-center gap-1 shadow-sm transition"
                                            >
                                                <Check className="w-3 h-3" />
                                                <span>Mark Cleaned</span>
                                            </button>
                                        ) : isOccupied && order ? (
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
                                            <div className="flex items-center justify-between w-full text-emerald-400">
                                                <span>Ready to Seat</span>
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
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                            tableOrder
                                                ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                                : selectedTable.status === "cleaning"
                                                ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                        }`}
                                    >
                                        {tableOrder ? (
                                            <>
                                                <UtensilsCrossed className="w-3 h-3" />
                                                <span>Occupied Dining</span>
                                            </>
                                        ) : selectedTable.status === "cleaning" ? (
                                            <>
                                                <Sparkles className="w-3 h-3" />
                                                <span>Cleaning Needed</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Available</span>
                                            </>
                                        )}
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
                            {/* Service Calls for this Table */}
                            {serviceCalls.filter((c) => c.table_id === selectedTable.id).length > 0 && (
                                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-400/30 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                                        <span className="flex items-center gap-1.5">
                                            <Bell className="w-3.5 h-3.5 text-indigo-400" />
                                            Active Service Buzzer Calls
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {serviceCalls
                                            .filter((c) => c.table_id === selectedTable.id)
                                            .map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10"
                                                >
                                                    {renderCallTypeBadge(c)}
                                                    <button
                                                        onClick={() => handleAttendServiceCall(c.id)}
                                                        className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition cursor-pointer"
                                                        title="Attend Call"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {tableOrder ? (
                                <div className="space-y-4">
                                    {/* Existing Items in Order */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold text-white/60 mb-2">
                                            <span>Current Placed Items</span>
                                            <span>{tableOrder.items?.length || 0} dishes</span>
                                        </div>
                                        <div className="space-y-2 max-h-56 overflow-y-auto">
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
                                                            <p className="text-[10px] text-rose-300 flex items-center gap-1 mt-0.5">
                                                                <MessageSquare className="w-2.5 h-2.5" />
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

                                    {/* Action Buttons for Active Dining Table */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => setIsSettlementModalOpen(true)}
                                            className="col-span-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            <span>Settle Table Bill (Dynamic UPI / Cash)</span>
                                        </button>

                                        <button
                                            onClick={() => setIsMenuSheetOpen(true)}
                                            className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Items (Running KOT)</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setTransferTargetTableId(null);
                                                setIsTransferModalOpen(true);
                                            }}
                                            className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 cursor-pointer"
                                        >
                                            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                                            <span>Transfer / Merge Table</span>
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
                                <div className="text-center py-8 space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                                        <Utensils className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-white">Table is Vacant & Ready</h4>
                                        <p className="text-xs text-white/50 max-w-xs mx-auto mt-1">
                                            Punch in first round of Mandi, Biryani, Starters, and Beverages for guests seated at {selectedTable.label}.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setIsMenuSheetOpen(true)}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Start New Order for {selectedTable.label}</span>
                                    </button>

                                    {/* Table Cleaning Quick Toggle */}
                                    <div className="pt-4 border-t border-white/10">
                                        {selectedTable.status === "cleaning" ? (
                                            <button
                                                onClick={() => handleToggleCleaningStatus(selectedTable, true)}
                                                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>Mark Table Cleaned & Ready</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleCleaningStatus(selectedTable, false)}
                                                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 border border-purple-500/30 cursor-pointer"
                                            >
                                                <Sparkles className="w-4 h-4 text-purple-400" />
                                                <span>Flag Table Needs Cleaning</span>
                                            </button>
                                        )}
                                    </div>
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
                                    {tableOrder ? `Running KOT • Table ${selectedTable?.label}` : `New Order • Table ${selectedTable?.label}`}
                                </h3>
                                <p className="text-[10px] text-amber-400 font-bold">
                                    {cartItems.length} items staged for kitchen
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
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search dishes (e.g. Mandi, Naan, 65, Biryani)..."
                                    value={menuSearch}
                                    onChange={(e) => setMenuSearch(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-hidden focus:border-amber-500"
                                />
                            </div>

                            {/* Diet Filter Switch */}
                            <div className="flex rounded-xl bg-black/40 border border-white/10 p-0.5">
                                <button
                                    onClick={() => setDietFilter("all")}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                        dietFilter === "all" ? "bg-amber-500 text-black font-black" : "text-white/60"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setDietFilter("veg")}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                        dietFilter === "veg" ? "bg-emerald-500 text-black font-black" : "text-emerald-400"
                                    }`}
                                >
                                    Veg
                                </button>
                                <button
                                    onClick={() => setDietFilter("non_veg")}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                        dietFilter === "non_veg" ? "bg-red-500 text-white font-black" : "text-red-400"
                                    }`}
                                >
                                    Non-Veg
                                </button>
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                                    selectedCategory === "all"
                                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
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
                                            ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                            : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
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
                                                className={`w-2.5 h-2.5 rounded-full ${
                                                    item.is_veg ? "bg-emerald-400" : "bg-red-500"
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
                                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[220px]">
                                            {item.variants.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => handleAddItemToCart(item, v)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400/40 text-[11px] font-black transition cursor-pointer min-h-[36px] flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    <span>{v.name} ({formatRupees(v.price_paise)})</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAddItemToCart(item)}
                                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition cursor-pointer min-h-[36px] flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Staged Cart Items Bar at Bottom with Full Kitchen Notes & Special Instructions */}
                    {cartItems.length > 0 && (
                        <div className="p-3 bg-[#181410] border-t border-white/10 space-y-2 pb-safe shrink-0 shadow-2xl">
                            <div className="flex items-center justify-between text-xs font-bold text-white/70">
                                <span className="flex items-center gap-1.5">
                                    <Utensils className="w-3.5 h-3.5 text-amber-400" />
                                    Staged for KOT ({cartItems.length} {cartItems.length === 1 ? "dish" : "dishes"})
                                </span>
                                <span className="font-mono text-amber-400 font-black">{formatRupees(cartTotalPaise)}</span>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {cartItems.map((ci, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 pr-2">
                                                <p className="font-bold text-white leading-tight">
                                                    {ci.name} {ci.variant_name ? `(${ci.variant_name})` : ""}
                                                </p>
                                                <p className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                                                    {formatRupees(ci.price_paise * ci.qty)}
                                                </p>
                                            </div>

                                            {/* Quantity Adjusters */}
                                            <div className="flex items-center gap-1">
                                                <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => handleUpdateCartQty(idx, -1)}
                                                        className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
                                                        title="Decrease"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="w-6 text-center font-mono font-black text-sm">{ci.qty}</span>
                                                    <button
                                                        onClick={() => handleUpdateCartQty(idx, 1)}
                                                        className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
                                                        title="Increase"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveCartItem(idx)}
                                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                                                    title="Remove item"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Notes Display & Toggle Button */}
                                        <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                                            <div className="flex-1 overflow-hidden">
                                                {ci.notes ? (
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-300">
                                                        <MessageSquare className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">Note: {ci.notes}</span>
                                                        <button
                                                            onClick={() => handleClearItemNotes(idx)}
                                                            className="text-white/40 hover:text-white ml-1 cursor-pointer"
                                                            title="Clear note"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-white/40 italic">No kitchen instruction</span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveNoteItemIdx(activeNoteItemIdx === idx ? null : idx);
                                                    setCustomNoteInput("");
                                                }}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                                    activeNoteItemIdx === idx
                                                        ? "bg-amber-500 text-black border-amber-400"
                                                        : "bg-white/5 text-amber-300/80 border-amber-400/20 hover:bg-white/10"
                                                }`}
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                                <span>{activeNoteItemIdx === idx ? "Close" : "+ Note"}</span>
                                            </button>
                                        </div>

                                        {/* Expandable Kitchen Instructions / Notes Panel */}
                                        {activeNoteItemIdx === idx && (
                                            <div className="p-2.5 rounded-xl bg-black/60 border border-amber-400/30 space-y-2 mt-1 animate-in fade-in duration-200">
                                                <p className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                                    <ChefHat className="w-3 h-3" />
                                                    Special Customer Kitchen Instructions:
                                                </p>

                                                {/* Quick Instruction Chips */}
                                                <div className="flex flex-wrap gap-1">
                                                    {QUICK_NOTES.map((qn) => {
                                                        const isSelected = ci.notes?.includes(qn);
                                                        return (
                                                            <button
                                                                key={qn}
                                                                type="button"
                                                                onClick={() => handleAddNoteToCartItem(idx, qn)}
                                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                                                    isSelected
                                                                        ? "bg-amber-400 text-black font-black"
                                                                        : "bg-white/10 text-white/80 hover:bg-white/15 border border-white/10"
                                                                }`}
                                                            >
                                                                {qn}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Custom Note Freeform Input */}
                                                <div className="flex items-center gap-1 pt-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Custom instruction (e.g. Nut allergy, less oil)..."
                                                        value={customNoteInput}
                                                        onChange={(e) => setCustomNoteInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleSaveCustomNote(idx);
                                                            }
                                                        }}
                                                        className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-white/40 focus:outline-hidden focus:border-amber-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveCustomNote(idx)}
                                                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black cursor-pointer shrink-0"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmitKitchenKOT}
                                disabled={isSubmittingOrder}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Flame className="w-4 h-4 text-black" />
                                <span>
                                    {isSubmittingOrder
                                        ? "Sending KOT to Kitchen..."
                                        : `Send KOT to Kitchen (${formatRupees(cartTotalPaise)})`}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TABLE TRANSFER & MERGE MODAL */}
            {isTransferModalOpen && tableOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-[#1a1612] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-base font-black text-white">Transfer / Merge {selectedTable?.label}</h3>
                            </div>
                            <button
                                onClick={() => setIsTransferModalOpen(false)}
                                className="p-1 rounded-lg text-white/50 hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1">
                            <div className="flex justify-between text-white/60">
                                <span>Source Order</span>
                                <span className="font-mono text-white">#{tableOrder.order_number}</span>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Current Total</span>
                                <span className="font-mono text-amber-400 font-bold">{formatRupees(tableOrder.total_paise)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-white/60">
                            Select destination table. Vacant tables will receive a clean transfer. Occupied tables will trigger an order merge:
                        </p>

                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                            {tables
                                .filter((t) => t.id !== selectedTable?.id)
                                .map((t) => {
                                    const destOrder = getOrderForTable(t.id);
                                    const isOccupied = !!destOrder || t.status === "occupied";
                                    const isSelected = transferTargetTableId === t.id;

                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTransferTargetTableId(t.id)}
                                            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                                isSelected
                                                    ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20"
                                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-white font-mono">{t.label}</span>
                                                {isOccupied ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                                        Dining
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                                        Vacant
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 text-[10px]">
                                                {destOrder ? (
                                                    <p className="text-amber-300 font-mono font-bold">
                                                        Merge • {formatRupees(destOrder.total_paise)}
                                                    </p>
                                                ) : (
                                                    <p className="text-emerald-400">Transfer here</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* Summary / Warning if Target Table is Occupied (Merge) */}
                        {transferTargetTableId && (() => {
                            const destOrder = getOrderForTable(transferTargetTableId);
                            const destTable = tables.find((t) => t.id === transferTargetTableId);
                            if (destOrder) {
                                return (
                                    <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-400/30 text-xs space-y-1">
                                        <p className="font-bold text-amber-300 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4" />
                                            Table Merge Confirmation:
                                        </p>
                                        <p className="text-[11px] text-white/70">
                                            Table {destTable?.label} already has Order #{destOrder.order_number} ({formatRupees(destOrder.total_paise)}).
                                            All items from {selectedTable?.label} will be merged into {destTable?.label}.
                                        </p>
                                        <p className="text-[11px] font-black text-amber-400 pt-1 font-mono">
                                            New Combined Bill: {formatRupees(tableOrder.total_paise + destOrder.total_paise)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(false)}
                                className="py-2.5 rounded-xl bg-white/10 text-white/80 font-bold text-xs cursor-pointer hover:bg-white/15"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleTransferOrMergeTable}
                                disabled={!transferTargetTableId || isTransferring}
                                className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                            >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>
                                    {isTransferring
                                        ? "Processing..."
                                        : getOrderForTable(transferTargetTableId || 0)
                                        ? "Confirm Merge"
                                        : "Confirm Transfer"}
                                </span>
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
