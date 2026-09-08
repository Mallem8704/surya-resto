"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Trash2,
    Plus,
    Minus,
    ShoppingBag,
    ArrowRight,
    Tag,
    Check,
    Sparkles,
    AlertCircle,
    Flame,
    Clock,
    CheckCircle2,
    Percent,
    Smartphone,
    MapPin,
    Phone,
    User,
    QrCode,
    MessageCircle,
    Copy,
    Share2,
    Truck,
} from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { useOutlet } from "@/context/OutletContext";
import { Button } from "@/components/ui/Button";
import { openWhatsAppOrder, formatWhatsAppOrderMessage, WhatsAppOrderPayload } from "@/lib/whatsapp";
import { safeStorage } from "@/lib/safeStorage";

export interface CartItem {
    id: number;
    cartKey?: string;
    variant_id?: number;
    variant_name?: string | null;
    addon_ids?: number[];
    addons?: Array<{ name: string; price_paise: number }>;
    name: string;
    name_te?: string;
    price_paise: number;
    qty: number;
    notes?: string;
}

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    tableLabel: string;
    onUpdateQty: (id: number, delta: number, cartKey?: string) => void;
    onUpdateNotes: (id: number, notes: string, cartKey?: string) => void;
    onClearItem: (id: number, cartKey?: string) => void;
    onCheckout: (paymentMethod: "counter" | "upi", customerNotes: string) => Promise<void>;
    isPlacingOrder: boolean;
    onClearCart?: () => void;
}

const QUICK_COOKING_TAGS = [
    "Extra Spicy",
    "Medium Spicy",
    "Extra Salan Gravy",
    "Extra Raita",
    "Double Lemon & Onion",
    "Crispy Meat",
    "Less Oil",
];

const AVAILABLE_PROMOS = [
    { code: "WELCOME50", label: "Flat ₹50 OFF", minPaise: 25000, discountPaise: 5000 },
    { code: "BIRYANI10", label: "10% OFF", minPaise: 30000, percent: 10 },
    { code: "SURYA100", label: "₹100 OFF (Family)", minPaise: 60000, discountPaise: 10000 },
];

