"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Coffee,
    Search,
    ShoppingBag,
    UtensilsCrossed,
    Utensils,
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
    Flame,
    Salad,
    CircleDot,
    Crown,
    Soup,
    Droplets,
    Receipt,
    User,
    Star,
} from "lucide-react";
import { MenuItemCard3D } from "@/components/order/MenuItemCard3D";
import { CategorySection3D, FOCUS_CATEGORY_IDS } from "@/components/order/CategorySection3D";
import { Cart3DFab } from "@/components/order/Cart3DFab";
import { CartDrawer, CartItem } from "@/components/order/CartDrawer";
import { OrderTracker, OrderDetail } from "@/components/order/OrderTracker";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";
import { CustomerAuthModal } from "@/components/customer/CustomerAuthModal";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { formatRupees } from "@/lib/formatters";
import { useOffline } from "@/context/OfflineContext";
import { useCustomer } from "@/context/CustomerContext";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";
import { isTableOrderingEnabled } from "@/lib/features";
import { safeStorage } from "@/lib/safeStorage";
import { trackAddToCart, trackOrderPlaced, trackCallWaiter } from "@/lib/analytics";
import type { MenuItemData } from "@/components/order/MenuItemCard";
import {
    DishCustomizerModal,
    CustomizedSelection,
} from "@/components/order/DishCustomizerModal";
import { MenuGridSkeleton } from "@/components/order/MenuGridSkeleton";
import { SURYA_CATEGORIES, SURYA_MENU_ITEMS } from "@/lib/suryaMenuData";

export function getCategoryIcon(catId: number | string, className: string = "w-3.5 h-3.5") {
    switch (Number(catId)) {
        case 1:
            return <Flame className={`${className} text-orange-500`} />;
        case 2:
            return <UtensilsCrossed className={`${className} text-amber-600`} />;
        case 3:
            return <Flame className={`${className} text-red-500`} />;
        case 4:
            return <Flame className={`${className} text-rose-600`} />;
        case 5:
            return <Salad className={`${className} text-emerald-600`} />;
        case 6:
            return <CircleDot className={`${className} text-amber-600`} />;
        case 7:
            return <Crown className={`${className} text-amber-500`} />;
        case 8:
            return <Soup className={`${className} text-orange-500`} />;
        case 9:
            return <Sparkles className={`${className} text-pink-500`} />;
        case 10:
            return <Coffee className={`${className} text-cyan-600`} />;
        default:
            return <Utensils className={`${className} text-espresso-700`} />;
    }
}

const DEFAULT_TABLES = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    label: `T${i + 1}`,
    status: "free",
}));

