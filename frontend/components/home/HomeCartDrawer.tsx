"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    X,
    Trash2,
    Plus,
    Minus,
    ShoppingBag,
    ArrowRight,
    UtensilsCrossed,
    Truck,
    Building2,
    MapPin,
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import { safeStorage } from "@/lib/safeStorage";
import { useToast } from "@/context/ToastContext";

export interface HomeCartItem {
    id: number;
    name: string;
    name_te?: string;
    price: number;
    price_paise: number;
    image: string;
    qty: number;
}

interface HomeCartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cart: HomeCartItem[];
    onUpdateQty: (dishId: number, delta: number) => void;
    onRemoveItem: (dishId: number) => void;
    onClearCart: () => void;
}

export function HomeCartDrawer({
    isOpen,
    onClose,
    cart,
    onUpdateQty,
    onRemoveItem,
    onClearCart,
}: HomeCartDrawerProps) {
    const router = useRouter();
    const toast = useToast();
    const [selectedBranch, setSelectedBranch] = useState<number>(1);
    const [selectedTable, setSelectedTable] = useState<string>("T1");
    const [orderMode, setOrderMode] = useState<"dine_in" | "delivery">("dine_in");

    if (!isOpen) return null;

    const cartCount = cart.reduce((sum, it) => sum + it.qty, 0);
    const cartSubtotal = cart.reduce((sum, it) => sum + it.price * it.qty, 0);
    const cartTax = Math.round(cartSubtotal * 0.05);
    const cartTotal = cartSubtotal + cartTax;

    const handleProceedToTableOrder = () => {
        if (cart.length === 0) return;
        // Format for order page
        const orderPageCart = cart.map((it) => ({
            id: it.id,
            cartKey: `item_${it.id}`,
            name: it.name,
            name_te: it.name_te,
            price_paise: it.price_paise,
            qty: it.qty,
        }));
        safeStorage.setItem("surya_cart", JSON.stringify(orderPageCart), "session");
        safeStorage.setItem("surya_table", selectedTable, "session");
        toast.success(`Opening Table ${selectedTable} at Surya Family Restaurant...`);
        onClose();
        router.push(`/order?branch=${selectedBranch}&table=${selectedTable}`);
    };

    const handleProceedToDelivery = () => {
        if (cart.length === 0) return;
        const deliveryCart = cart.map((it) => ({
            cartKey: `home_${it.id}_${Date.now()}`,
            item: {
                id: it.id,
                name: it.name,
                name_te: it.name_te,
                price_paise: it.price_paise,
                category_id: 1,
                is_available: true,
                is_special: false,
                is_veg: false,
                has_variants: false,
                image_url: it.image,
            },
            qty: it.qty,
            notes: "",
        }));
        safeStorage.setItem("surya_delivery_cart", JSON.stringify(deliveryCart), "session");
        toast.success("Opening 100% Free Home Delivery checkout...");
        onClose();
        router.push(`/delivery?branch=${selectedBranch}`);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over panel */}
            <div className="relative z-10 w-full max-w-md bg-[#120E0A] text-[#F8F3EB] border-l border-[#D4AF37]/30 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-5 border-b border-[#D4AF37]/20 bg-[#1A140F] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-serif font-extrabold text-base text-white tracking-wide flex items-center gap-2">
                                Your Surya Order Cart
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-black">
                                    {cartCount}
                                </span>
                            </h2>
                            <p className="text-xs text-[#D4AF37]/80">Fresh gourmet dishes selected</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-white/30">
                                <ShoppingBag className="w-8 h-8" />
                            </div>
                            <h3 className="font-serif font-bold text-white text-base">Your Cart is Empty</h3>
                            <p className="text-xs text-white/50 max-w-xs mx-auto">
                                Add our signature Mandi, charcoal grills, and Arabian delights from the home menu.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-white/60 pb-1">
                                <span>Selected Dishes ({cart.length})</span>
                                <button
                                    onClick={onClearCart}
                                    className="text-red-400 hover:text-red-300 underline text-[11px] cursor-pointer"
                                >
                                    Clear Cart
                                </button>
                            </div>

                            {cart.map((dish) => (
                                <div
                                    key={dish.id}
                                    className="p-3.5 rounded-2xl bg-[#1A140F] border border-white/10 hover:border-[#D4AF37]/40 transition flex items-center gap-3.5"
                                >
                                    {/* Dish Thumbnail */}
                                    <img
                                        src={dish.image}
                                        alt={dish.name}
                                        className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-white truncate">{dish.name}</h4>
                                        {dish.name_te && (
                                            <p className="text-[11px] text-[#D4AF37]/70 truncate">{dish.name_te}</p>
                                        )}
                                        <p className="font-mono text-xs font-black text-[#D4AF37] mt-1">
                                            ₹{dish.price} each
                                        </p>
                                    </div>

                                    {/* Quantity Stepper */}
                                    <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-2 py-1 shrink-0">
                                        <button
                                            onClick={() => onUpdateQty(dish.id, -1)}
                                            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-black transition cursor-pointer"
                                            title="Decrease"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="font-mono font-bold text-xs text-white px-1 min-w-[14px] text-center">
                                            {dish.qty}
                                        </span>
                                        <button
                                            onClick={() => onUpdateQty(dish.id, 1)}
                                            className="w-6 h-6 rounded-lg bg-[#D4AF37] hover:bg-[#E5C058] text-black flex items-center justify-center font-black transition cursor-pointer"
                                            title="Increase"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout Controls */}
                {cart.length > 0 && (
                    <div className="p-5 border-t border-[#D4AF37]/20 bg-[#1A140F] space-y-4">
                        {/* Bill Breakdown */}
                        <div className="space-y-1.5 text-xs text-white/70 border-b border-white/10 pb-3">
                            <div className="flex justify-between">
                                <span>Item Subtotal</span>
                                <span className="font-mono text-white">₹{cartSubtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GST (5%)</span>
                                <span className="font-mono text-white">₹{cartTax}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400">
                                <span>Home Delivery / Table Service</span>
                                <span className="font-bold uppercase tracking-wider text-[10px]">FREE ₹0</span>
                            </div>
                            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-white/10">
                                <span>Total Payable</span>
                                <span className="font-mono text-base text-[#D4AF37] font-black">₹{cartTotal}</span>
                            </div>
                        </div>

                        {/* Order Mode Toggle */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
                                Choose Where to Order:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOrderMode("dine_in")}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                        orderMode === "dine_in"
                                            ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md"
                                            : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
                                    }`}
                                >
                                    <UtensilsCrossed className="w-4 h-4" />
                                    <span>Dine-In Table</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderMode("delivery")}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                        orderMode === "delivery"
                                            ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md"
                                            : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
                                    }`}
                                >
                                    <Truck className="w-4 h-4" />
                                    <span>Free Delivery</span>
                                </button>
                            </div>
                        </div>

                        {/* If Dine-In: Branch & Table Pickers */}
                        {orderMode === "dine_in" ? (
                            <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Branch */}
                                    <div>
                                        <label className="text-[10px] text-white/50 uppercase font-bold block mb-1">
                                            Branch
                                        </label>
                                        <select
                                            value={selectedBranch}
                                            onChange={(e) => setSelectedBranch(Number(e.target.value))}
                                            className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                        >
                                            <option value={1}>Surya Family Restaurant (Bypass Rd)</option>
                                        </select>
                                    </div>

                                    {/* Table */}
                                    <div>
                                        <label className="text-[10px] text-white/50 uppercase font-bold block mb-1">
                                            Table Number
                                        </label>
                                        <select
                                            value={selectedTable}
                                            onChange={(e) => setSelectedTable(e.target.value)}
                                            className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => `T${i + 1}`).map((tbl) => (
                                                <option key={tbl} value={tbl}>
                                                    Table {tbl}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProceedToTableOrder}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                                >
                                    <span>ORDER FOR TABLE {selectedTable}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="pt-1">
                                <button
                                    onClick={handleProceedToDelivery}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                                >
                                    <span>PROCEED TO FREE DELIVERY</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