export function CartDrawer({
    isOpen,
    onClose,
    items,
    tableLabel,
    onUpdateQty,
    onUpdateNotes,
    onClearItem,
    onCheckout,
    isPlacingOrder,
    onClearCart,
}: CartDrawerProps) {
    const { language, t } = useLanguage();
    const { taxRate, outlet } = useOutlet();

    // ── Order Mode: Delivery, Takeaway, or Dine-In ─────────────────────────
    const [orderType, setOrderType] = useState<"delivery" | "takeaway" | "dine_in">(() => {
        if (typeof window !== "undefined") {
            const saved = safeStorage.getItem("surya_order_type", "local");
            if (saved === "delivery" || saved === "takeaway" || saved === "dine_in") return saved;
        }
        return "delivery";
    });

    // ── Customer Details ──────────────────────────────────────────────────
    const [customerName, setCustomerName] = useState(() => {
        return typeof window !== "undefined" ? (safeStorage.getItem("surya_customer_name", "local") || "") : "";
    });
    const [customerPhone, setCustomerPhone] = useState(() => {
        return typeof window !== "undefined" ? (safeStorage.getItem("surya_customer_phone", "local") || "") : "";
    });
    const [deliveryAddress, setDeliveryAddress] = useState(() => {
        return typeof window !== "undefined" ? (safeStorage.getItem("surya_delivery_address", "local") || "") : "";
    });
    const [landmark, setLandmark] = useState("");
    const [pickupTime, setPickupTime] = useState("In 20–30 mins");
    const [tableNum, setTableNum] = useState(tableLabel || "T1");

    // ── Notes & Payment Preference ─────────────────────────────────────────
    const [customerNotes, setCustomerNotes] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<"upi" | "cod">("upi");

    // ── Promos ────────────────────────────────────────────────────────────
    const [couponInput, setCouponInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        discount_paise: number;
        message: string;
    } | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);

    // ── Form Validation & Success State ───────────────────────────────────
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [placedOrder, setPlacedOrder] = useState<any | null>(null);
    const [showUpiModal, setShowUpiModal] = useState(false);

    // Persist details locally for returning customers
    useEffect(() => {
        if (customerName) safeStorage.setItem("surya_customer_name", customerName, "local");
    }, [customerName]);

    useEffect(() => {
        if (customerPhone) safeStorage.setItem("surya_customer_phone", customerPhone, "local");
    }, [customerPhone]);

    useEffect(() => {
        if (deliveryAddress) safeStorage.setItem("surya_delivery_address", deliveryAddress, "local");
    }, [deliveryAddress]);

    useEffect(() => {
        safeStorage.setItem("surya_order_type", orderType, "local");
    }, [orderType]);

    if (!isOpen) return null;

    // Financial Calculations
    const subtotalPaise = items.reduce((acc, it) => acc + it.price_paise * it.qty, 0);
    const discountPaise = appliedCoupon ? appliedCoupon.discount_paise : 0;
    const discountedSubtotal = Math.max(0, subtotalPaise - discountPaise);
    const totalPaise = discountedSubtotal; // Free delivery, no extra charges for direct customer orders

    // Promo code validation
    const applyPromoCode = (code: string) => {
        const clean = code.trim().toUpperCase();
        setCouponError(null);
        if (!clean) return;

        const promo = AVAILABLE_PROMOS.find(p => p.code === clean);
        if (!promo) {
            setCouponError("Invalid promo code. Try WELCOME50, BIRYANI10, or SURYA100.");
            setAppliedCoupon(null);
            return;
        }

        if (subtotalPaise < promo.minPaise) {
            setCouponError(`Code ${promo.code} requires minimum order of ${formatRupees(promo.minPaise)}`);
            setAppliedCoupon(null);
            return;
        }

        let disc = 0;
        if (promo.discountPaise) {
            disc = promo.discountPaise;
        } else if (promo.percent) {
            disc = Math.round((subtotalPaise * promo.percent) / 100);
        }

        setAppliedCoupon({
            code: promo.code,
            discount_paise: disc,
            message: `${promo.label} applied!`,
        });
        setCouponInput(promo.code);
    };

    const handleAddQuickTag = (tag: string) => {
        setCustomerNotes((prev) => {
            if (!prev) return tag;
            if (prev.includes(tag)) return prev;
            return `${prev}, ${tag}`;
        });
    };

    // ── Primary Action: Submit Order via WhatsApp ─────────────────────────
    const handleWhatsAppSubmit = () => {
        const errors: Record<string, string> = {};

        if (!customerName.trim()) {
            errors.customerName = "Please enter your name";
        }

        const cleanPhone = customerPhone.replace(/\D/g, "");
        if (!cleanPhone || cleanPhone.length < 10) {
            errors.customerPhone = "Please enter a valid 10-digit mobile number";
        }

        if (orderType === "delivery" && !deliveryAddress.trim()) {
            errors.deliveryAddress = "Please enter your delivery street / area in Kadiri";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});

        const orderId = `SRY-${Math.floor(1000 + Math.random() * 9000)}`;

        const payload: WhatsAppOrderPayload = {
            orderId,
            orderType,
            customerName: customerName.trim(),
            customerPhone: cleanPhone,
            deliveryAddress: deliveryAddress.trim(),
            landmark: landmark.trim(),
            pickupTime: orderType === "takeaway" ? pickupTime : undefined,
            tableNumber: orderType === "dine_in" ? (tableNum || tableLabel) : undefined,
            items: items.map(it => ({
                name: it.name,
                name_te: it.name_te,
                qty: it.qty,
                price_paise: it.price_paise,
                variant_name: it.variant_name,
                notes: it.notes,
            })),
            subtotalPaise,
            discountPaise,
            couponCode: appliedCoupon?.code,
            totalPaise,
            paymentPreference: selectedPayment,
            cookingNotes: customerNotes.trim(),
        };

        // 1. Launch WhatsApp with the pre-filled order
        openWhatsAppOrder(payload, "919880358634");

        // 2. Save order locally so customer has order record
        try {
            const savedHistory = safeStorage.getItem("surya_customer_orders", "local");
            const history = savedHistory ? JSON.parse(savedHistory) : [];
            history.unshift({
                ...payload,
                createdAt: new Date().toISOString(),
                status: "sent_to_whatsapp",
            });
            safeStorage.setItem("surya_customer_orders", JSON.stringify(history.slice(0, 20)), "local");
        } catch (e) {}

        // 3. Trigger background API sync if online (non-blocking)
        try {
            onCheckout(selectedPayment === "upi" ? "upi" : "counter", customerNotes).catch(() => {});
        } catch (e) {}

        // 4. Show success screen
        setPlacedOrder(payload);
    };

    const handleClearAndClose = () => {
        if (onClearCart) onClearCart();
        setPlacedOrder(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="relative w-full max-w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
                {/* ── HEADER ── */}
                <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-gradient-to-r from-[#1A0800] to-[#2D1000] text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-[#1A0800] flex items-center justify-center font-black shadow-sm">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-wide text-[#FAF8F2]">Your Order Cart</h3>
                            <p className="text-[11px] text-[#D4AF37] font-semibold">
                                Surya Family Restaurant, Kadiri • {items.length} {items.length === 1 ? "dish" : "dishes"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        aria-label="Close cart"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── PLACED ORDER SUCCESS MODAL ── */}
                {placedOrder ? (
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#FBF9F4] to-white">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-md">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                            WhatsApp Order Dispatched!
                        </span>

                        <h3 className="text-xl font-black text-espresso-950 mb-1">
                            Order #{placedOrder.orderId}
                        </h3>

                        <p className="text-xs text-espresso-600 max-w-xs mb-5">
                            Your order details were pre-filled and sent to Surya Family Restaurant on WhatsApp (+91 98803 58634).
                        </p>

                        {/* Order Summary Box */}
                        <div className="w-full bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs text-left mb-5 space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-espresso-700 border-b pb-2">
                                <span>Total Payable</span>
                                <span className="text-base font-black text-emerald-700 font-mono">
                                    {formatRupees(placedOrder.totalPaise)}
                                </span>
                            </div>

                            <div className="text-[11px] text-espresso-600 space-y-1 pt-1">
                                <p><span className="font-bold">Customer:</span> {placedOrder.customerName} ({placedOrder.customerPhone})</p>
                                <p><span className="font-bold">Type:</span> {placedOrder.orderType.toUpperCase()}</p>
                                {placedOrder.deliveryAddress && (
                                    <p><span className="font-bold">Address:</span> {placedOrder.deliveryAddress}</p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full space-y-2.5">
                            {/* UPI Payment Button */}
                            <a
                                href={`upi://pay?pa=9880358634@upi&pn=Surya%20Family%20Restaurant&am=${(placedOrder.totalPaise / 100).toFixed(2)}&cu=INR`}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition"
                            >
                                <Smartphone className="w-4 h-4" />
                                Pay {formatRupees(placedOrder.totalPaise)} via UPI App (GPay / PhonePe)
                            </a>

                            {/* Direct Call Button */}
                            <a
                                href="tel:+919880358634"
                                className="w-full py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100 transition"
                            >
                                <Phone className="w-3.5 h-3.5 text-amber-700" />
                                Call Restaurant (098803 58634)
                            </a>

                            {/* Re-open WhatsApp */}
                            <button
                                onClick={() => openWhatsAppOrder(placedOrder, "919880358634")}
                                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#20BA59] transition shadow-xs"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Re-open WhatsApp Chat
                            </button>

                            {/* Done Button */}
                            <button
                                onClick={handleClearAndClose}
                                className="w-full py-2 text-xs font-semibold text-espresso-500 hover:text-espresso-800 transition"
                            >
                                Done / Place Another Order
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── NORMAL CART & ORDER FLOW ── */
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5]">

                        {/* 1. ORDER TYPE SELECTOR (Delivery / Takeaway / Dine-In) */}
                        <div className="p-1 rounded-2xl bg-cream-200/70 p-1 flex items-center gap-1 shadow-inner">
                            {[
                                { type: "delivery", label: "🛵 Delivery", desc: "Doorstep in Kadiri" },
                                { type: "takeaway", label: "🥡 Takeaway", desc: "Self Pickup" },
                                { type: "dine_in", label: "🍽️ Dine-In", desc: `Table ${tableNum || "T1"}` },
                            ].map((opt) => (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => setOrderType(opt.type as any)}
                                    className={`flex-1 py-2 px-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                        orderType === opt.type
                                            ? "bg-[#1A0800] text-[#D4AF37] shadow-sm"
                                            : "text-espresso-700 hover:text-espresso-950"
                                    }`}
                                >
                                    <div>{opt.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* 2. CUSTOMER DETAILS FORM */}
                        <div className="p-3.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs space-y-2.5">
                            <p className="text-[11px] font-bold text-espresso-700 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-[#8C5338]" />
                                Your Contact Details
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Your Name *"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40"
                                    />
                                    {formErrors.customerName && (
                                        <span className="text-[9.5px] text-red-600 mt-0.5 block">{formErrors.customerName}</span>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Mobile (10 Digits) *"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40"
                                    />
                                    {formErrors.customerPhone && (
                                        <span className="text-[9.5px] text-red-600 mt-0.5 block">{formErrors.customerPhone}</span>
                                    )}
                                </div>
                            </div>

                            {/* Conditional Fields based on Order Type */}
                            {orderType === "delivery" && (
                                <div className="space-y-2 pt-1 border-t border-cream-100">
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Delivery Address (Street / Area in Kadiri) *"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40"
                                    />
                                    {formErrors.deliveryAddress && (
                                        <span className="text-[9.5px] text-red-600 mt-0.5 block">{formErrors.deliveryAddress}</span>
                                    )}

                                    <input
                                        type="text"
                                        value={landmark}
                                        onChange={(e) => setLandmark(e.target.value)}
                                        placeholder="Nearby Landmark (e.g. Near RTC Bus Stand)"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40"
                                    />
                                </div>
                            )}

                            {orderType === "takeaway" && (
                                <div className="pt-1 border-t border-cream-100 flex items-center justify-between">
                                    <span className="text-xs text-espresso-700 font-medium">Pickup In:</span>
                                    <select
                                        value={pickupTime}
                                        onChange={(e) => setPickupTime(e.target.value)}
                                        className="px-3 py-1.5 text-xs rounded-xl border border-cream-300 bg-white font-bold text-espresso-900"
                                    >
                                        <option>In 15–20 mins</option>
                                        <option>In 30–40 mins</option>
                                        <option>In 1 Hour</option>
                                        <option>Today Evening (7:30 PM)</option>
                                        <option>Today Dinner (8:30 PM)</option>
                                    </select>
                                </div>
                            )}

                            {orderType === "dine_in" && (
                                <div className="pt-1 border-t border-cream-100 flex items-center justify-between">
                                    <span className="text-xs text-espresso-700 font-medium">Table Number:</span>
                                    <input
                                        type="text"
                                        value={tableNum}
                                        onChange={(e) => setTableNum(e.target.value)}
                                        placeholder="Table (e.g. T1)"
                                        className="w-24 px-3 py-1.5 text-xs rounded-xl border border-cream-300 bg-white font-bold text-center text-espresso-900"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. ITEMS LIST */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-espresso-700 uppercase tracking-wider">
                                    Items in Cart ({items.length})
                                </span>
                                {items.length > 0 && onClearCart && (
                                    <button
                                        type="button"
                                        onClick={onClearCart}
                                        className="text-[11px] text-red-600 hover:underline font-semibold"
                                    >
                                        Clear Cart
                                    </button>
                                )}
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-12 text-espresso-400 bg-white rounded-2xl border border-cream-200">
                                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-espresso-300" />
                                    <p className="text-xs text-espresso-600 font-bold">Your cart is empty</p>
                                    <p className="text-[11px] text-espresso-400 mt-0.5">Explore our Biryani & Curries to add dishes!</p>
                                </div>
                            ) : (
                                items.map((it) => {
                                    const itemKey = it.cartKey || `${it.id}`;
                                    const isTelugu = language === "te" && !!it.name_te;
                                    const displayName = isTelugu ? it.name_te : it.name;

                                    return (
                                        <div
                                            key={itemKey}
                                            className="p-3 rounded-2xl border border-cream-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black text-espresso-950 truncate">
                                                    {displayName}
                                                </h4>
                                                {it.variant_name && (
                                                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                                        {it.variant_name}
                                                    </span>
                                                )}
                                                <p className="text-xs font-mono font-black text-espresso-950 mt-0.5">
                                                    {formatRupees(it.price_paise * it.qty)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 bg-cream-100 border border-cream-200 rounded-xl p-0.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        it.qty === 1
                                                            ? onClearItem(it.id, it.cartKey)
                                                            : onUpdateQty(it.id, -1, it.cartKey)
                                                    }
                                                    className="w-6 h-6 rounded-lg bg-white hover:bg-cream-200 text-espresso-800 flex items-center justify-center transition cursor-pointer"
                                                >
                                                    {it.qty === 1 ? (
                                                        <Trash2 className="w-3 h-3 text-red-600" />
                                                    ) : (
                                                        <Minus className="w-3 h-3" />
                                                    )}
                                                </button>
                                                <span className="w-5 text-center text-xs font-black font-mono">
                                                    {it.qty}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQty(it.id, 1, it.cartKey)}
                                                    className="w-6 h-6 rounded-lg bg-white hover:bg-cream-200 text-espresso-800 flex items-center justify-center transition cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* 4. COOKING INSTRUCTIONS */}
                        {items.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-2">
                                <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider">
                                    Special Cooking Instructions
                                </label>

                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_COOKING_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => handleAddQuickTag(tag)}
                                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cream-100 hover:bg-amber-100 text-espresso-800 border border-cream-200 transition"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                    placeholder="e.g., Make Biryani extra spicy, send extra raita, less oil..."
                                    rows={2}
                                    className="w-full p-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40 resize-none"
                                />
                            </div>
                        )}

                        {/* 5. COUPON & PROMO */}
                        {items.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        placeholder="Enter Promo Code (e.g. WELCOME50)"
                                        className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-cream-300 focus:border-emerald-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => applyPromoCode(couponInput)}
                                        className="px-4 py-1.5 rounded-xl bg-espresso-900 text-white font-bold text-xs hover:bg-espresso-950 transition"
                                    >
                                        Apply
                                    </button>
                                </div>

                                {appliedCoupon && (
                                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
                                        <span>🎉 {appliedCoupon.message}</span>
                                        <span className="font-mono font-black">-{formatRupees(appliedCoupon.discount_paise)}</span>
                                    </div>
                                )}

                                {couponError && (
                                    <p className="text-[10px] text-red-600 font-medium">{couponError}</p>
                                )}
                            </div>
                        )}

                        {/* 6. PAYMENT PREFERENCE */}
                        {items.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider">
                                    Payment Preference
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPayment("upi")}
                                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                            selectedPayment === "upi"
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                                                : "border-cream-300 bg-white text-espresso-700"
                                        }`}
                                    >
                                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>⚡ UPI (GPay/PhonePe)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedPayment("cod")}
                                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                            selectedPayment === "cod"
                                                ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                                                : "border-cream-300 bg-white text-espresso-700"
                                        }`}
                                    >
                                        <span>💵 Cash on Delivery</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 7. FINANCIAL BREAKDOWN */}
                        {items.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-1.5 text-xs text-espresso-700">
                                <div className="flex justify-between">
                                    <span>Item Subtotal</span>
                                    <span className="font-bold text-espresso-950">{formatRupees(subtotalPaise)}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-emerald-700 font-bold">
                                        <span>Discount ({appliedCoupon.code})</span>
                                        <span>-{formatRupees(appliedCoupon.discount_paise)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-espresso-600">
                                    <span>Delivery &amp; Packaging</span>
                                    <span className="font-bold text-emerald-600">FREE</span>
                                </div>
                                <div className="flex justify-between text-sm font-black text-espresso-950 pt-2 border-t border-cream-200">
                                    <span>Total Payable</span>
                                    <span className="text-base text-emerald-700 font-mono font-black">
                                        {formatRupees(totalPaise)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 8. PRIMARY WHATSAPP SUBMIT BUTTON */}
                        {items.length > 0 && (
                            <button
                                type="button"
                                onClick={handleWhatsAppSubmit}
                                className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-emerald-600/25 transition-all hover:brightness-105 active:scale-[0.99] cursor-pointer"
                                style={{ background: "#25D366" }}
                            >
                                <div className="flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span>Send Order via WhatsApp • {formatRupees(totalPaise)}</span>
                                </div>
                                <span className="text-[10px] font-normal text-white/90">
                                    Direct to Surya Family Restaurant (098803 58634)
                                </span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
