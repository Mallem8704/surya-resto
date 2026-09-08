"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Plus, Minus, Check, Sparkles, ChefHat, Users, CheckCircle2 } from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { VegBadge } from "@/components/ui/Badge";
import { soundManager } from "@/lib/sound";

export interface MenuItemVariantData {
    id: number;
    item_id: number;
    name: string;
    name_te?: string | null;
    price_paise: number;
    is_default: boolean;
    is_available: boolean;
}

export interface MenuItemAddonData {
    id: number;
    item_id: number;
    name: string;
    name_te?: string | null;
    price_paise: number;
    is_available: boolean;
}

export interface CustomizerItemData {
    id: number;
    name: string;
    name_te?: string | null;
    description?: string | null;
    price_paise: number;
    image_url?: string | null;
    is_veg: boolean;
    variants?: MenuItemVariantData[];
    addons?: MenuItemAddonData[];
}

export interface CustomizedSelection {
    item: CustomizerItemData;
    variant: MenuItemVariantData | null;
    addons: MenuItemAddonData[];
    qty: number;
    notes: string;
    totalPaise: number;
}

interface DishCustomizerModalProps {
    isOpen: boolean;
    item: CustomizerItemData | null;
    language: "en" | "te";
    onClose: () => void;
    onAddToCart: (customized: CustomizedSelection) => void;
}

