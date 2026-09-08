"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Coffee,
    Search,
    ShoppingBag,
    UtensilsCrossed,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Bell,
    ArrowRight,
    MapPin,
    QrCode,
    X,
    RefreshCw,
    Truck,
} from "lucide-react";
import { MenuItemCard3D } from "@/components/order/MenuItemCard3D";
import { CategorySection3D, FOCUS_CATEGORY_IDS } from "@/components/order/CategorySection3D";
import { Cart3DFab } from "@/components/order/Cart3DFab";
import { CartDrawer, CartItem } from "@/components/order/CartDrawer";
import { OrderTracker, OrderDetail } from "@/components/order/OrderTracker";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { formatRupees } from "@/lib/formatters";
import { useOffline } from "@/context/OfflineContext";
import { useCustomer } from "@/context/CustomerContext";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";
import { safeStorage } from "@/lib/safeStorage";
import type { MenuItemData } from "@/components/order/MenuItemCard";
import {
    DishCustomizerModal,
    CustomizedSelection,
} from "@/components/order/DishCustomizerModal";
import { MenuGridSkeleton } from "@/components/order/MenuGridSkeleton";
import { SURYA_CATEGORIES, SURYA_MENU_ITEMS } from "@/lib/suryaMenuData";

function CustomerOrderContent() {
    const searchParams = useSearchParams();
    const { language, t } = useLanguage();
    const { isOnline, enqueueOrder } = useOffline();
    const { customer } = useCustomer();
    const { taxRate, outlet } = useOutlet();
    const toast = useToast();

    // ── Branch / Outlet & Table from URL params ─────────────────────────────
    const branchParam = searchParams.get("branch") || searchParams.get("outlet");
    const tableParam = searchParams.get("table");
    const outletId = branchParam ? Number(branchParam) : (typeof window !== "undefined" && safeStorage.getItem("surya_branch", "session") ? Number(safeStorage.getItem("surya_branch", "session")) : 1);
    const [branchOutlet, setBranchOutlet] = useState<any>(null);

    useEffect(() => {
        if (outletId) {
            safeStorage.setItem("surya_branch", String(outletId), "session");
        }
    }, [outletId]);

    // Fetch branch-specific outlet details
    useEffect(() => {
        if (outletId) {
            api.getOutlet(outletId).then((o) => setBranchOutlet(o)).catch(() => {});
        }
    }, [outletId]);

    // Table State — initialize immediately from URL query parameter
    const [tableLabel, setTableLabel] = useState<string>(() => {
        return (tableParam || "T1").toUpperCase();
    });
    const [tableId, setTableId] = useState<number>(1);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
    const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
    const [isCallingWaiter, setIsCallingWaiter] = useState<boolean>(false);

    const handleCallService = async (callType: string = "waiter") => {
        if (!tableId) return;
        setIsCallingWaiter(true);
        try {
            await api.createServiceCall(tableId, callType);
            toast.success(
                language === "te"
                    ? `టేబుల్ ${tableLabel} కోసం సిబ్బందికి సమాచారం పంపబడింది!`
                    : `🔔 Staff notified for Table ${tableLabel}! Coming right over.`
            );
            setShowServiceModal(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to notify staff");
        } finally {
            setIsCallingWaiter(false);
        }
    };

    // Menu Data
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non_veg">("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
    const [customizingItem, setCustomizingItem] = useState<MenuItemData | null>(null);

    // Active Tracking Order
    const [activeOrder, setActiveOrder] = useState<OrderDetail | null>(null);

    // Restore items passed from Home Screen
    useEffect(() => {
        try {
            const savedCart = safeStorage.getItem("surya_cart", "session");
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setCart((prev) => (prev.length === 0 ? parsed : prev));
                }
            }
        } catch (e) {}
    }, []);

    // 1. Initialize Table from URL or Storage with instant reflection and fuzzy matching
    useEffect(() => {
        const savedTable = safeStorage.getItem("surya_table", "session") || safeStorage.getItem("teatime_table", "session");
        const targetLabel = (tableParam || savedTable || "T1").toUpperCase();
        setTableLabel(targetLabel);

        api.getTables(outletId)
            .then((tables) => {
                if (Array.isArray(tables) && tables.length > 0) {
                    setAvailableTables(tables);

                    const matched = tables.find(
                        (t: any) =>
                            t.label?.toUpperCase() === targetLabel ||
                            String(t.id) === targetLabel ||
                            `T${t.id}` === targetLabel ||
                            t.label?.toUpperCase() === `TABLE ${targetLabel}` ||
                            `T${t.label}`.toUpperCase() === targetLabel
                    );

                    if (matched) {
                        setTableLabel(matched.label);
                        setTableId(matched.id);
                        safeStorage.setItem("surya_table", matched.label, "session");
                    } else {
                        const numericId = parseInt(targetLabel.replace(/\D/g, ""), 10);
                        const matchNum = !isNaN(numericId) ? tables.find((t: any) => t.id === numericId) : null;
                        if (matchNum) {
                            setTableLabel(matchNum.label);
                            setTableId(matchNum.id);
                            safeStorage.setItem("surya_table", matchNum.label, "session");
                        } else {
                            setTableId(tables[0].id);
                        }
                    }
                }
            })
            .catch(() => {});

        // Check if there is an existing active order in session
        const savedOrderId = safeStorage.getItem("surya_active_order_id", "session") || safeStorage.getItem("teatime_active_order_id", "session");
        if (savedOrderId) {
            api.getOrder(Number(savedOrderId))
                .then((ord) => {
                    if (ord && ord.status !== "cancelled" && ord.status !== "served") {
                        setActiveOrder(ord);
                    } else {
                        safeStorage.removeItem("surya_active_order_id", "session");
                        safeStorage.removeItem("teatime_active_order_id", "session");
                    }
                })
                .catch(() => {
                    safeStorage.removeItem("surya_active_order_id", "session");
                    safeStorage.removeItem("teatime_active_order_id", "session");
                });
        }
    }, [tableParam, outletId]);

    // 2. Fetch Categories & Menu Items
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchMenuData = useCallback(async () => {
        setIsLoadingMenu(true);
        setLoadError(null);
        try {
            const [cats, items] = await Promise.all([
                api.getCategories(true, outletId).catch(() => null),
                api.getMenu(outletId).catch(() => null),
            ]);
            if (Array.isArray(cats) && cats.length > 0) {
                setCategories(cats);
            } else {
                setCategories(SURYA_CATEGORIES as any);
            }
            if (Array.isArray(items) && items.length > 0) {
                setMenuItems(items);
            } else {
                setMenuItems(SURYA_MENU_ITEMS as any);
            }
        } catch (err: any) {
            console.warn("Backend unavailable, using authentic Surya offline menu:", err);
            setCategories(SURYA_CATEGORIES as any);
            setMenuItems(SURYA_MENU_ITEMS as any);
        } finally {
            setIsLoadingMenu(false);
        }
    }, [outletId]);

    useEffect(() => {
        fetchMenuData();
    }, [fetchMenuData]);


    // Filter Menu Items
    const filteredItems = useMemo(() => {
        return menuItems.filter((item) => {
            // Category filter
            if (selectedCategory !== "all" && item.category_id !== selectedCategory) {
                return false;
            }
            // Veg filter
            if (vegFilter === "veg" && !item.is_veg) return false;
            if (vegFilter === "non_veg" && item.is_veg) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchEn = item.name.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
                const matchTe = item.name_te?.toLowerCase().includes(q) || (item.description_te?.toLowerCase().includes(q) ?? false);
                if (!matchEn && !matchTe) return false;
            }
            return true;
        });
    }, [menuItems, selectedCategory, vegFilter, searchQuery]);

    // Group filtered items by category for the 3D section view
    const groupedByCategory = useMemo(() => {
        const groups: { categoryId: number; category: any; items: MenuItemData[] }[] = [];
        const catMap = new Map<number, MenuItemData[]>();

        for (const item of filteredItems) {
            if (!catMap.has(item.category_id)) {
                catMap.set(item.category_id, []);
            }
            catMap.get(item.category_id)!.push(item);
        }

        // Sort categories by their sort_order
        const sortedCatIds = categories
            .filter((c) => catMap.has(c.id))
            .map((c) => c.id);

        // Add any categories not in the categories array
        for (const catId of catMap.keys()) {
            if (!sortedCatIds.includes(catId)) {
                sortedCatIds.push(catId);
            }
        }

        for (const catId of sortedCatIds) {
            const cat = categories.find((c) => c.id === catId);
            const items = catMap.get(catId);
            if (items && items.length > 0) {
                groups.push({
                    categoryId: catId,
                    category: cat || { id: catId, name: "Other", name_te: "" },
                    items,
                });
            }
        }

        return groups;
    }, [filteredItems, categories]);

    // Cart Helpers
    const cartCount = cart.reduce((sum, it) => sum + it.qty, 0);
    const cartSubtotalPaise = cart.reduce((sum, it) => sum + it.price_paise * it.qty, 0);
    const cartTaxPaise = Math.round(cartSubtotalPaise * taxRate);
    const cartTotalPaise = cartSubtotalPaise + cartTaxPaise;

    const handleAddToCart = (item: MenuItemData) => {
        const hasVariants = (item as any).variants && (item as any).variants.length > 0;
        const hasAddons = (item as any).addons && (item as any).addons.length > 0;

        if (hasVariants || hasAddons) {
            setCustomizingItem(item);
        } else {
            const cartKey = `item_${item.id}`;
            setCart((prev) => {
                const existing = prev.find((i) => (i.cartKey || `item_${i.id}`) === cartKey);
                if (existing) {
                    return prev.map((i) =>
                        (i.cartKey || `item_${i.id}`) === cartKey ? { ...i, qty: i.qty + 1 } : i
                    );
                }
                return [
                    ...prev,
                    {
                        id: item.id,
                        cartKey,
                        name: item.name,
                        name_te: item.name_te || undefined,
                        price_paise: item.price_paise,
                        qty: 1,
                    },
                ];
            });
            toast.success(`${language === "te" && item.name_te ? item.name_te : item.name} ${t("added")}`);
        }
    };

    const handleCustomizedAddToCart = (customized: CustomizedSelection) => {
        const variantId = customized.variant?.id || "base";
        const addonIdsKey = customized.addons.map((a) => a.id).sort().join("-");
        const cartKey = `item_${customized.item.id}_v_${variantId}_a_${addonIdsKey}`;

        const unitPaise =
            (customized.variant ? customized.variant.price_paise : customized.item.price_paise) +
            customized.addons.reduce((sum, a) => sum + a.price_paise, 0);

        setCart((prev) => {
            const existing = prev.find((ci) => ci.cartKey === cartKey);
            if (existing) {
                return prev.map((ci) =>
                    ci.cartKey === cartKey ? { ...ci, qty: ci.qty + customized.qty } : ci
                );
            }
            return [
                ...prev,
                {
                    id: customized.item.id,
                    cartKey,
                    variant_id: customized.variant?.id,
                    variant_name: customized.variant?.name,
                    addon_ids: customized.addons.map((a) => a.id),
                    addons: customized.addons.map((a) => ({ name: a.name, price_paise: a.price_paise })),
                    name: customized.item.name,
                    name_te: customized.item.name_te || undefined,
                    price_paise: unitPaise,
                    qty: customized.qty,
                    notes: customized.notes || undefined,
                },
            ];
        });

        toast.success(
            `${language === "te" && customized.item.name_te ? customized.item.name_te : customized.item.name} ${customized.variant ? `(${customized.variant.name})` : ""} ${t("added")}`
        );
    };

    const handleRemoveFromCart = (itemId: number, cartKey?: string) => {
        setCart((prev) => {
            const matchKey = cartKey || `item_${itemId}`;
            const existing = prev.find((i) => (i.cartKey || `item_${i.id}`) === matchKey);
            if (existing && existing.qty > 1) {
                return prev.map((i) =>
                    (i.cartKey || `item_${i.id}`) === matchKey ? { ...i, qty: i.qty - 1 } : i
                );
            }
            return prev.filter((i) => (i.cartKey || `item_${i.id}`) !== matchKey);
        });
    };

    const handleUpdateQty = (itemId: number, delta: number, cartKey?: string) => {
        if (delta > 0) {
            setCart((prev) => {
                const matchKey = cartKey || `item_${itemId}`;
                return prev.map((i) =>
                    (i.cartKey || `item_${i.id}`) === matchKey ? { ...i, qty: i.qty + 1 } : i
                );
            });
        } else {
            handleRemoveFromCart(itemId, cartKey);
        }
    };

    const handleUpdateNotes = (itemId: number, notes: string, cartKey?: string) => {
        const matchKey = cartKey || `item_${itemId}`;
        setCart((prev) =>
            prev.map((i) => ((i.cartKey || `item_${i.id}`) === matchKey ? { ...i, notes } : i))
        );
    };

    const handleClearItem = (itemId: number, cartKey?: string) => {
        const matchKey = cartKey || `item_${itemId}`;
        setCart((prev) => prev.filter((i) => (i.cartKey || `item_${i.id}`) !== matchKey));
    };

    // Checkout Flow with Idempotency Key
    const handleCheckout = async (paymentMethod: "counter" | "upi", customerNotes: string) => {
        setIsPlacingOrder(true);
        try {
            const idempotencyKey =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `idemp_${Math.random().toString(36).substring(2)}_${Date.now()}`;

            const payload = {
                table_id: tableId,
                outlet_id: outletId,
                idempotency_key: idempotencyKey,
                customer_notes: customerNotes,
                payment_method: paymentMethod,
                items: cart.map((i) => ({
                    item_id: i.id,
                    variant_id: i.variant_id,
                    addon_ids: i.addon_ids,
                    qty: i.qty,
                    notes: i.notes,
                })),
            };

            let createdOrder;
            if (!isOnline) {
                const queueId = await enqueueOrder(payload, "dine_in");
                createdOrder = {
                    id: Date.now(),
                    order_number: `OFFLINE-${queueId.slice(-6).toUpperCase()}`,
                    outlet_id: outletId,
                    table_id: tableId,
                    table_label: tableLabel,
                    status: "placed",
                    subtotal_paise: cartSubtotalPaise,
                    tax_paise: cartTaxPaise,
                    total_paise: cartTotalPaise,
                    payment_status: "pending",
                    payment_method: paymentMethod,
                    created_at: new Date().toISOString(),
                    items: cart.map((i) => ({
                        id: Math.random(),
                        item_name: i.name,
                        variant_name: i.variant_name,
                        selected_addons_json: JSON.stringify(i.addons || []),
                        qty: i.qty,
                        unit_price_paise: i.price_paise,
                        total_price_paise: i.price_paise * i.qty,
                        notes: i.notes,
                    })),
                };
                toast.success(
                    language === "en"
                        ? `You are offline. Order #${queueId} has been safely queued and will auto-submit when reconnected!`
                        : `మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. ఆర్డర్ #${queueId} సేవ్ చేయబడింది!`
                );
            } else {
                createdOrder = await api.createOrder(payload);
            }

            // Clear Cart and Switch to Tracker
            setCart([]);
            setIsCartOpen(false);
            setActiveOrder(createdOrder);
            safeStorage.setItem("surya_active_order_id", String(createdOrder.id), "session");

            toast.success(
                language === "en"
                    ? `Order #${createdOrder.order_number} placed successfully!`
                    : `ఆర్డర్ #${createdOrder.order_number} నమోదు అయింది!`
            );
        } catch (err: any) {
            toast.error(err.message || "Failed to place order. Please check item availability.");
            // Refresh menu in case of stock race condition
            api.getMenu(outletId).then((items) => setMenuItems(items)).catch(() => {});
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleSelectTable = (tbl: any) => {
        setTableLabel(tbl.label);
        setTableId(tbl.id);
        safeStorage.setItem("surya_table", tbl.label, "session");
        setShowTablePicker(false);
        toast.info(`Switched to Table ${tbl.label}`);
    };

    // If customer has an active order tracking session, show the tracker view
    if (activeOrder) {
        return (
            <main className="min-h-screen bg-cream-50 text-espresso-950 flex flex-col">
                <header className="border-b border-cream-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt="Arabic Restaurant Logo"
                                className="h-10 w-auto object-contain"
                            />
                        </div>
                        <LanguageToggle />
                    </div>
                </header>

                <OrderTracker
                    initialOrder={activeOrder}
                    onOrderMore={() => {
                        setActiveOrder(null);
                        safeStorage.removeItem("surya_active_order_id", "session");
                        safeStorage.removeItem("teatime_active_order_id", "session");
                    }}
                />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cream-50 text-espresso-950 flex flex-col justify-between pb-28">
            {/* Header */}
            <header className="border-b border-cream-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <img
                            src="/logo.png"
                            alt="Surya Family Restaurant Logo"
                            className="h-10 sm:h-11 w-auto object-contain"
                        />
                        <div className="hidden sm:block">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                                {branchOutlet?.name || "Surya Family Restaurant"}
                            </span>
                            <span className="text-[10px] text-espresso-500 font-medium">
                                Opp. RTC Bus Stand, Kadiri
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Branch indicator on mobile */}
                        <span className="sm:hidden text-[10px] font-black px-2 py-0.5 rounded-full bg-terracotta-100 text-terracotta-800">
                            B{outletId || 1}
                        </span>

                        {/* Table Selector Pill */}
                        <button
                            onClick={() => setShowTablePicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-terracotta-300 bg-terracotta-50 text-terracotta-800 text-xs font-bold shadow-2xs hover:bg-terracotta-100 transition cursor-pointer"
                        >
                            <MapPin className="w-3.5 h-3.5 text-terracotta-600" />
                            <span>{t("table")} {tableLabel}</span>
                        </button>

                        {/* Call Waiter Pill */}
                        <button
                            onClick={() => setShowServiceModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/80 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-extrabold shadow-2xs transition cursor-pointer"
                        >
                            <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                            <span className="hidden sm:inline">Call Waiter</span>
                            <span className="sm:hidden">Bell</span>
                        </button>

                        <LanguageToggle />
                    </div>
                </div>
            </header>

            {/* Menu Content */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 w-full space-y-4">
                {/* Free Delivery Callout Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0 shadow-xs">
                            <Truck className="w-4 h-4" />
                        </span>
                        <div>
                            <span className="font-extrabold text-espresso-950 block">
                                Want food delivered to your home or office in Kadiri?
                            </span>
                            <span className="text-[11px] text-espresso-600">
                                100% Free Doorstep Delivery • 30–40 mins
                            </span>
                        </div>
                    </div>
                    <Link
                        href={`/delivery?branch=${outletId || 1}`}
                        className="px-3.5 py-1.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white font-extrabold text-[11px] shrink-0 transition flex items-center gap-1 cursor-pointer"
                    >
                        <span>Order Delivery</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Search Bar & Dietary Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={language === "en" ? "Search Mandi, Biryani, Shawarma, Grills, Starters..." : "మండి, బిర్యానీ, షవర్మా, గ్రిల్స్ వెతకండి..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-cream-300 bg-white placeholder:text-espresso-400 text-xs sm:text-sm focus:outline-none focus:border-terracotta-500 shadow-2xs"
                        />
                    </div>

                    {/* Veg / Non-Veg Toggle */}
                    <div className="flex items-center p-1 rounded-2xl bg-white border border-cream-300 shadow-2xs self-start sm:self-auto">
                        <button
                            onClick={() => setVegFilter("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                vegFilter === "all" ? "bg-espresso-900 text-white" : "text-espresso-600 hover:bg-cream-100"
                            }`}
                        >
                            {t("all_types")}
                        </button>
                        <button
                            onClick={() => setVegFilter("veg")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                vegFilter === "veg" ? "bg-emerald-600 text-white" : "text-emerald-800 hover:bg-emerald-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span>{t("veg")}</span>
                        </button>
                        <button
                            onClick={() => setVegFilter("non_veg")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                vegFilter === "non_veg" ? "bg-red-600 text-white" : "text-red-800 hover:bg-red-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                            <span>{t("non_veg")}</span>
                        </button>
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedCategory === "all"
                                ? "bg-terracotta-500 text-white shadow-sm shadow-terracotta-500/20"
                                : "bg-white border border-cream-300 text-espresso-800 hover:bg-cream-100"
                        }`}
                    >
                        {t("all_categories")}
                    </button>

                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                selectedCategory === cat.id
                                    ? "bg-terracotta-500 text-white shadow-sm shadow-terracotta-500/20"
                                    : "bg-white border border-cream-300 text-espresso-800 hover:bg-cream-100"
                            }`}
                        >
                            {language === "te" && cat.name_te ? cat.name_te : cat.name}
                        </button>
                    ))}
                </div>

                {/* Menu Items */}
                {isLoadingMenu ? (
                    <div className="py-2">
                        <MenuGridSkeleton count={8} />
                    </div>
                ) : loadError ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-cream-300 shadow-sm max-w-md mx-auto my-8">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-saffron-600" />
                        <h3 className="text-base font-bold text-espresso-950">Menu Still Loading</h3>
                        <p className="text-xs text-espresso-600 mt-1.5 leading-relaxed">{loadError}</p>
                        <Button
                            size="md"
                            variant="primary"
                            className="mt-5 mx-auto"
                            onClick={fetchMenuData}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Retry Loading Menu
                        </Button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-cream-200">
                        <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-espresso-300" />
                        <h3 className="text-base font-bold text-espresso-950">No items match your filter</h3>
                        <p className="text-xs text-espresso-500 mt-1">Try searching for something else or clearing filters.</p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setSelectedCategory("all");
                                setVegFilter("all");
                                setSearchQuery("");
                            }}
                        >
                            Reset Filters
                        </Button>
                    </div>
                ) : selectedCategory === "all" ? (
                    /* ═══ GROUPED BY CATEGORY — 3D Sections ═══ */
                    <div>
                        {groupedByCategory.map((group, sectionIdx) => (
                            <CategorySection3D
                                key={group.categoryId}
                                categoryId={group.categoryId}
                                categoryName={group.category.name}
                                categoryNameTe={group.category.name_te}
                                items={group.items}
                                cart={cart}
                                onAdd={handleAddToCart}
                                onRemove={handleRemoveFromCart}
                                sectionIndex={sectionIdx}
                            />
                        ))}
                    </div>
                ) : (
                    /* ═══ SINGLE CATEGORY — Grid ═══ */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredItems.map((item, idx) => {
                            const cartItem = cart.find((i) => i.id === item.id);
                            return (
                                <MenuItemCard3D
                                    key={item.id}
                                    item={item}
                                    cartQty={cartItem?.qty || 0}
                                    onAdd={() => handleAddToCart(item)}
                                    onRemove={() => handleRemoveFromCart(item.id)}
                                    staggerIndex={idx}
                                    themeColor={
                                        FOCUS_CATEGORY_IDS.includes(item.category_id)
                                            ? undefined
                                            : "terracotta"
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ═══ 3D FLOATING CART FAB ═══ */}
            <Cart3DFab
                cartCount={cartCount}
                cartTotalPaise={cartTotalPaise}
                onClick={() => setIsCartOpen(true)}
            />

            {/* Cart Drawer */}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                items={cart}
                tableLabel={tableLabel}
                onUpdateQty={handleUpdateQty}
                onUpdateNotes={handleUpdateNotes}
                onClearItem={handleClearItem}
                onCheckout={handleCheckout}
                isPlacingOrder={isPlacingOrder}
                onClearCart={() => setCart([])}
            />

            {/* Customization Modal */}
            <DishCustomizerModal
                isOpen={!!customizingItem}
                item={customizingItem}
                language={language}
                onClose={() => setCustomizingItem(null)}
                onAddToCart={handleCustomizedAddToCart}
            />

            {/* Table Selector Modal */}
            {showTablePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-terracotta-500" />
                                <h3 className="text-base font-bold text-espresso-950">Select Your Table</h3>
                            </div>
                            <button
                                onClick={() => setShowTablePicker(false)}
                                className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-espresso-600 mb-4">
                            Each physical table in the cafe has a unique QR code. Pick your table number below:
                        </p>

                        <div className="grid grid-cols-4 gap-2.5 mb-6">
                            {availableTables.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSelectTable(t)}
                                    className={`py-3 rounded-2xl border text-sm font-extrabold transition cursor-pointer ${
                                        tableLabel === t.label
                                            ? "border-terracotta-500 bg-terracotta-500 text-white shadow-md shadow-terracotta-500/30"
                                            : "border-cream-300 bg-cream-50 hover:bg-cream-100 text-espresso-900"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowTablePicker(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Call Waiter / Service Bell Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Bell className="w-4 h-4" />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-espresso-950">Table {tableLabel} Assistance</h3>
                                    <p className="text-[11px] text-espresso-500 font-medium">How can our staff assist you?</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowServiceModal(false)}
                                className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 mb-5">
                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("waiter")}
                                className="p-3.5 rounded-2xl border border-cream-300 bg-cream-50 hover:border-terracotta-400 hover:bg-cream-100 transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                            >
                                <span className="text-2xl">🛎️</span>
                                <span className="text-xs font-black text-espresso-900">Call Waiter</span>
                                <span className="text-[10px] text-espresso-500 font-medium">Order assistance</span>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("water")}
                                className="p-3.5 rounded-2xl border border-cream-300 bg-cream-50 hover:border-cyan-400 hover:bg-cyan-50/50 transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                            >
                                <span className="text-2xl">💧</span>
                                <span className="text-xs font-black text-espresso-900">Drinking Water</span>
                                <span className="text-[10px] text-espresso-500 font-medium">Refill water</span>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("bill")}
                                className="p-3.5 rounded-2xl border border-cream-300 bg-cream-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                            >
                                <span className="text-2xl">🧾</span>
                                <span className="text-xs font-black text-espresso-900">Request Bill</span>
                                <span className="text-[10px] text-espresso-500 font-medium">Pay at table</span>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("clean")}
                                className="p-3.5 rounded-2xl border border-cream-300 bg-cream-50 hover:border-amber-400 hover:bg-amber-50/50 transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                            >
                                <span className="text-2xl">🧹</span>
                                <span className="text-xs font-black text-espresso-900">Clean Table</span>
                                <span className="text-[10px] text-espresso-500 font-medium">Clear table</span>
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowServiceModal(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function CustomerOrderPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-espresso-600 font-medium">Loading Surya Family Restaurant...</div>}>
            <CustomerOrderContent />
        </Suspense>
    );
}