function CustomerOrderContent() {
    const searchParams = useSearchParams();
    const { language, t } = useLanguage();
    const { isOnline, enqueueOrder } = useOffline();
    const { customer, isCustomerLoggedIn, logoutCustomer, authModalOpen, setAuthModalOpen, requireCustomerAuth } = useCustomer();
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
    const [tableId, setTableId] = useState<number>(() => {
        if (tableParam) {
            const num = parseInt(tableParam.replace(/\D/g, ""), 10);
            if (!isNaN(num) && num > 0) return num;
        }
        return 1;
    });
    const [availableTables, setAvailableTables] = useState<any[]>(() => DEFAULT_TABLES);
    const [showTablePicker, setShowTablePicker] = useState<boolean>(false);
    const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
    const [isCallingWaiter, setIsCallingWaiter] = useState<boolean>(false);

    const handleCallService = async (callType: string = "waiter") => {
        if (!tableId) return;
        setIsCallingWaiter(true);
        try {
            await api.createServiceCall(tableId, callType);
            trackCallWaiter(tableLabel, callType);
            toast.success(
                language === "te"
                    ? `టేబుల్ ${tableLabel} కోసం సిబ్బందికి సమాచారం పంపబడింది!`
                    : `Staff notified for Table ${tableLabel}! Floor captain is coming over.`
            );
            setShowServiceModal(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to notify staff");
        } finally {
            setIsCallingWaiter(false);
        }
    };

    // Menu Data — initialize immediately with authentic offline menu dataset for instant 0ms first-paint
    const [categories, setCategories] = useState<any[]>(() => SURYA_CATEGORIES as any);
    const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => SURYA_MENU_ITEMS as any);
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non_veg">("all");
    const [onlyBestsellers, setOnlyBestsellers] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(false);

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
        const savedTable = safeStorage.getItem("surya_table", "session");
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
        const savedOrderId = safeStorage.getItem("surya_active_order_id", "session");
        if (savedOrderId) {
            api.getOrder(Number(savedOrderId))
                .then((ord) => {
                    if (ord && ord.status !== "cancelled" && ord.status !== "served") {
                        setActiveOrder(ord);
                    } else {
                        safeStorage.removeItem("surya_active_order_id", "session");
                    }
                })
                .catch(() => {
                    safeStorage.removeItem("surya_active_order_id", "session");
                });
        }
    }, [tableParam, outletId]);

    // 2. Fetch Categories & Menu Items
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchMenuData = useCallback(async () => {
        setLoadError(null);
        try {
            const [cats, items] = await Promise.all([
                api.getCategories(true, outletId).catch(() => null),
                api.getMenu(outletId).catch(() => null),
            ]);
            if (Array.isArray(cats) && cats.length > 0) {
                setCategories(cats);
            }
            if (Array.isArray(items) && items.length > 0) {
                setMenuItems(items);
            }
        } catch (err: any) {
            console.warn("Backend unavailable, using authentic Surya offline menu:", err);
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
            // Bestsellers filter
            if (onlyBestsellers && !item.is_special && !(item as any).is_best_seller) {
                return false;
            }
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
    }, [menuItems, selectedCategory, vegFilter, searchQuery, onlyBestsellers]);

    const handleSelectCategory = (catId: number | "all") => {
        setOnlyBestsellers(false);
        setSelectedCategory(catId);
        if (catId !== "all") {
            setTimeout(() => {
                const el = document.getElementById(`category-${catId}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                }
            }, 50);
        }
    };

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
            trackAddToCart({
                id: item.id,
                name: item.name,
                priceRupees: item.price_paise / 100,
                qty: 1,
            });
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
        trackAddToCart({
            id: customized.item.id,
            name: customized.item.name,
            priceRupees: unitPaise / 100,
            qty: customized.qty,
            variant: customized.variant?.name,
        });
    };

    const handleRemoveFromCart = (itemId: number, cartKey?: string) => {
        setCart((prev) => {
            if (cartKey) {
                const existing = prev.find((i) => (i.cartKey || `item_${i.id}`) === cartKey);
                if (existing && existing.qty > 1) {
                    return prev.map((i) =>
                        (i.cartKey || `item_${i.id}`) === cartKey ? { ...i, qty: i.qty - 1 } : i
                    );
                }
                return prev.filter((i) => (i.cartKey || `item_${i.id}`) !== cartKey);
            }
            // If no cartKey specified, decrement the most recent entry with this item id
            const match = [...prev].reverse().find((i) => i.id === itemId);
            if (!match) return prev;
            const targetKey = match.cartKey || `item_${match.id}`;
            if (match.qty > 1) {
                return prev.map((i) =>
                    (i.cartKey || `item_${i.id}`) === targetKey ? { ...i, qty: i.qty - 1 } : i
                );
            }
            return prev.filter((i) => (i.cartKey || `item_${i.id}`) !== targetKey);
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
    const handleCheckout = async (
        paymentMethod: "counter" | "upi",
        customerNotes: string,
        promo?: { code: string; discount_paise: number }
    ) => {
        // Enforce mandatory customer login gate before placing order
        if (!isCustomerLoggedIn) {
            requireCustomerAuth(() => {
                handleCheckout(paymentMethod, customerNotes, promo);
            });
            return;
        }

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
                order_type: "dine_in" as const,
                customer_name: customer?.name || undefined,
                customer_phone: customer?.phone || undefined,
                customer_notes: customerNotes,
                payment_method: paymentMethod,
                coupon_code: promo?.code,
                discount_paise: promo?.discount_paise,
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
            trackOrderPlaced({
                orderNumber: createdOrder.order_number,
                orderType: "dine_in",
                totalRupees: (createdOrder.total_paise || cartTotalPaise) / 100,
                tableLabel: tableLabel,
                customerPhone: customer?.phone || undefined,
                paymentMethod: paymentMethod,
                items: cart.map((i) => ({
                    name: i.name,
                    priceRupees: i.price_paise / 100,
                    qty: i.qty,
                    variant: i.variant_name || undefined,
                })),
            });
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
                        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
                            <SuryaSunLogo size={36} />
                            <div>
                                <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">
                                    Surya Family Restaurant
                                </span>
                                <span className="text-[10px] text-espresso-500 font-medium">
                                    Opp. RTC Bus Stand, Kadiri
                                </span>
                            </div>
                        </Link>
                        <LanguageToggle />
                    </div>
                </header>

                <OrderTracker
                    initialOrder={activeOrder}
                    onOrderMore={() => {
                        setActiveOrder(null);
                        safeStorage.removeItem("surya_active_order_id", "session");
                    }}
                />
            </main>
        );
    }

    // Check if table QR ordering is enabled for this outlet
    const currentOutlet = branchOutlet || outlet;
    const tableOrderingActive = isTableOrderingEnabled(currentOutlet);

    if (!tableOrderingActive) {
        return (
            <main className="min-h-screen bg-cream-50 text-espresso-950 flex flex-col justify-between">
                <header className="border-b border-cream-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
                            <SuryaSunLogo size={36} />
                            <div>
                                <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">
                                    Surya Family Restaurant
                                </span>
                                <span className="text-[10px] text-espresso-500 font-medium">
                                    Opp. RTC Bus Stand, Kadiri
                                </span>
                            </div>
                        </Link>
                        <LanguageToggle />
                    </div>
                </header>

                <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-400/40 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                        <QrCode className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            Table QR Ordering Paused
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-espresso-950">
                            {language === "te"
                                ? "ఆన్‌లైన్ డెలివరీ మాత్రమే అందుబాటులో ఉంది"
                                : "Online Delivery & Takeaway Is Active"}
                        </h1>
                        <p className="text-sm text-espresso-600 max-w-md mx-auto">
                            {language === "te"
                                ? "డైన్-ఇన్ టేబుల్ సెల్ఫ్ ఆర్డరింగ్ ప్రస్తుతం తాత్కాలికంగా నిలిపివేయబడింది. దయచేసి వెయిటర్‌ని పిలవండి లేదా కదిరి అంతటా ఉచిత డోర్‌స్టెప్ డెలివరీ కోసం మా ఆన్‌లైన్ డెలివరీ ద్వారా ఆర్డర్ చేయండి!"
                                : "Self-service Table QR ordering is currently paused. Please request service from our floor staff or order through our online delivery service with 100% free doorstep delivery across Kadiri!"}
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href={`/delivery?branch=${outletId || 1}`}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-espresso-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                        >
                            <Truck className="w-4 h-4" />
                            <span>ORDER ONLINE NOW (FREE DELIVERY)</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/"
                            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-cream-100 border border-cream-300 text-espresso-800 font-bold text-sm transition text-center"
                        >
                            Return to Home
                        </Link>
                    </div>
                </div>

                <footer className="text-center py-6 text-xs text-espresso-400 border-t border-cream-200">
                    Surya Family Restaurant • Opp. RTC Bus Stand, Kadiri • Ph: +91 91771 78609
                </footer>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cream-50 text-espresso-950 flex flex-col justify-between pb-32">
            {/* Header — Smartphone & Tablet Optimized */}
            <header className="border-b border-cream-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
                <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition min-w-0 shrink">
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-xs scale-110" />
                            <SuryaSunLogo size={34} className="relative shrink-0" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 block truncate">
                                {branchOutlet?.name || "Surya Restaurant"}
                            </span>
                            <span className="text-[10px] text-espresso-500 font-semibold hidden xs:block truncate">
                                Opp. RTC Bus Stand, Kadiri
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Table Indicator Pill with live pulsating green dot */}
                        <button
                            onClick={() => setShowTablePicker(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-[11px] sm:text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Tap to change table"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>Table {tableLabel}</span>
                            <span className="text-[9.5px] text-emerald-700 font-medium underline decoration-dotted hidden xs:inline">Change</span>
                        </button>

                        {/* Call Waiter Pill */}
                        <button
                            onClick={() => setShowServiceModal(true)}
                            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full border border-amber-400/90 bg-gradient-to-r from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 text-amber-950 text-[11px] sm:text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Call waiter or request service"
                        >
                            <Bell className="w-3.5 h-3.5 text-amber-700 animate-bounce shrink-0" />
                            <span className="hidden xs:inline">Waiter</span>
                        </button>

                        {/* Customer Session Status Pill */}
                        {isCustomerLoggedIn ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-amber-300 bg-amber-500/15 text-espresso-950 text-[11px] sm:text-xs font-bold shadow-2xs">
                                <User className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                <span className="max-w-[65px] sm:max-w-[110px] truncate text-[11px] font-black">
                                    {customer?.name ? customer.name.split(' ')[0] : customer?.phone}
                                </span>
                                <button
                                    type="button"
                                    onClick={logoutCustomer}
                                    title="Sign Out"
                                    className="text-[10px] text-terracotta-700 hover:text-terracotta-900 ml-0.5 font-bold cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => requireCustomerAuth()}
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full border border-espresso-900 bg-espresso-900 hover:bg-espresso-800 text-amber-300 text-[11px] sm:text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
                            >
                                <span>Sign In</span>
                            </button>
                        )}

                        <LanguageToggle />
                    </div>
                </div>
            </header>

            {/* Menu Content */}
            <section className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 w-full space-y-3.5">
                {/* Mobile Restaurant Identity & Kadiri Reputation Strip */}
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-lg shadow-2xs">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                            <span>4.8</span>
                        </span>
                        <span className="text-espresso-800 font-bold text-[11px]">
                            1,200+ Reviews
                        </span>
                        <span className="text-espresso-400 hidden xs:inline">•</span>
                        <span className="text-espresso-600 text-[11px] hidden xs:inline">
                            Kadiri • Pure Ghee & Halal
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Kitchen Live • Fresh & Hot</span>
                    </div>
                </div>

                {/* Free Delivery Callout Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500 text-espresso-950 flex items-center justify-center shrink-0 shadow-xs">
                            <Truck className="w-4 h-4" />
                        </span>
                        <div>
                            <span className="font-extrabold text-espresso-950 block">
                                Want food delivered to home or office in Kadiri?
                            </span>
                            <span className="text-[11px] text-espresso-600">
                                100% Free Doorstep Delivery • 30–40 mins
                            </span>
                        </div>
                    </div>
                    <Link
                        href={`/delivery?branch=${outletId || 1}`}
                        className="px-3 py-1.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white font-black text-[11px] shrink-0 transition flex items-center justify-center gap-1 cursor-pointer self-start sm:self-center"
                    >
                        <span>Order Delivery</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Search Bar & Dietary Filter */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={language === "en" ? "Search Biryani, Punjabi Curries, Tandoori, Naan..." : "బిర్యానీ, పంజాబీ కర్రీలు, తందూరీ, నాన్ వెతకండి..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-cream-300 bg-white placeholder:text-espresso-400 text-xs sm:text-sm focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-espresso-700"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Veg / Non-Veg Toggle */}
                    <div className="flex items-center justify-between sm:justify-start p-1 rounded-2xl bg-white border border-cream-300 shadow-2xs w-full sm:w-auto">
                        <button
                            onClick={() => setVegFilter("all")}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                                vegFilter === "all" ? "bg-espresso-900 text-white" : "text-espresso-600 hover:bg-cream-100"
                            }`}
                        >
                            {t("all_types")}
                        </button>
                        <button
                            onClick={() => setVegFilter("veg")}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                vegFilter === "veg" ? "bg-emerald-600 text-white" : "text-emerald-800 hover:bg-emerald-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                            <span>{t("veg")}</span>
                        </button>
                        <button
                            onClick={() => setVegFilter("non_veg")}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                vegFilter === "non_veg" ? "bg-red-600 text-white" : "text-red-800 hover:bg-red-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
                            <span>{t("non_veg")}</span>
                        </button>
                    </div>
                </div>

                {/* ═══ STICKY CATEGORY HORIZONTAL CAROUSEL ═══ */}
                <div className="sticky top-[49px] sm:top-[55px] z-30 bg-cream-50/95 backdrop-blur-md -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 border-b border-cream-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => handleSelectCategory("all")}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                selectedCategory === "all" && !onlyBestsellers
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]"
                                    : "bg-white border border-cream-300/90 text-espresso-800 hover:bg-cream-100 shadow-2xs"
                            }`}
                        >
                            <Utensils className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("all_categories")}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                selectedCategory === "all" && !onlyBestsellers ? "bg-white/20 text-white" : "bg-cream-100 text-espresso-600"
                            }`}>
                                {menuItems.length}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                setOnlyBestsellers(!onlyBestsellers);
                                if (!onlyBestsellers) setSelectedCategory("all");
                            }}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                onlyBestsellers
                                    ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/25 scale-[1.02]"
                                    : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 shadow-2xs"
                            }`}
                        >
                            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Bestsellers</span>
                        </button>

                        {categories.map((cat) => {
                            const count = menuItems.filter((i) => i.category_id === cat.id).length;
                            const isSelected = selectedCategory === cat.id && !onlyBestsellers;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleSelectCategory(cat.id)}
                                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                        isSelected
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]"
                                            : "bg-white border border-cream-300/90 text-espresso-800 hover:bg-cream-100 shadow-2xs"
                                    }`}
                                >
                                    {getCategoryIcon(cat.id)}
                                    <span>{language === "te" && cat.name_te ? cat.name_te : cat.name}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                            isSelected ? "bg-white/20 text-white" : "bg-cream-100 text-espresso-600"
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
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

            {/* Table Selector Modal — Mobile Bottom Sheet */}
            {showTablePicker && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowTablePicker(false)}
                    />
                    <div className="relative bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-cream-200 z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
                        {/* Mobile Drag Indicator */}
                        <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mb-3 sm:hidden" />

                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <QrCode className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-espresso-950">Select Your Table</h3>
                                    <p className="text-[11px] text-espresso-500 font-medium">Pick your dining table at Kadiri</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTablePicker(false)}
                                className="p-1.5 rounded-full text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-espresso-600 mb-4">
                            Your kitchen tickets and waiter service requests will be linked to this table:
                        </p>

                        <div className="grid grid-cols-4 gap-2.5 mb-6 max-h-60 overflow-y-auto pr-1">
                            {availableTables.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSelectTable(t)}
                                    className={`py-3.5 rounded-2xl border text-sm font-black transition cursor-pointer active:scale-95 ${
                                        tableLabel === t.label
                                            ? "border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-102"
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
                            className="w-full rounded-xl py-2.5 text-xs font-bold"
                            onClick={() => setShowTablePicker(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Call Waiter / Service Bell Modal — Mobile Bottom Sheet */}
            {showServiceModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowServiceModal(false)}
                    />
                    <div className="relative bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-cream-200 z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
                        {/* Mobile Drag Indicator */}
                        <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mb-3 sm:hidden" />

                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
                                    <Bell className="w-5 h-5 text-amber-600 animate-bounce" />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-espresso-950">Table {tableLabel} Assistance</h3>
                                    <p className="text-[11px] text-espresso-500 font-medium">Instant notification to floor captain</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowServiceModal(false)}
                                className="p-1.5 rounded-full text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("waiter")}
                                className="p-4 rounded-2xl border-2 border-cream-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 active:scale-98 transition flex flex-col items-center text-center gap-2 cursor-pointer shadow-2xs group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Bell className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-espresso-900 block">Call Waiter</span>
                                    <span className="text-[10px] text-espresso-500 font-medium block mt-0.5">Order help & questions</span>
                                </div>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("water")}
                                className="p-4 rounded-2xl border-2 border-cream-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/50 active:scale-98 transition flex flex-col items-center text-center gap-2 cursor-pointer shadow-2xs group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Droplets className="w-6 h-6 text-cyan-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-espresso-900 block">Drinking Water</span>
                                    <span className="text-[10px] text-espresso-500 font-medium block mt-0.5">Fresh water refill</span>
                                </div>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("bill")}
                                className="p-4 rounded-2xl border-2 border-cream-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 active:scale-98 transition flex flex-col items-center text-center gap-2 cursor-pointer shadow-2xs group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Receipt className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-espresso-900 block">Request Bill</span>
                                    <span className="text-[10px] text-espresso-500 font-medium block mt-0.5">Pay at table / UPI</span>
                                </div>
                            </button>

                            <button
                                disabled={isCallingWaiter}
                                onClick={() => handleCallService("clean")}
                                className="p-4 rounded-2xl border-2 border-cream-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 active:scale-98 transition flex flex-col items-center text-center gap-2 cursor-pointer shadow-2xs group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-espresso-900 block">Clean Table</span>
                                    <span className="text-[10px] text-espresso-500 font-medium block mt-0.5">Clear used plates</span>
                                </div>
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-xl py-2.5 text-xs font-bold"
                            onClick={() => setShowServiceModal(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Customer Authentication Modal (Mobile + Password, Zero OTP) */}
            <CustomerAuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
            />
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
