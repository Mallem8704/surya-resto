"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Maximize2,
    Minimize2,
    Printer,
    RefreshCw,
    Sparkles,
    Smartphone,
    LayoutDashboard,
    ChefHat,
    Banknote,
    QrCode,
    CreditCard,
    Utensils,
    ShoppingBag,
    Bike,
    Volume2,
    Shield,
    FileText,
    Calendar,
    Settings,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import { useOutlet } from "@/context/OutletContext";
import { useToast } from "@/context/ToastContext";
import { useAdminSocket, SocketEvent } from "@/hooks/useSockets";
import { printKOT, printRunningKOT, printPOSReceipt, printTestReceipt } from "@/lib/thermalPrint";
import { soundManager } from "@/lib/sound";
import { PaymentSettlementModal } from "@/components/admin/PaymentSettlementModal";
import { POSMenuGrid } from "@/components/admin/pos/POSMenuGrid";
import { POSTicketCart, POSCartItem } from "@/components/admin/pos/POSTicketCart";
import { POSTableSelectorModal } from "@/components/admin/pos/POSTableSelectorModal";
import { PettyCashModal } from "@/components/admin/pos/PettyCashModal";
import { POSRecentBillsModal } from "@/components/admin/pos/POSRecentBillsModal";
import { POSShiftModal } from "@/components/admin/pos/POSShiftModal";
import { Briefcase } from "lucide-react";