function getPaxBadge(name: string) {
    const n = name.toLowerCase();
    if (n.includes("single") || n.includes("1 pax") || n.includes("small")) {
        return { label: "Serves 1", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (n.includes("half") || n.includes("2 pax") || n.includes("medium")) {
        return { label: "Serves 1–2", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (n.includes("full") || n.includes("3") || n.includes("4 pax") || n.includes("large")) {
        return { label: "Serves 3–4", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (n.includes("family") || n.includes("jumbo") || n.includes("5") || n.includes("6 pax")) {
        return { label: "Serves 5–6", color: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    return { label: "Portion", color: "bg-cream-100 text-espresso-700 border-espresso-200" };
}

export function DishCustomizerModal({
    isOpen,
    item,
    language,
    onClose,
    onAddToCart,
}: DishCustomizerModalProps) {
    if (!isOpen || !item) return null;

    const variants = item.variants || [];
    const addons = item.addons || [];

    const defaultVariant = variants.find((v) => v.is_default) || variants[0] || null;

    const [selectedVariant, setSelectedVariant] = useState<MenuItemVariantData | null>(defaultVariant);
    const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (item) {
            const defV = (item.variants || []).find((v) => v.is_default) || (item.variants || [])[0] || null;
            setSelectedVariant(defV);
            setSelectedAddonIds([]);
            setQty(1);
            setNotes("");
        }
    }, [item]);

    const unitPricePaise = useMemo(() => {
        const base = selectedVariant ? selectedVariant.price_paise : item.price_paise;
        const addonsCost = addons
            .filter((a) => selectedAddonIds.includes(a.id))
            .reduce((sum, a) => sum + a.price_paise, 0);
        return base + addonsCost;
    }, [item.price_paise, selectedVariant, addons, selectedAddonIds]);

    const totalPaise = unitPricePaise * qty;

    const toggleAddon = (id: number) => {
        setSelectedAddonIds((prev) =>
            prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        soundManager.playAddToCartPop();
        const chosenAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
        onAddToCart({
            item,
            variant: selectedVariant,
            addons: chosenAddons,
            qty,
            notes: notes.trim(),
            totalPaise,
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-300"
            onClick={onClose}
        >
            <style jsx>{`
                @keyframes springUp {
                    0% { transform: translateY(100%); }
                    60% { transform: translateY(-4px); }
                    100% { transform: translateY(0); }
                }
                .sheet-spring {
                    animation: springUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            <div
                className="sheet-spring relative w-full max-w-lg max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-terracotta-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Drag Handle Indicator */}
                <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-cream-50/50">
                    <div className="w-12 h-1.5 rounded-full bg-espresso-300/60" />
                </div>

                {/* Header with Dish Details */}
                <div className="p-5 pb-4 border-b border-terracotta-100 bg-gradient-to-r from-cream-50 via-white to-saffron-50/30">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                <VegBadge isVeg={item.is_veg} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-saffron-700 bg-saffron-100/90 px-2 py-0.5 rounded-full border border-saffron-200">
                                    {language === "te" ? "కస్టమైజ్ చేయండి" : "Customizable Feast"}
                                </span>
                            </div>
                            <h3 className="text-xl font-serif font-black text-espresso-950 leading-snug">
                                {language === "te" && item.name_te ? item.name_te : item.name}
                            </h3>
                            {item.description && (
                                <p className="text-xs text-espresso-600 line-clamp-2 mt-1 leading-relaxed">
                                    {item.description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-espresso-400 hover:text-espresso-900 hover:bg-terracotta-100/60 transition-colors shrink-0 cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Customization Options */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* 1. Portion / Size Selection */}
                    {variants.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black uppercase tracking-wider text-espresso-900 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
                                    {language === "te" ? "పరిమాణం ఎంచుకోండి" : "1. Select Portion Size"}
                                    <span className="text-terracotta-600 font-bold">*</span>
                                </label>
                                <span className="text-[11px] text-espresso-500 font-medium">
                                    {language === "te" ? "ఒకటి ఎంచుకోండి" : "Required"}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {variants.map((v) => {
                                    const isSelected = selectedVariant?.id === v.id;
                                    const pax = getPaxBadge(v.name);

                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setSelectedVariant(v)}
                                            className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-saffron-50/90 border-saffron-500 shadow-md ring-2 ring-saffron-400/40"
                                                    : "bg-white border-terracotta-200/80 hover:border-terracotta-300 hover:bg-cream-50/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            isSelected
                                                                ? "border-saffron-600 bg-saffron-600 text-white"
                                                                : "border-espresso-300 bg-white"
                                                        }`}
                                                    >
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <span className="text-sm font-extrabold text-espresso-950">
                                                        {language === "te" && v.name_te ? v.name_te : v.name}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${pax.color}`}>
                                                    <Users className="w-3 h-3" />
                                                    {pax.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 border-t border-dashed border-espresso-100">
                                                <span className="text-[11px] text-espresso-500 font-medium">Price:</span>
                                                <span className="text-sm font-black text-espresso-950 font-mono">
                                                    {formatRupees(v.price_paise)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 2. Add-ons Selection */}
                    {addons.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black uppercase tracking-wider text-espresso-900 flex items-center gap-1.5">
                                    <ChefHat className="w-3.5 h-3.5 text-terracotta-600" />
                                    {language === "te" ? "అదనపు సైడ్స్ & యాడ్-ఆన్స్" : "2. Popular Arabian Add-ons"}
                                </label>
                                <span className="text-[11px] text-espresso-500 font-medium">
                                    {language === "te" ? "ఐచ్ఛికం" : "Optional"}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {addons.map((a) => {
                                    const isChecked = selectedAddonIds.includes(a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => toggleAddon(a.id)}
                                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                isChecked
                                                    ? "bg-terracotta-50/80 border-terracotta-500 shadow-xs ring-1 ring-terracotta-400/30"
                                                    : "bg-white border-terracotta-200/80 hover:border-terracotta-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                        isChecked
                                                            ? "bg-terracotta-600 border-terracotta-600 text-white"
                                                            : "bg-white border-espresso-300"
                                                    }`}
                                                >
                                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                                <span className="text-xs font-bold text-espresso-900">
                                                    {language === "te" && a.name_te ? a.name_te : a.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-terracotta-700 font-mono">
                                                +{formatRupees(a.price_paise)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 3. Cooking Notes */}
                    <div>
                        <label className="block text-xs font-bold text-espresso-800 mb-1.5">
                            {language === "te" ? "వంట సూచనలు (ఐచ్ఛికం)" : "3. Cooking / Taste Instructions (Optional)"}
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={
                                language === "te"
                                    ? "ఉదా: తక్కువ కారం, అదనపు నిమ్మకాయ..."
                                    : "e.g. Extra spicy, keep garlic dip separate, crispy fried chicken..."
                            }
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-terracotta-200 focus:outline-hidden focus:ring-2 focus:ring-terracotta-500 bg-cream-50/40 text-espresso-900 placeholder:text-espresso-400"
                        />
                    </div>
                </div>

                {/* Footer Bar: Quantity & Add Button */}
                <div className="p-4 sm:p-5 border-t border-terracotta-100 bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 sm:gap-4 pb-safe shrink-0">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 bg-cream-100 border border-cream-200 rounded-xl p-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-espresso-800 hover:bg-cream-200 transition-colors disabled:opacity-40 cursor-pointer"
                            disabled={qty <= 1}
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-black text-espresso-950 font-mono">
                            {qty}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQty((prev) => Math.min(20, prev + 1))}
                            className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-espresso-800 hover:bg-cream-200 transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Add to Order Button */}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-terracotta-600 via-amber-600 to-terracotta-700 hover:from-terracotta-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-lg shadow-terracotta-600/30 flex items-center justify-between transition-all transform active:scale-98 cursor-pointer"
                    >
                        <span>{language === "te" ? "ఆర్డర్‌కి జోడించండి" : "Add to Order"}</span>
                        <span className="font-mono font-black text-sm bg-white/20 px-2.5 py-0.5 rounded-lg">
                            {formatRupees(totalPaise)}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
