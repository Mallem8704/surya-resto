"use client";

import React, { useState } from "react";
import {
    X,
    Trash2,
    Plus,
    Minus,
    ShoppingBag,
    ChefHat,
    Lock,
    UserCheck,
    Smartphone,
    Receipt,
    Sparkles,
    Utensils,
    QrCode,
    Flame,
} from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { useCustomer } from "@/context/CustomerContext";
import { Button } from "@/components/ui/Button";

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
    onCheckout: (
        paymentMethod: "counter" | "upi",
        customerNotes: string,
        promo?: { code: string; discount_paise: number }
    ) => Promise<void>;
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
    onClearItem,
    onCheckout,
    isPlacingOrder,
    onClearCart,
}: CartDrawerProps) {
    const { language } = useLanguage();
    const { customer, isCustomerLoggedIn, logoutCustomer, requireCustomerAuth } = useCustomer();

    // Notes & Payment Preference
    const [customerNotes, setCustomerNotes] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<"counter" | "upi">("counter");

    // Promos
    const [couponInput, setCouponInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        discount_paise: number;
        message: string;
    } | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Financial Calculations
    const subtotalPaise = items.reduce((acc, it) => acc + it.price_paise * it.qty, 0);
    const discountPaise = appliedCoupon ? appliedCoupon.discount_paise : 0;
    const totalPaise = Math.max(0, subtotalPaise - discountPaise);

    // Promo code validation
    const applyPromoCode = (code: string) => {
        const clean = code.trim().toUpperCase();
        setCouponError(null);
        if (!clean) return;

        const promo = AVAILABLE_PROMOS.find((p) => p.code === clean);
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

    // Direct Kitchen Order Submission
    const handleDirectOrder = async () => {
        // Enforce mandatory customer login gate before placing order
        if (!isCustomerLoggedIn) {
            requireCustomerAuth(() => {
                handleDirectOrder();
            });
            return;
        }

        try {
            await onCheckout(
                selectedPayment,
                customerNotes.trim(),
                appliedCoupon ? { code: appliedCoupon.code, discount_paise: appliedCoupon.discount_paise } : undefined
            );
        } catch (err: any) {
            console.error("Direct checkout failed:", err);
        }
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
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-espresso-950 flex items-center justify-center font-black shadow-sm">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-wide text-white">Table Order Cart</h3>
                            <p className="text-[11px] text-amber-200 font-bold flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1"><Utensils className="w-3 h-3 text-amber-300" /> Table {tableLabel || "T1"}</span>
                                <span className="text-white/40">•</span>
                                <span className="text-white/80">Direct to Kitchen</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                        aria-label="Close cart"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── CART BODY ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5]">
                    {/* 1. CUSTOMER SESSION STATUS */}
                    {isCustomerLoggedIn && customer ? (
                        <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    <UserCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-emerald-950 text-xs">
                                        {customer.name || "Surya Diner"} <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full ml-1">Active</span>
                                    </p>
                                    <p className="text-[11px] text-emerald-700 font-mono">+91 {customer.phone}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={logoutCustomer}
                                className="text-[11px] font-bold text-espresso-600 hover:text-espresso-950 hover:bg-white/80 px-2.5 py-1 rounded-lg border border-espresso-200 transition"
                            >
                                Switch
                            </button>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs flex items-center justify-between shadow-2xs">
                            <div>
                                <p className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-700" /> Diner Login Required
                                </p>
                                <p className="text-[11px] text-amber-800 mt-0.5">Mobile + Password (Zero OTP)</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => requireCustomerAuth()}
                                className="px-3 py-1.5 rounded-xl bg-espresso-950 text-amber-300 font-black text-xs hover:bg-espresso-900 transition cursor-pointer"
                            >
                                Sign In
                            </button>
                        </div>
                    )}

                    {/* 2. ITEMS LIST */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-espresso-700 uppercase tracking-wider">
                                Ordered Dishes ({items.length})
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

                    {/* 3. SPECIAL COOKING INSTRUCTIONS */}
                    {items.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-2">
                            <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                Chef Cooking Requests
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
                                placeholder="e.g., Make Biryani extra spicy, extra gravy, less oil..."
                                rows={2}
                                className="w-full p-2 text-xs rounded-xl border border-cream-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-cream-50/40 resize-none"
                            />
                        </div>
                    )}

                    {/* 4. COUPON & PROMO */}
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
                                    <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600" /> {appliedCoupon.message}</span>
                                    <span className="font-mono font-black">-{formatRupees(appliedCoupon.discount_paise)}</span>
                                </div>
                            )}

                            {couponError && (
                                <p className="text-[10px] text-red-600 font-medium">{couponError}</p>
                            )}
                        </div>
                    )}

                    {/* 5. PAYMENT METHOD AT TABLE */}
                    {items.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider">
                                Payment Method at Table
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPayment("counter")}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                        selectedPayment === "counter"
                                            ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                                            : "border-cream-300 bg-white text-espresso-700"
                                    }`}
                                >
                                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pay at Counter</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedPayment("upi")}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                        selectedPayment === "upi"
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                                            : "border-cream-300 bg-white text-espresso-700"
                                    }`}
                                >
                                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>UPI at Table</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 6. BILL BREAKDOWN */}
                    {items.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-1.5 text-xs text-espresso-700">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-bold text-espresso-950">{formatRupees(subtotalPaise)}</span>
                            </div>
                            {appliedCoupon && (
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>Discount ({appliedCoupon.code})</span>
                                    <span>-{formatRupees(appliedCoupon.discount_paise)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-espresso-500">
                                <span>GST (5%)</span>
                                <span className="font-medium text-espresso-600">Included</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-espresso-950 pt-2 border-t border-cream-200">
                                <span>Total Bill</span>
                                <span className="text-base text-terracotta-700 font-mono font-black">
                                    {formatRupees(totalPaise)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 7. DIRECT KITCHEN ORDER BUTTON */}
                    {items.length > 0 && (
                        <Button
                            type="button"
                            variant="primary"
                            size="lg"
                            isLoading={isPlacingOrder}
                            onClick={handleDirectOrder}
                            className="w-full py-4 px-4 rounded-2xl font-black text-sm text-white flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-amber-900/20 transition-all transform active:scale-[0.99] cursor-pointer bg-gradient-to-r from-terracotta-600 via-amber-600 to-espresso-950 hover:from-terracotta-700 hover:to-espresso-900 border border-amber-400/30"
                        >
                            <div className="flex items-center gap-2">
                                <ChefHat className="w-4 h-4 text-amber-300" />
                                <span>Send Order to Kitchen • {formatRupees(totalPaise)}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-100/90">
                                <Flame className="w-3 h-3 text-amber-300 shrink-0" />
                                <span>Direct KOT to Chef at Table {tableLabel || "T1"}</span>
                            </span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