export default function CashierPOSTerminalPage() {
    const router = useRouter();
    const toast = useToast();
    const { user, isAuthenticated, isOwner } = useAuth();
    const { outlet, refreshOutlet } = useOutlet();

    const [selectedOutletId, setSelectedOutletId] = useState<number>(outlet?.id || 1);
    const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");

    // Floor & Menu Data
    const [tables, setTables] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selected Table & Active Order
    const [selectedTable, setSelectedTable] = useState<{ id: number; label: string } | null>(null);
    const [activeTableOrder, setActiveTableOrder] = useState<any | null>(null);

    // Cart state
    const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
    const [customerName, setCustomerName] = useState<string>("");
    const [customerPhone, setCustomerPhone] = useState<string>("");
    const [deliveryAddress, setDeliveryAddress] = useState<string>("");
    const [discountPaise, setDiscountPaise] = useState<number>(0);
    const [parcelChargePaise, setParcelChargePaise] = useState<number>(0);

    // Modals
    const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
    const [isPettyCashOpen, setIsPettyCashOpen] = useState<boolean>(false);
    const [isRecentBillsOpen, setIsRecentBillsOpen] = useState<boolean>(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
    const [settlementOrder, setSettlementOrder] = useState<any | null>(null);

    // Menu search & category filter
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Load Data
    const loadPOSData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tablesRes, ordersRes, catsRes, itemsRes] = await Promise.allSettled([
                api.getTables(selectedOutletId),
                api.getOrders({ outlet_id: selectedOutletId, status: "placed,accepted,preparing,ready,served" }),
                api.getCategories(true, selectedOutletId),
                api.getMenu(selectedOutletId),
            ]);

            if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value) && tablesRes.value.length > 0) {
                setTables(tablesRes.value);
            } else {
                setTables(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `T${i + 1}`, status: "free", outlet_id: selectedOutletId })));
            }

            if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
                setActiveOrders(ordersRes.value);
            }

            if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
                setCategories(catsRes.value);
            }

            if (itemsRes.status === "fulfilled" && Array.isArray(itemsRes.value)) {
                setMenuItems(itemsRes.value);
            }
        } catch (err) {
            console.error("Error loading POS data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedOutletId]);

    useEffect(() => {
        loadPOSData();
    }, [loadPOSData]);

    // WebSocket sync
    const handleWsEvent = useCallback((event: SocketEvent) => {
        if (event.event === "new_order" || event.event === "order_status_updated" || event.event === "payment_success") {
            loadPOSData();
            if (event.event === "new_order") {
                soundManager.playNewOrderChime();
            }
        }
    }, [loadPOSData]);

    useAdminSocket(selectedOutletId, handleWsEvent);

    // When a table is selected, find its active running order
    useEffect(() => {
        if (selectedTable) {
            const existingOrd = activeOrders.find(
                (o) => o.table_id === selectedTable.id && o.status !== "completed" && o.status !== "cancelled"
            );
            setActiveTableOrder(existingOrd || null);
            if (existingOrd) {
                if (existingOrd.customer_name) setCustomerName(existingOrd.customer_name);
                if (existingOrd.customer_phone) setCustomerPhone(existingOrd.customer_phone);
            }
        } else {
            setActiveTableOrder(null);
        }
    }, [selectedTable, activeOrders]);

    // Keyboard Shortcuts Listener (F2, F4, F5, F8, F9, F10, F11, F12)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F8") { e.preventDefault(); /* Focus discount or clear */ }
            if (e.key === "F7") {
                e.preventDefault();
                setIsRecentBillsOpen(true);
            } else if (e.key === "F2") {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "F4") {
                e.preventDefault();
                setOrderType("dine_in");
                setIsTableModalOpen(true);
            } else if (e.key === "F5") {
                e.preventDefault();
                setOrderType("takeaway");
                setSelectedTable(null);
            } else if (e.key === "F9") {
                e.preventDefault();
                handleSendKOT();
            } else if (e.key === "F10") {
                e.preventDefault();
                handleSettleQuick("cash");
            } else if (e.key === "F11") {
                e.preventDefault();
                handleSettleQuick("upi");
            } else if (e.key === "F12") {
                e.preventDefault();
                handlePrintBillEstimate();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    // Add item to cart
    const handleAddItem = (item: any, variant?: any, notes?: string) => {
        const price = variant ? variant.price_paise : item.price_paise;
        const vId = variant ? variant.id : undefined;
        const vName = variant ? variant.name : undefined;

        setCartItems((prev) => {
            const existingIdx = prev.findIndex(
                (ci) => ci.item_id === item.id && ci.variant_id === vId && ci.notes === notes
            );
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx].qty += 1;
                return updated;
            } else {
                return [
                    ...prev,
                    {
                        item_id: item.id,
                        name: item.name,
                        variant_id: vId,
                        variant_name: vName,
                        price_paise: price,
                        qty: 1,
                        notes: notes || "",
                    },
                ];
            }
        });
        soundManager.playAddToCartPop();
    };

    const handleUpdateQty = (index: number, newQty: number) => {
        if (newQty <= 0) {
            handleRemoveItem(index);
        } else {
            setCartItems((prev) => {
                const updated = [...prev];
                updated[index].qty = newQty;
                return updated;
            });
        }
    };

    const handleUpdateNotes = (index: number, notes: string) => {
        setCartItems((prev) => {
            const updated = [...prev];
            updated[index].notes = notes;
            return updated;
        });
    };

    const handleRemoveItem = (index: number) => {
        setCartItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearCart = () => {
        setCartItems([]);
        setDiscountPaise(0);
        setParcelChargePaise(0);
    };

    // 1. Send Kitchen KOT
    const handleSendKOT = async () => {
        if (cartItems.length === 0) {
            toast.error("Add items to bill before sending KOT");
            return;
        }

        if (orderType === "dine_in" && !selectedTable) {
            toast.error("Please select a Table before sending Dine-In KOT [F4]");
            setIsTableModalOpen(true);
            return;
        }

        setIsSubmitting(true);
        try {
            if (activeTableOrder) {
                // Append Running KOT to active order
                const res = await api.appendOrderItems(
                    activeTableOrder.id,
                    cartItems.map((ci) => ({
                        item_id: ci.item_id,
                        variant_id: ci.variant_id,
                        qty: ci.qty,
                        notes: ci.notes,
                    }))
                );

                toast.success(`🔥 Running KOT sent to Kitchen for Table ${selectedTable?.label}!`);
                soundManager.playNewOrderChime();

                printRunningKOT(
                    res,
                    cartItems.map((ci) => ({
                        item_name: ci.name,
                        variant_name: ci.variant_name,
                        qty: ci.qty,
                        notes: ci.notes,
                    })),
                    outlet,
                    user?.name || "Cashier"
                );

                setActiveTableOrder(res);
            } else {
                // New Order (Dine-In, Takeaway, or Delivery)
                const res = await api.createOrder({
                    table_id: orderType === "dine_in" ? selectedTable?.id : undefined,
                    outlet_id: selectedOutletId,
                    order_type: orderType,
                    customer_name: customerName.trim() || undefined,
                    customer_phone: customerPhone.trim() || undefined,
                    delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
                    payment_method: "counter",
                    discount_paise: discountPaise > 0 ? discountPaise : undefined,
                    items: cartItems.map((ci) => ({
                        item_id: ci.item_id,
                        variant_id: ci.variant_id,
                        qty: ci.qty,
                        notes: ci.notes,
                    })),
                });

                toast.success(`🔥 Kitchen KOT #${res.order_number || res.id} sent!`);
                soundManager.playNewOrderChime();

                printKOT(res, outlet);

                if (orderType === "dine_in") {
                    setActiveTableOrder(res);
                }
            }

            handleClearCart();
            loadPOSData();
        } catch (err: any) {
            toast.error(err.message || "Failed to send KOT");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. Quick Settle Cash / UPI
    const handleSettleQuick = async (paymentType: "cash" | "upi") => {
        setIsSubmitting(true);
        try {
            let targetOrder = activeTableOrder;

            // If new items exist in cart, create/append order first
            if (cartItems.length > 0) {
                if (activeTableOrder) {
                    targetOrder = await api.appendOrderItems(
                        activeTableOrder.id,
                        cartItems.map((ci) => ({
                            item_id: ci.item_id,
                            variant_id: ci.variant_id,
                            qty: ci.qty,
                            notes: ci.notes,
                        }))
                    );
                } else {
                    targetOrder = await api.createOrder({
                        table_id: orderType === "dine_in" ? selectedTable?.id : undefined,
                        outlet_id: selectedOutletId,
                        order_type: orderType,
                        customer_name: customerName.trim() || undefined,
                        customer_phone: customerPhone.trim() || undefined,
                        delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
                        payment_method: paymentType === "cash" ? "counter" : "upi",
                        discount_paise: discountPaise > 0 ? discountPaise : undefined,
                        items: cartItems.map((ci) => ({
                            item_id: ci.item_id,
                            variant_id: ci.variant_id,
                            qty: ci.qty,
                            notes: ci.notes,
                        })),
                    });
                }
            }

            if (!targetOrder) {
                toast.error("No order found to settle");
                return;
            }

            if (paymentType === "cash") {
                // Mark Cash Paid immediately
                await api.markCashPaid(targetOrder.id);
                toast.success(`💵 Order #${targetOrder.order_number || targetOrder.id} settled in Cash!`);
                soundManager.playOrderPlacedSuccess();

                // Print Final POS Receipt
                printPOSReceipt(targetOrder, outlet);

                handleClearCart();
                setSelectedTable(null);
                setActiveTableOrder(null);
                setCustomerName("");
                setCustomerPhone("");
                loadPOSData();
            } else {
                // Open dynamic UPI settlement modal with QR
                setSettlementOrder(targetOrder);
                setIsSettlementModalOpen(true);
            }
        } catch (err: any) {
            toast.error(err.message || "Settlement failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. Print Estimate Bill
    const handlePrintBillEstimate = () => {
        if (activeTableOrder) {
            printPOSReceipt(activeTableOrder, outlet);
            toast.success("📄 Estimate bill sent to printer");
        } else if (cartItems.length > 0) {
            const subtotal = cartItems.reduce((a, b) => a + b.price_paise * b.qty, 0);
            const disc = discountPaise || 0;
            const netAfterDisc = Math.max(0, subtotal - disc);
            const taxRate = outlet?.tax_rate_percent ?? 5;
            const tax = Math.round(netAfterDisc * (taxRate / 100));
            const grandTotal = netAfterDisc + tax + (parcelChargePaise || 0);

            const mockOrder = {
                id: "EST-" + Date.now().toString().slice(-4),
                order_number: "EST-" + Date.now().toString().slice(-4),
                table_id: selectedTable?.id,
                table_label: selectedTable?.label || (orderType === "takeaway" ? "Takeaway" : "Counter"),
                order_type: orderType,
                customer_name: customerName.trim() || "Guest",
                customer_phone: customerPhone.trim() || undefined,
                created_at: new Date().toISOString(),
                subtotal_paise: subtotal,
                discount_paise: disc,
                tax_paise: tax,
                total_paise: grandTotal,
                payment_method: "PROFORMA",
                payment_status: "pending",
                items: cartItems.map((ci) => ({
                    item_name: ci.name,
                    variant_name: ci.variant_name,
                    qty: ci.qty,
                    unit_price_paise: ci.price_paise,
                    total_price_paise: ci.price_paise * ci.qty,
                    notes: ci.notes,
                })),
            };
            printPOSReceipt(mockOrder as any, outlet);
            toast.success("📄 Estimate bill printed");
        } else {
            toast.error("Ticket is empty");
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#0D0A08] text-white overflow-hidden font-sans select-none">
            {/* ══════════════════════════════════════════════════════════════
                TOP POS COMMAND BAR (TMbill / Petpooja Style)
               ══════════════════════════════════════════════════════════════ */}
            <header className="h-14 bg-[#171310] border-b border-[#D4AF37]/30 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-md">
                {/* Left: Brand & Back to Dashboard */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition"
                        title="Back to Admin Kanban"
                    >
                        <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
                    </Link>

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-serif font-black text-sm sm:text-base text-white uppercase tracking-wider leading-none">
                                DineOS POS
                            </h1>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 uppercase">
                                Billing Terminal
                            </span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                            {outlet?.name || "Surya Family Restaurant"} • Cashier: {user?.name || "Admin"}
                        </p>
                    </div>
                </div>

                {/* Center: 3 ORDER MODES TABS (Dine-In / Takeaway / Delivery) */}
                <div className="flex rounded-xl bg-black/60 p-1 border border-white/10 shadow-inner">
                    <button
                        type="button"
                        onClick={() => {
                            setOrderType("dine_in");
                            if (!selectedTable) setIsTableModalOpen(true);
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                            orderType === "dine_in"
                                ? "bg-[#D4AF37] text-black shadow-md"
                                : "text-white/60 hover:text-white"
                        }`}
                    >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Dine-In [F4]</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setOrderType("takeaway");
                            setSelectedTable(null);
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                            orderType === "takeaway"
                                ? "bg-[#D4AF37] text-black shadow-md"
                                : "text-white/60 hover:text-white"
                        }`}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Takeaway [F5]</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setOrderType("delivery");
                            setSelectedTable(null);
                        }}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                            orderType === "delivery"
                                ? "bg-[#D4AF37] text-black shadow-md"
                                : "text-white/60 hover:text-white"
                        }`}
                    >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Delivery</span>
                    </button>
                </div>

                {/* Right: Branch Switcher & Quick Utility Buttons */}
                <div className="flex items-center gap-2">
                    {/* Branch Switcher Pill (Owners/SuperAdmin only; Staff locked to assigned branch) */}
                    {isOwner ? (
                        <div className="flex rounded-xl bg-black/50 border border-white/10 p-0.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setSelectedOutletId(1)}
                                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                    selectedOutletId === 1 ? "bg-amber-500 text-black" : "text-white/60 hover:text-white"
                                }`}
                                title="Switch to Surya Family Restaurant (Kadiri)"
                            >
                                Surya (Kadiri)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedOutletId(2)}
                                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                    selectedOutletId === 2 ? "bg-amber-500 text-black" : "text-white/60 hover:text-white"
                                }`}
                                title="Switch to Branch 2"
                            >
                                B2
                            </button>
                        </div>
                    ) : (
                        <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-extrabold text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>B{user?.outlet_id || 1} • Surya Family Restaurant</span>
                        </div>
                    )}

                    {/* Recent Bills (F7) */}
                    <button
                        type="button"
                        onClick={() => setIsRecentBillsOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                        title="Search & Reprint Recent Bills (F7)"
                    >
                        <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="hidden sm:inline">Bills [F7]</span>
                    </button>

                    {/* Shift Register */}
                    <button
                        type="button"
                        onClick={() => setIsShiftModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition cursor-pointer"
                        title="Cash Drawer & Shift Handover"
                    >
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Shift</span>
                    </button>

                    {/* Test Print Button */}
                    <button
                        type="button"
                        onClick={() => {
                            printTestReceipt(outlet);
                            toast.success("🖨️ Sample receipt sent to thermal printer");
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1 transition cursor-pointer"
                        title="Test Thermal Receipt Printer (80mm / 58mm)"
                    >
                        <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="hidden sm:inline">Test Print</span>
                    </button>

                    {/* Petty Cash Button */}
                    <button
                        type="button"
                        onClick={() => setIsPettyCashOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1 transition cursor-pointer"
                        title="Record Petty Cash Expense"
                    >
                        <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Petty Cash</span>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════════════════════════════════════
                MAIN 2-COLUMN POS LAYOUT (65% MENU GRID | 35% BILLING TICKET)
               ══════════════════════════════════════════════════════════════ */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left 65%: High Speed Menu Matrix */}
                <div className="flex-1 h-full overflow-hidden">
                    <POSMenuGrid
                        items={menuItems}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        onAddItem={handleAddItem}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchRef={searchInputRef}
                    />
                </div>

                {/* Right 35%: Cashier Ticket Cart */}
                <div className="w-full md:w-96 lg:w-[420px] h-full shrink-0 border-t md:border-t-0 md:border-l border-[#D4AF37]/30 shadow-2xl overflow-hidden">
                    <POSTicketCart
                        orderType={orderType}
                        selectedTable={selectedTable}
                        activeTableOrder={activeTableOrder}
                        onOpenTableSelector={() => setIsTableModalOpen(true)}
                        cartItems={cartItems}
                        onUpdateQty={handleUpdateQty}
                        onUpdateNotes={handleUpdateNotes}
                        onRemoveItem={handleRemoveItem}
                        onClearCart={handleClearCart}
                        customerName={customerName}
                        onChangeCustomerName={setCustomerName}
                        customerPhone={customerPhone}
                        onChangeCustomerPhone={setCustomerPhone}
                        deliveryAddress={deliveryAddress}
                        onChangeDeliveryAddress={setDeliveryAddress}
                        discountPaise={discountPaise}
                        onSetDiscountPaise={setDiscountPaise}
                        parcelChargePaise={parcelChargePaise}
                        onToggleParcelCharge={(enabled) => setParcelChargePaise(enabled ? 2000 : 0)}
                        taxRatePercent={outlet?.tax_rate_percent ?? 5}
                        onSendKOT={handleSendKOT}
                        onSettleCash={() => handleSettleQuick("cash")}
                        onSettleUPI={() => handleSettleQuick("upi")}
                        onSettleCard={() => handleSettleQuick("cash")}
                        onPrintBillEstimate={handlePrintBillEstimate}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </main>

            {/* TABLE SELECTION MODAL */}
            <POSTableSelectorModal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                tables={tables}
                activeOrders={activeOrders}
                selectedTableId={selectedTable?.id || null}
                onSelectTable={(table) => {
                    setSelectedTable(table);
                    setOrderType("dine_in");
                }}
            />

            {/* RECENT BILLS & REPRINT MODAL [F7] */}
            {isRecentBillsOpen && (
                <POSRecentBillsModal
                    isOpen={isRecentBillsOpen}
                    onClose={() => {
                        setIsRecentBillsOpen(false);
                        loadPOSData();
                    }}
                    outlet={outlet}
                />
            )}

            {/* CASH DRAWER FLOAT & SHIFT HANDOVER MODAL */}
            {isShiftModalOpen && (
                <POSShiftModal
                    isOpen={isShiftModalOpen}
                    onClose={() => {
                        setIsShiftModalOpen(false);
                        loadPOSData();
                    }}
                    outlet={outlet}
                />
            )}

            {/* PETTY CASH MODAL */}
            <PettyCashModal
                isOpen={isPettyCashOpen}
                onClose={() => setIsPettyCashOpen(false)}
                outletId={selectedOutletId}
            />

            {/* UPI & PAYMENT SETTLEMENT MODAL */}
            {isSettlementModalOpen && settlementOrder && (
                <PaymentSettlementModal
                    isOpen={isSettlementModalOpen}
                    order={settlementOrder}
                    onClose={() => {
                        setIsSettlementModalOpen(false);
                        setSettlementOrder(null);
                        handleClearCart();
                        setSelectedTable(null);
                        setActiveTableOrder(null);
                        loadPOSData();
                    }}
                    onSuccess={() => {
                        setIsSettlementModalOpen(false);
                        setSettlementOrder(null);
                        handleClearCart();
                        setSelectedTable(null);
                        setActiveTableOrder(null);
                        loadPOSData();
                    }}
                />
            )}
        </div>
    );
}
