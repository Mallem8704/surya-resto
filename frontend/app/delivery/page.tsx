"use client";

import { printPOSReceipt } from "@/lib/thermalPrint";
import { dispatchCustomerWhatsApp } from "@/lib/whatsapp";


import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ShoppingBag,
    Search,
    MapPin,
    Phone,
    User,
    Clock,
    Sparkles,
    CheckCircle2,
    Truck,
    ArrowRight,
    X,
    Plus,
    Minus,
    ChefHat,
    ShieldCheck,
    Navigation,
    Bike,
    Star,
    AlertCircle,
    Store,
    IndianRupee,
    PhoneCall,
    MessageSquare,
    RefreshCw,
    Flame,
    UtensilsCrossed,
    SlidersHorizontal,
    UserCheck,
    LogIn,
    RotateCcw,
    Bookmark,
    QrCode,
    Smartphone,
} from "lucide-react";
import { useCustomer } from "@/context/CustomerContext";
import { useOffline } from "@/context/OfflineContext";
import { CustomerAuthModal } from "@/components/customer/CustomerAuthModal";
import { RepeatOrderCard } from "@/components/customer/RepeatOrderCard";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { safeStorage } from "@/lib/safeStorage";
import { useOutlet } from "@/context/OutletContext";
import { formatRupees, formatRelativeTime } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VegBadge, SpecialBadge } from "@/components/ui/Badge";
import { soundManager } from "@/lib/sound";
import { useOrderSocket } from "@/hooks/useSockets";
import {
    DishCustomizerModal,
    CustomizerItemData,
    CustomizedSelection,
    MenuItemVariantData,
    MenuItemAddonData,
} from "@/components/order/DishCustomizerModal";
import { SURYA_CATEGORIES, SURYA_MENU_ITEMS } from "@/lib/suryaMenuData";
import { MenuGridSkeleton } from "@/components/order/MenuGridSkeleton";
import { UpiPaymentModal } from "@/components/order/UpiPaymentModal";

interface MenuItemData extends CustomizerItemData {
    category_id: number;
    is_available: boolean;
    is_special: boolean;
}

interface CartItem {
    cartKey: string;
    item: MenuItemData;
    variant: MenuItemVariantData | null;
    addons: MenuItemAddonData[];
    qty: number;
    unitPricePaise: number;
    notes?: string;
}

interface DeliveryOrder {
    id: number;
    order_number: string;
    outlet_id: number;
    status: string;
    subtotal_paise: number;
    tax_paise: number;
    total_paise: number;
    payment_status: string;
    payment_method: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_address?: string;
    delivery_status?: string;
    created_at: string;
    items: Array<{
        id: number;
        item_name: string;
        variant_name?: string | null;
        selected_addons_json?: string | null;
        qty: number;
        unit_price_paise: number;
        total_price_paise: number;
        notes?: string;
    }>;
}

function DeliveryOrderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const { language, t } = useLanguage();
    const { outlet } = useOutlet();

    // Branch selection (default 2 for full menu, or 1 for grills/mandi)
    const branchParam = searchParams.get("branch");
    const [selectedBranch, setSelectedBranch] = useState<number>(branchParam ? Number(branchParam) : 2);

    // Menu state
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non_veg">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
    const { customer, isCustomerLoggedIn, loginCustomer, logoutCustomer, pastOrders } = useCustomer();
    const { isOnline, enqueueOrder } = useOffline();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpiModal, setShowUpiModal] = useState(false);
    const [pendingUpiOrder, setPendingUpiOrder] = useState<any>(null);

    // Auto-fill from logged-in customer profile
    useEffect(() => {
        if (customer) {
            if (customer.name) setCustomerName(customer.name);
            if (customer.phone) setCustomerPhone(customer.phone);
            if (customer.default_address) setDeliveryAddress(customer.default_address);
        }
    }, [customer]);

    // Handle 1-Tap Reorder
    const handleReorderPastMeal = (pastOrder: any) => {
        if (!pastOrder || !pastOrder.items) return;
        const newCartItems: CartItem[] = pastOrder.items.map((it: any) => {
            const variantObj = it.variant_id ? { id: it.variant_id, name: it.variant_name || "Variant", price_paise: 0 } : null;
            let addonsArr = [];
            if (it.selected_addons_json) {
                try { addonsArr = JSON.parse(it.selected_addons_json); } catch {}
            }
            const unitPaise = Math.round(it.total_price_paise / (it.qty || 1));
            return {
                cartKey: `reorder_${it.item_id}_${Date.now()}_${Math.random()}`,
                item: {
                    id: it.item_id,
                    name: it.item_name,
                    price_paise: unitPaise,
                    category_id: 1,
                    is_available: true,
                    is_special: false,
                    is_veg: false,
                    has_variants: !!it.variant_id,
                },
                variant: variantObj,
                addons: addonsArr,
                qty: it.qty || 1,
                unitPricePaise: unitPaise,
            };
        });

        setCart(newCartItems);
        setIsCartOpen(true);
        soundManager.playAddToCartPop();
        toast.success(`Loaded items from Order #${pastOrder.order_number} into cart!`);
    };

    // Customizer Modal State
    const [customizingItem, setCustomizingItem] = useState<MenuItemData | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Checkout Form state
    const [customerName, setCustomerName] = useState("");
    const [couponCodeInput, setCouponCodeInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_paise: number; message: string } | null>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [customerPhone, setCustomerPhone] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [landmark, setLandmark] = useState("");
    const [cookingNotes, setCookingNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Active Delivery Order (for live tracking)
    const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);

    // Branch / Restaurant Information
    const branch1Info = {
        id: 1,
        name: "Surya Family Restaurant",
        tagline: "Hyderabadi Biryani & Punjabi Curries",
        address: "Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri",
        hours: "11:00 AM – 10:30 PM",
        badge: "Biryani & Family Dining Specialist",
        noBreakfast: false,
    };

    const currentBranchInfo = branch1Info;

    // Load saved customer contact details
    useEffect(() => {
        const savedName = safeStorage.getItem("surya_cust_name");
        const savedPhone = safeStorage.getItem("surya_cust_phone");
        const savedAddress = safeStorage.getItem("surya_cust_address");
        const savedLandmark = safeStorage.getItem("surya_cust_landmark");
        if (savedName) setCustomerName(savedName);
        if (savedPhone) setCustomerPhone(savedPhone);
        if (savedAddress) setDeliveryAddress(savedAddress);
        if (savedLandmark) setLandmark(savedLandmark);

        // Restore active order from session if exists
        const savedOrderId = safeStorage.getItem("surya_delivery_order_id", "session");
        if (savedOrderId) {
            api.getOrder(Number(savedOrderId))
                .then((ord) => {
                    if (ord && ord.status !== "cancelled" && ord.status !== "delivered") {
                        setActiveOrder(ord);
                    } else {
                        safeStorage.removeItem("surya_delivery_order_id", "session");
                    }
                })
                .catch(() => {
                    safeStorage.removeItem("surya_delivery_order_id", "session");
                });
        }
    }, []);

    // Fetch Menu for Selected Branch with resilient offline fallback
    const fetchMenu = useCallback(async () => {
        setIsLoadingMenu(true);
        try {
            const [cats, items] = await Promise.all([
                api.getCategories(true, selectedBranch).catch(() => null),
                api.getMenu(selectedBranch).catch(() => null),
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
        } catch (err) {
            console.warn("Using authentic Surya static menu for delivery:", err);
            setCategories(SURYA_CATEGORIES as any);
            setMenuItems(SURYA_MENU_ITEMS as any);
        } finally {
            setIsLoadingMenu(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchMenu();
        // Clear category filter on branch switch
        setSelectedCategory("all");
    }, [fetchMenu]);

    // WebSocket real-time delivery tracking
    useOrderSocket(activeOrder?.id, (updatedData) => {
        console.log("[DeliverySocket] Order updated:", updatedData);
        setActiveOrder((prev) => (prev ? { ...prev, ...updatedData } : null));
        if (updatedData.status === "out_for_delivery") {
            soundManager.playReadyChime();
            toast.success("Rider is on the way with your food!");
        } else if (updatedData.status === "delivered") {
            soundManager.playReadyChime();
            toast.success("Food Delivered! Enjoy your Arabian feast!");
        }
    });

    // Cart calculations
    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
    const subtotalPaise = useMemo(
        () => cart.reduce((sum, item) => sum + item.unitPricePaise * item.qty, 0),
        [cart]
    );
    const taxPaise = useMemo(() => Math.round(subtotalPaise * 0.05), [subtotalPaise]);
    const deliveryFeePaise = 0; // 100% FREE DELIVERY
    const totalPaise = subtotalPaise + taxPaise + deliveryFeePaise;

    // Handle Add to Cart Button Click on Dish Card
    const handleDishCardClick = (item: MenuItemData) => {
        const hasVariants = item.variants && item.variants.length > 0;
        const hasAddons = item.addons && item.addons.length > 0;

        if (hasVariants || hasAddons) {
            // Open customization modal
            setCustomizingItem(item);
        } else {
            // Direct add to cart
            const cartKey = `item_${item.id}`;
            setCart((prev) => {
                const existing = prev.find((ci) => ci.cartKey === cartKey);
                if (existing) {
                    return prev.map((ci) => (ci.cartKey === cartKey ? { ...ci, qty: ci.qty + 1 } : ci));
                }
                return [
                    ...prev,
                    {
                        cartKey,
                        item,
                        variant: null,
                        addons: [],
                        qty: 1,
                        unitPricePaise: item.price_paise,
                    },
                ];
            });
            soundManager.playAddToCartPop();
            toast.success(`Added ${item.name} to delivery cart`);
        }
    };

    // Callback from DishCustomizerModal
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
                    cartKey,
                    item: customized.item as MenuItemData,
                    variant: customized.variant,
                    addons: customized.addons,
                    qty: customized.qty,
                    unitPricePaise: unitPaise,
                    notes: customized.notes || undefined,
                },
            ];
        });

        soundManager.playAddToCartPop();
        toast.success(
            `Added ${customized.item.name} ${customized.variant ? `(${customized.variant.name})` : ""} to cart`
        );
    };

    // Update quantity by cartKey
    const handleUpdateCartQty = (cartKey: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((ci) => {
                    if (ci.cartKey === cartKey) {
                        const newQty = ci.qty + delta;
                        return newQty > 0 ? { ...ci, qty: newQty } : null;
                    }
                    return ci;
                })
                .filter(Boolean) as CartItem[]
        );
        soundManager.playAddToCartPop();
    };

    // Filter menu items
    const filteredItems = useMemo(() => {
        return menuItems.filter((item) => {
            if (selectedCategory !== "all" && item.category_id !== selectedCategory) return false;
            if (vegFilter === "veg" && !item.is_veg) return false;
            if (vegFilter === "non_veg" && item.is_veg) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
            }
            return true;
        });
    }, [menuItems, selectedCategory, vegFilter, searchQuery]);

    // Place Delivery Order with Idempotency Key
    const handlePlaceDeliveryOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) {
            toast.error("Your delivery cart is empty");
            return;
        }

        const phoneClean = customerPhone.trim().replace(/\D/g, "");
        if (phoneClean.length < 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
            toast.error("Please enter complete delivery address in Kadiri");
            return;
        }

        setIsPlacingOrder(true);
        try {
            // Generate client-side UUID idempotency key to prevent double submit
            const idempotencyKey =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `idemp_${Math.random().toString(36).substring(2)}_${Date.now()}`;

            const fullAddress = landmark.trim()
                ? `${deliveryAddress.trim()}, Landmark: ${landmark.trim()}, Kadiri`
                : `${deliveryAddress.trim()}, Kadiri`;

            const payload = {
                outlet_id: selectedBranch,
                idempotency_key: idempotencyKey,
                order_type: "delivery" as const,
                customer_name: customerName.trim() || "Customer",
                customer_phone: phoneClean,
                delivery_address: fullAddress,
                customer_notes: cookingNotes.trim() || undefined,
                coupon_code: appliedCoupon?.code,
                payment_method: paymentMethod,
                items: cart.map((ci) => ({
                    item_id: ci.item.id,
                    variant_id: ci.variant?.id,
                    addon_ids: ci.addons.map((a) => a.id),
                    qty: ci.qty,
                    notes: ci.notes,
                })),
            };

            let createdOrder;
            if (!isOnline) {
                const queueId = await enqueueOrder(payload, "delivery");
                soundManager.playOrderPlacedSuccess();
                toast.success(`You are currently offline. Order #${queueId} has been safely queued and will auto-submit when connected!`);
                createdOrder = {
                    id: Date.now(),
                    order_number: `OFFLINE-${queueId.slice(-6).toUpperCase()}`,
                    outlet_id: selectedBranch,
                    status: "placed",
                    subtotal_paise: subtotalPaise,
                    tax_paise: taxPaise,
                    total_paise: totalPaise,
                    payment_status: "pending",
                    payment_method: paymentMethod,
                    customer_name: customerName.trim() || "Customer",
                    customer_phone: phoneClean,
                    delivery_address: fullAddress,
                    delivery_status: "pending",
                    created_at: new Date().toISOString(),
                    items: cart.map((ci) => ({
                        id: Math.random(),
                        item_name: ci.item.name,
                        variant_name: ci.variant?.name,
                        selected_addons_json: JSON.stringify(ci.addons),
                        qty: ci.qty,
                        unit_price_paise: ci.unitPricePaise,
                        total_price_paise: ci.unitPricePaise * ci.qty,
                        notes: ci.notes,
                    })),
                };
            } else {
                createdOrder = await api.createOrder(payload);
                soundManager.playOrderPlacedSuccess();
                toast.success(`Delivery Order #${createdOrder.order_number} Placed Successfully!`);
            }

            // Auto-login & persist customer profile and address (Zero OTP / Zero Cost)
            safeStorage.setItem("surya_cust_name", customerName.trim());
            safeStorage.setItem("surya_cust_phone", phoneClean);
            safeStorage.setItem("surya_cust_address", deliveryAddress.trim());
            safeStorage.setItem("surya_cust_landmark", landmark.trim());
            safeStorage.setItem("surya_delivery_order_id", String(createdOrder.id), "session");

            if (!isCustomerLoggedIn) {
                api.quickLoginCustomer({ phone: phoneClean, name: customerName.trim() || undefined })
                    .then((res) => {
                        loginCustomer(res.access_token, res.customer);
                        if (deliveryAddress.trim()) {
                            api.addCustomerAddress({
                                label: "Home",
                                address_line: deliveryAddress.trim(),
                                landmark: landmark.trim() || undefined,
                                is_default: true,
                            }).catch(() => {});
                        }
                    })
                    .catch(() => {});
            }

            setCart([]);
            setIsCartOpen(false);
            setActiveOrder(createdOrder);

            if (paymentMethod === "upi") {
                setPendingUpiOrder(createdOrder);
                setShowUpiModal(true);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to place delivery order. Please try again.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // ── LIVE TRACKING VIEW ──────────────────────────────────────────────────
    if (activeOrder) {
        const orderStatus = activeOrder.status || "placed";
        const steps = [
            { key: "placed", title: "Order Confirmed", desc: "Restaurant accepted your order", icon: CheckCircle2 },
            { key: "preparing", title: "Kitchen Preparing", desc: "Chef is cooking your fresh Arabian dishes", icon: ChefHat },
            { key: "out_for_delivery", title: "Rider on the Way", desc: "Delivery rider dispatched across Kadiri", icon: Bike },
            { key: "delivered", title: "Delivered", desc: "Enjoy your authentic Arabian feast!", icon: Sparkles },
        ];

        const statusRank: Record<string, number> = {
            placed: 0,
            accepted: 1,
            preparing: 1,
            ready: 2,
            out_for_delivery: 2,
            served: 3,
            delivered: 3,
        };

        const currentRank = statusRank[orderStatus] ?? 0;

        return (
            <div className="min-h-screen bg-cream-50/50 pb-20">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-terracotta-100 px-4 py-3 shadow-xs">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-terracotta-500/10 flex items-center justify-center text-terracotta-600">
                                <Bike className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-base font-serif font-black text-espresso-950">
                                    Surya Live Delivery Tracker
                                </h1>
                                <p className="text-xs text-espresso-500 font-mono">
                                    Order #{activeOrder.order_number} &bull; {currentBranchInfo.name}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                safeStorage.removeItem("surya_delivery_order_id", "session");
                                setActiveOrder(null);
                            }}
                            className="text-xs"
                        >
                            Order More Dishes
                        </Button>
                    </div>
                </header>

                <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
                    {/* Live Tracker Status Card */}
                    <div className="bg-gradient-to-br from-espresso-950 via-espresso-900 to-terracotta-950 text-white rounded-3xl p-4 sm:p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-saffron-500/10 blur-2xl pointer-events-none" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saffron-500/20 text-saffron-300 border border-saffron-500/30">
                                    <span className="w-2 h-2 rounded-full bg-saffron-400 animate-ping" />
                                    100% Free Home Delivery (Kadiri)
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mt-2">
                                    {orderStatus === "delivered"
                                        ? "Delivered & Enjoyed!"
                                        : orderStatus === "out_for_delivery"
                                        ? "Rider Dispatched"
                                        : orderStatus === "preparing"
                                        ? "Sizzling in Kitchen"
                                        : "Order Placed & Accepted"}
                                </h2>
                                <p className="text-xs text-cream-200/80 mt-1">
                                    Estimated Delivery: <strong className="text-saffron-300">25–35 mins</strong> within Kadiri limits
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-2xl font-mono font-black text-saffron-400">
                                    {formatRupees(activeOrder.total_paise)}
                                </div>
                                <div className="text-xs text-cream-300">
                                    Payment: <span className="uppercase font-bold text-white">{activeOrder.payment_method}</span> ({activeOrder.payment_status})
                                </div>
                            </div>
                        </div>

                        {/* UPI Payment Action Banner if payment pending and method is upi */}
                        {activeOrder.payment_status === "pending" && activeOrder.payment_method === "upi" && (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-saffron-500/20 via-amber-500/15 to-saffron-500/20 border-2 border-saffron-400 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-saffron-400 text-espresso-950 flex items-center justify-center font-black shrink-0 shadow-md">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-extrabold text-white flex items-center gap-2">
                                            <span>UPI Payment Option</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-saffron-400 text-espresso-950 font-black">
                                                PENDING
                                            </span>
                                        </div>
                                        <p className="text-xs text-cream-200/80 mt-0.5">
                                            Pay <strong className="text-saffron-300">{formatRupees(activeOrder.total_paise)}</strong> instantly via GPay, PhonePe, PayTM, or QR code
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setPendingUpiOrder(activeOrder);
                                        setShowUpiModal(true);
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-saffron-400 to-amber-500 hover:from-saffron-300 hover:to-amber-400 text-espresso-950 font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>OPEN UPI PAYMENT OPTION</span>
                                </button>
                            </div>
                        )}

                        {/* 4 Step Timeline */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isDone = idx <= currentRank;
                                const isCurrent = idx === currentRank;

                                return (
                                    <div
                                        key={step.key}
                                        className={`rounded-2xl p-3.5 border transition-all ${
                                            isCurrent
                                                ? "bg-saffron-500/20 border-saffron-400/80 shadow-md shadow-saffron-500/10"
                                                : isDone
                                                ? "bg-white/10 border-white/20"
                                                : "bg-white/5 border-white/5 opacity-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                    isDone ? "bg-saffron-400 text-espresso-950 font-bold" : "bg-white/10 text-white"
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-cream-300">
                                                0{idx + 1}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-white leading-tight">{step.title}</h4>
                                        <p className="text-[10px] text-cream-200/70 mt-0.5 leading-snug">{step.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery & Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Address Card */}
                        <div className="bg-white rounded-2xl p-5 border border-terracotta-100 shadow-xs space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-terracotta-600" />
                                Kadiri Drop-off Location
                            </h3>
                            <div className="bg-cream-50/60 rounded-xl p-3 border border-terracotta-100/60 text-xs">
                                <p className="font-bold text-espresso-900 text-sm mb-1">{activeOrder.customer_name || "Customer"}</p>
                                <p className="text-espresso-700 leading-relaxed">{activeOrder.delivery_address}</p>
                                <p className="text-terracotta-700 font-mono font-bold mt-2 flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" /> +91 {activeOrder.customer_phone}
                                </p>
                            </div>
                        </div>

                        {/* Order Items Card */}
                        <div className="bg-white rounded-2xl p-5 border border-terracotta-100 shadow-xs space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500 flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-terracotta-600" />
                                Ordered Dishes ({activeOrder.items?.length || 0})
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {activeOrder.items?.map((it) => {
                                    let addonsList: Array<{ name: string; price_paise: number }> = [];
                                    if (it.selected_addons_json) {
                                        try {
                                            addonsList = JSON.parse(it.selected_addons_json);
                                        } catch {}
                                    }

                                    return (
                                        <div key={it.id} className="flex flex-col py-1.5 border-b border-terracotta-50 last:border-0 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-terracotta-700 bg-terracotta-50 px-1.5 py-0.5 rounded">
                                                        {it.qty}x
                                                    </span>
                                                    <span className="font-bold text-espresso-900">{it.item_name}</span>
                                                    {it.variant_name && (
                                                        <span className="text-[10px] bg-saffron-100 text-saffron-900 font-bold px-1.5 py-0.2 rounded-md">
                                                            {it.variant_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-mono font-bold text-espresso-900">
                                                    {formatRupees(it.total_price_paise)}
                                                </span>
                                            </div>
                                            {addonsList.length > 0 && (
                                                <div className="text-[10px] text-espresso-500 pl-6 mt-0.5">
                                                    + {addonsList.map((a) => a.name).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 5-Star Google Review Booster & WhatsApp Feedback */}
                    <div className="bg-gradient-to-r from-amber-50 via-saffron-50 to-amber-100/60 rounded-3xl p-6 border-2 border-amber-300 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                                <Star className="w-7 h-7 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-base font-serif font-black text-espresso-950 flex items-center gap-2">
                                    <span>Loved your Arabian Feast?</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold border border-amber-300">
                                        Get Free Chai
                                    </span>
                                </h4>
                                <p className="text-xs text-espresso-700 mt-0.5">
                                    Leave a 5-Star rating on Google Maps & show it on your next visit for a complimentary dessert or special discount!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                            <a
                                href="https://maps.app.goo.gl/mx51L23iDJuwmThY8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md text-center transition flex items-center justify-center gap-1.5"
                            >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Rate on Google</span>
                            </a>

                            <button
                                onClick={() => dispatchCustomerWhatsApp(activeOrder, outlet)}
                                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Share Invoice</span>
                            </button>
                        </div>
                    </div>
                </main>

                {/* Dynamic UPI Payment Modal */}
                {showUpiModal && pendingUpiOrder && (
                    <UpiPaymentModal
                        isOpen={showUpiModal}
                        onClose={() => setShowUpiModal(false)}
                        orderId={pendingUpiOrder.id}
                        orderNumber={pendingUpiOrder.order_number}
                        totalPaise={pendingUpiOrder.total_paise}
                        customerPhone={customerPhone}
                        onPaymentSuccess={(updated) => {
                            setActiveOrder((prev: any) =>
                                prev ? { ...prev, payment_status: "paid" } : prev
                            );
                        }}
                        onSwitchToCash={() => {
                            setShowUpiModal(false);
                            setActiveOrder((prev: any) =>
                                prev ? { ...prev, payment_method: "cash" } : prev
                            );
                            toast.info("Switched to Cash on Delivery (COD)");
                        }}
                    />
                )}
            </div>
        );
    }

    // ── MAIN MENU & ORDERING VIEW ───────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#FDFBF7] pb-28">
            {/* Top Announcement Bar */}
            <div className="bg-gradient-to-r from-espresso-950 via-terracotta-900 to-espresso-950 text-white text-[11px] font-bold py-2 px-4 text-center tracking-wide flex items-center justify-center gap-2 shadow-inner">
                <Bike className="w-3.5 h-3.5 text-saffron-400 animate-bounce" />
                <span>⚡ 100% FREE Home Delivery Anywhere in Kadiri Town Limits &bull; 0 Delivery Charges &bull; Hot & Fresh</span>
            </div>

            {/* Sticky Header with Branch Switcher */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-terracotta-100 px-4 py-3 shadow-xs">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    {/* Logo & Branch Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl shadow-md">
                            ☀️
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm sm:text-lg font-serif font-black text-espresso-950 leading-tight">
                                    Surya Online Food Delivery
                                </h1>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                    Doorstep Delivery
                                </span>
                            </div>
                            <p className="text-xs text-espresso-600 mt-1 flex items-center gap-1 font-medium">
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>{currentBranchInfo.name} &bull; {currentBranchInfo.hours}</span>
                            </p>
                        </div>
                    </div>

                    <LanguageToggle />
                    {/* Floating Cart Button */}
                    <div className="flex items-center gap-2">
                        {isCustomerLoggedIn ? (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs hover:bg-amber-100 transition cursor-pointer"
                            >
                                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden sm:inline">Hi, {customer?.name || customer?.phone}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 border border-cream-300 text-espresso-900 font-bold text-xs transition cursor-pointer"
                            >
                                <LogIn className="w-3.5 h-3.5 text-espresso-700" />
                                <span className="hidden sm:inline">Customer Login</span>
                            </button>
                        )}
                        <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-amber-600/30 transition-all transform active:scale-95 cursor-pointer"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline">Delivery Cart</span>
                        {cartCount > 0 && (
                            <span className="bg-saffron-400 text-espresso-950 text-[11px] font-black font-mono w-5 h-5 rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                        {cartCount > 0 && (
                            <span className="hidden sm:inline font-mono font-black border-l border-white/20 pl-2">
                                {formatRupees(totalPaise)}
                            </span>
                        )}
                    </button>
                    </div>
                </div>
            </header>

            {/* 1-Tap Repeat Order Card for Logged In Customer */}
            {isCustomerLoggedIn && pastOrders && pastOrders.length > 0 && (
                <div className="max-w-5xl mx-auto px-4 pt-3">
                    <RepeatOrderCard pastOrders={pastOrders} onReorder={handleReorderPastMeal} />
                </div>
            )}

            {/* Restaurant Info Header Card */}
            <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black flex items-center justify-center text-lg shrink-0">
                            ☀️
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-espresso-950">Surya Family Restaurant</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">4.8★ (69+ Google Reviews)</span>
                            </div>
                            <p className="text-xs text-espresso-600">
                                Dhandubatu Street, Bypass road, Opp. RTC Bus Stand, Kadiri &bull; 📞 098803 58634
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold shrink-0">
                        Open &bull; 11:00 AM – 10:30 PM
                    </span>
                </div>
            </div>

            {/* Search & Veg/Non-Veg Filter Bar */}
            <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                language === "te"
                                    ? "బిర్యానీ, మండి, చికెన్ కబాబ్స్ కోసం వెతకండి..."
                                    : "Search chicken mandi, mutton biryani, starters, shakes..."
                            }
                            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-terracotta-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-terracotta-500 shadow-xs text-espresso-900 placeholder:text-espresso-400"
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

                    {/* Veg / Non-Veg Toggle Filter */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-terracotta-100 shrink-0">
                        <button
                            onClick={() => setVegFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                vegFilter === "all" ? "bg-espresso-900 text-white" : "text-espresso-600 hover:bg-cream-100"
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setVegFilter("veg")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                vegFilter === "veg" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Veg
                        </button>
                        <button
                            onClick={() => setVegFilter("non_veg")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                vegFilter === "non_veg" ? "bg-terracotta-600 text-white" : "text-terracotta-700 hover:bg-terracotta-50"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-terracotta-600" />
                            Non-Veg
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Pills (Horizontal Scroll) */}
            <div className="sticky top-[69px] z-20 bg-[#FDFBF7]/95 backdrop-blur-md py-2 border-b border-terracotta-100/60 shadow-2xs">
                <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                            selectedCategory === "all"
                                ? "bg-terracotta-600 text-white shadow-xs"
                                : "bg-white text-espresso-700 border border-terracotta-100 hover:bg-cream-100"
                        }`}
                    >
                        {language === "te" ? "అన్నీ (ఆల్ కేటగిరీలు)" : "All Dishes"}
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                                selectedCategory === cat.id
                                    ? "bg-terracotta-600 text-white shadow-xs"
                                    : "bg-white text-espresso-700 border border-terracotta-100 hover:bg-cream-100"
                            }`}
                        >
                            {language === "te" && cat.name_te ? cat.name_te : cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dishes Grid */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                {isLoadingMenu ? (
                    <MenuGridSkeleton count={6} />
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-terracotta-100 max-w-md mx-auto my-8">
                        <UtensilsCrossed className="w-12 h-12 text-espresso-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-espresso-950">No dishes found</h3>
                        <p className="text-xs text-espresso-500 mt-1">Try clearing your filters or search keywords.</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setSelectedCategory("all");
                                setVegFilter("all");
                                setSearchQuery("");
                            }}
                            className="mt-4"
                        >
                            Reset Filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item) => {
                            const hasVariants = item.variants && item.variants.length > 0;
                            const hasAddons = item.addons && item.addons.length > 0;

                            // Find total items of this dish in cart across variants
                            const countInCart = cart
                                .filter((ci) => ci.item.id === item.id)
                                .reduce((sum, ci) => sum + ci.qty, 0);

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl p-4 border border-terracotta-100/80 hover:border-terracotta-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <VegBadge isVeg={item.is_veg} />
                                                {item.is_special && <SpecialBadge />}
                                                {hasVariants && (
                                                    <span className="text-[10px] font-bold text-terracotta-700 bg-terracotta-50 border border-terracotta-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                        <SlidersHorizontal className="w-2.5 h-2.5" />
                                                        Portions
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-base font-serif font-black text-espresso-950 leading-snug group-hover:text-terracotta-700 transition-colors">
                                            {language === "te" && item.name_te ? item.name_te : item.name}
                                        </h3>

                                        {item.description && (
                                            <p className="text-xs text-espresso-500 line-clamp-2 mt-1 leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-terracotta-50">
                                        <div>
                                            <span className="text-[10px] text-espresso-400 block font-medium">
                                                {hasVariants ? "Starts from" : "Price"}
                                            </span>
                                            <span className="text-base font-mono font-black text-espresso-950">
                                                {formatRupees(
                                                    hasVariants && item.variants && item.variants[0]
                                                        ? item.variants[0].price_paise
                                                        : item.price_paise
                                                )}
                                            </span>
                                        </div>

                                        {/* Add to Cart / Customizer Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => handleDishCardClick(item)}
                                            className="px-4 py-2 rounded-xl bg-terracotta-50 hover:bg-terracotta-600 text-terracotta-700 hover:text-white border border-terracotta-200 hover:border-terracotta-600 font-bold text-xs shadow-2xs transition-all transform active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{hasVariants || hasAddons ? "CUSTOMIZE" : "ADD"}</span>
                                            {countInCart > 0 && (
                                                <span className="ml-1 bg-terracotta-600 text-white group-hover:bg-white group-hover:text-terracotta-700 text-[10px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center">
                                                    {countInCart}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

                        {/* Customer Login Modal */}
            <CustomerAuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />

            {/* Customization Modal */}
            <DishCustomizerModal
                isOpen={!!customizingItem}
                item={customizingItem}
                language={language}
                onClose={() => setCustomizingItem(null)}
                onAddToCart={handleCustomizedAddToCart}
            />

            {/* Floating Bottom Cart Bar (if items in cart) */}
            {cartCount > 0 && !isCartOpen && (
                <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto animate-in slide-in-from-bottom-6">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-gradient-to-r from-terracotta-600 via-terracotta-700 to-espresso-950 text-white p-4 rounded-2xl shadow-xl shadow-terracotta-600/30 flex items-center justify-between border border-terracotta-500/30 transform active:scale-98 transition-all"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs font-mono font-bold text-saffron-300">
                                    {cartCount} {cartCount === 1 ? "Dish" : "Dishes"} &bull; Free Home Delivery
                                </span>
                                <div className="text-base font-serif font-black">
                                    Total: {formatRupees(totalPaise)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-xs bg-white text-espresso-950 px-4 py-2 rounded-xl shadow-xs">
                            <span>Review & Order</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            )}

            {/* Cart Drawer / Slide-over */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="w-full max-w-lg max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-terracotta-100 animate-in slide-in-from-bottom-6 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-4 sm:p-5 border-b border-terracotta-100 flex items-center justify-between bg-cream-50/50">
                            <div>
                                <h2 className="text-lg font-serif font-black text-espresso-950 flex items-center gap-2">
                                    <Bike className="w-5 h-5 text-terracotta-600" />
                                    Free Kadiri Home Delivery Checkout
                                </h2>
                                <p className="text-xs text-espresso-500 font-mono">
                                    {currentBranchInfo.name} &bull; 0 Delivery Charges
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 rounded-full text-espresso-500 hover:bg-terracotta-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Cart Content & Checkout Form */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                            {/* 1. Cart Items List */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500 mb-3 flex items-center justify-between">
                                    <span>Selected Dishes ({cartCount})</span>
                                    <button
                                        onClick={() => setCart([])}
                                        className="text-[11px] text-terracotta-600 hover:underline font-bold"
                                    >
                                        Clear Cart
                                    </button>
                                </h3>
                                <div className="space-y-2.5">
                                    {cart.map((ci) => (
                                        <div
                                            key={ci.cartKey}
                                            className="flex items-start justify-between gap-3 p-3 rounded-xl bg-cream-50/40 border border-terracotta-100/60"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <VegBadge isVeg={ci.item.is_veg} />
                                                    <span className="text-xs font-bold text-espresso-900 leading-tight">
                                                        {ci.item.name}
                                                    </span>
                                                </div>
                                                {ci.variant && (
                                                    <div className="text-[11px] font-bold text-saffron-800 bg-saffron-100/80 px-1.5 py-0.2 rounded-md inline-block mt-1">
                                                        Portion: {ci.variant.name}
                                                    </div>
                                                )}
                                                {ci.addons.length > 0 && (
                                                    <div className="text-[10px] text-espresso-600 mt-1">
                                                        + {ci.addons.map((a) => a.name).join(", ")}
                                                    </div>
                                                )}
                                                {ci.notes && (
                                                    <div className="text-[10px] text-terracotta-700 italic mt-0.5">
                                                        Note: &ldquo;{ci.notes}&rdquo;
                                                    </div>
                                                )}
                                                <div className="text-xs font-mono font-bold text-espresso-700 mt-1">
                                                    {formatRupees(ci.unitPricePaise * ci.qty)}
                                                </div>
                                            </div>

                                            {/* Quantity Stepper */}
                                            <div className="flex items-center gap-2 bg-white border border-terracotta-200 rounded-lg p-1 shrink-0">
                                                <button
                                                    onClick={() => handleUpdateCartQty(ci.cartKey, -1)}
                                                    className="w-6 h-6 rounded flex items-center justify-center text-espresso-700 hover:bg-terracotta-100"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-4 text-center text-xs font-bold font-mono">
                                                    {ci.qty}
                                                </span>
                                                <button
                                                    onClick={() => handleUpdateCartQty(ci.cartKey, 1)}
                                                    className="w-6 h-6 rounded flex items-center justify-center text-espresso-700 hover:bg-terracotta-100"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Customer Delivery Address Form */}
                            <form id="delivery-form" onSubmit={handlePlaceDeliveryOrder} className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500">
                                    Kadiri Delivery Information
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-espresso-800 mb-1">
                                            Your Full Name *
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-espresso-400" />
                                            <input
                                                type="text"
                                                required
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="e.g. Rahul / Sameer"
                                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 placeholder:text-espresso-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-espresso-800 mb-1">
                                            Phone Number *
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-espresso-400" />
                                            <input
                                                type="tel"
                                                required
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="10-digit mobile number"
                                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 placeholder:text-espresso-400 font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-espresso-800 mb-1">
                                        House No, Street & Area in Kadiri *
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-espresso-400" />
                                        <textarea
                                            required
                                            rows={2}
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                            placeholder="e.g. Flat 302, Green Valley Apts, Near Clock Tower, Kadiri"
                                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 placeholder:text-espresso-400"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-espresso-800 mb-1">
                                            Landmark (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={landmark}
                                            onChange={(e) => setLandmark(e.target.value)}
                                            placeholder="Near More Supermarket"
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 placeholder:text-espresso-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-espresso-800 mb-1">
                                            Payment Method
                                        </label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value as "cod" | "upi")}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 font-bold"
                                        >
                                            <option value="cod">Cash on Delivery (COD)</option>
                                            <option value="upi">UPI QR on Delivery / Online</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-espresso-800 mb-1">
                                        Cooking / Delivery Instructions (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={cookingNotes}
                                        onChange={(e) => setCookingNotes(e.target.value)}
                                        placeholder="e.g. Extra spicy, keep mayonnaise separate, call before arriving"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-terracotta-200 focus:ring-2 focus:ring-terracotta-500 bg-cream-50/20 text-espresso-900 placeholder:text-espresso-400"
                                    />
                                </div>
                            </form>

                            {/* 3. Bill Summary */}
                            <div className="bg-cream-50/70 rounded-2xl p-4 border border-terracotta-100 space-y-2 text-xs">
                                <div className="flex justify-between text-espresso-600">
                                    <span>Item Subtotal</span>
                                    <span className="font-mono">{formatRupees(subtotalPaise)}</span>
                                </div>
                                <div className="flex justify-between text-espresso-600">
                                    <span>GST (5%)</span>
                                    <span className="font-mono">{formatRupees(taxPaise)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>Kadiri Delivery Fee</span>
                                    <span className="uppercase tracking-wider">FREE (₹0)</span>
                                </div>
                                <div className="pt-2 border-t border-terracotta-200/60 flex justify-between text-sm font-black text-espresso-950 font-serif">
                                    <span>Total Payable</span>
                                    <span className="font-mono text-terracotta-700">{formatRupees(totalPaise)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer / Submit Button */}
                        <div className="p-4 sm:p-5 border-t border-terracotta-100 bg-white/95 backdrop-blur-md pb-safe shrink-0">
                            <Button
                                form="delivery-form"
                                type="submit"
                                variant="primary"
                                size="lg"
                                isLoading={isPlacingOrder}
                                className="w-full py-3.5 text-sm font-bold shadow-lg shadow-terracotta-600/30 flex items-center justify-between"
                            >
                                <span>Confirm & Order Free Delivery 🛵</span>
                                <span className="font-mono font-black">{formatRupees(totalPaise)}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic UPI Payment Modal */}
            {showUpiModal && pendingUpiOrder && (
                <UpiPaymentModal
                    isOpen={showUpiModal}
                    onClose={() => setShowUpiModal(false)}
                    orderId={pendingUpiOrder.id}
                    orderNumber={pendingUpiOrder.order_number}
                    totalPaise={pendingUpiOrder.total_paise}
                    customerPhone={customerPhone}
                    onPaymentSuccess={(updated) => {
                        setActiveOrder((prev: any) =>
                            prev ? { ...prev, payment_status: "paid" } : prev
                        );
                    }}
                    onSwitchToCash={() => {
                        setShowUpiModal(false);
                        setActiveOrder((prev: any) =>
                            prev ? { ...prev, payment_method: "cash" } : prev
                        );
                        toast.info("Switched to Cash on Delivery (COD)");
                    }}
                />
            )}
        </div>
    );
}

export default function DeliveryOrderPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-cream-50">
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 border-4 border-terracotta-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-bold text-espresso-700">Loading Surya Online Delivery...</p>
                    </div>
                </div>
            }
        >
            <DeliveryOrderContent />
        </Suspense>
    );
}
