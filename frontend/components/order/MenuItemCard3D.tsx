"use client";

import React, { useState } from "react";
import { Plus, Minus, ChefHat, Info, X, Sparkles } from "lucide-react";
import { VegBadge, SpecialBadge } from "@/components/ui/Badge";
import { formatRupees } from "@/lib/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { getDishImage } from "@/lib/dishImages";
import type { MenuItemData } from "@/components/order/MenuItemCard";

interface MenuItemCard3DProps {
    item: MenuItemData;
    cartQty: number;
    onAdd: () => void;
    onRemove: () => void;
    staggerIndex?: number;
    themeColor?: string;
}

/* ── Fallback images by category ── */
const CATEGORY_DEFAULT_IMAGES: Record<number, string> = {
    1: "/dishes/3d_tiffin.jpg",
    2: "/dishes/3d_dosa.jpg",
    3: "/dishes/3d_snacks.jpg",
    4: "/dishes/3d_veg_starters.jpg",
    5: "/dishes/3d_veg_starters.jpg",
    6: "/dishes/3d_nonveg_starters.jpg",
    7: "/dishes/3d_curries.jpg",
    8: "/dishes/3d_biryani.jpg",
    9: "/dishes/3d_curries.jpg",
    10: "/dishes/3d_mandi.jpg",
    11: "/dishes/3d_beverages.jpg",
};

/* ── Theme color maps ── */
const addBtnColors: Record<string, string> = {
    terracotta: "bg-terracotta-500 hover:bg-terracotta-600 shadow-terracotta-500/25",
    saffron:    "bg-saffron-500 hover:bg-saffron-600 shadow-saffron-500/25",
    emerald:    "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25",
    red:        "bg-red-500 hover:bg-red-600 shadow-red-500/25",
    amber:      "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25",
    purple:     "bg-purple-500 hover:bg-purple-600 shadow-purple-500/25",
    cyan:       "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/25",
};

const accentGradient: Record<string, string> = {
    terracotta: "from-terracotta-500 to-terracotta-700",
    saffron:    "from-saffron-500 to-amber-600",
    emerald:    "from-emerald-500 to-emerald-700",
    red:        "from-red-500 to-red-700",
    amber:      "from-amber-500 to-amber-700",
    purple:     "from-purple-500 to-purple-700",
    cyan:       "from-cyan-500 to-cyan-700",
};

const stepperBg: Record<string, string> = {
    terracotta: "bg-terracotta-50 border-terracotta-200",
    saffron:    "bg-saffron-50 border-saffron-200",
    emerald:    "bg-emerald-50 border-emerald-200",
    red:        "bg-red-50 border-red-200",
    amber:      "bg-amber-50 border-amber-200",
    purple:     "bg-purple-50 border-purple-200",
    cyan:       "bg-cyan-50 border-cyan-200",
};

const stepperBtnAdd: Record<string, string> = {
    terracotta: "bg-terracotta-500 hover:bg-terracotta-600",
    saffron:    "bg-saffron-500 hover:bg-saffron-600",
    emerald:    "bg-emerald-500 hover:bg-emerald-600",
    red:        "bg-red-500 hover:bg-red-600",
    amber:      "bg-amber-500 hover:bg-amber-600",
    purple:     "bg-purple-500 hover:bg-purple-600",
    cyan:       "bg-cyan-500 hover:bg-cyan-600",
};

export function MenuItemCard3D({
    item,
    cartQty,
    onAdd,
    onRemove,
    themeColor = "terracotta",
}: MenuItemCard3DProps) {
    const { language, t } = useLanguage();
    const [showDetails, setShowDetails] = useState(false);
    const [imageError, setImageError] = useState(false);

    const isOutOfStock = !item.is_available || (item.track_stock && item.stock_qty <= 0);
    const displayName = language === "te" && item.name_te ? item.name_te : item.name;
    const displayDesc = language === "te" && item.description_te ? item.description_te : item.description;

    const c = themeColor in addBtnColors ? themeColor : "terracotta";

    // Resolve distinct dish image
    const finalImageSrc = imageError ? "/dishes/3d_biryani.jpg" : getDishImage(item);

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOutOfStock) return;
        onAdd();
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    return (
        <>
            {/* Main Menu Item Card — 100% Lightweight & iOS Safari Compatible */}
            <div
                className={`bg-white rounded-3xl border-2 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-200 h-full ${
                    isOutOfStock
                        ? "border-cream-200 opacity-60"
                        : "border-cream-200/90 hover:border-terracotta-400"
                }`}
            >
                {/* Dish Image Header */}
                <div className="relative h-44 sm:h-48 bg-gradient-to-br from-cream-100 to-cream-200 overflow-hidden flex items-center justify-center">
                    <img
                        src={finalImageSrc}
                        alt={displayName}
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                    />

                    {/* Veg / Non-Veg & Special Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                        <VegBadge isVeg={item.is_veg} showText={false} />
                        {item.is_special && <SpecialBadge label={t("special")} />}
                    </div>

                    {/* Stock Alert Badge */}
                    <div className="absolute top-3 right-3 z-10">
                        {isOutOfStock ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-600/95 text-white text-[11px] font-extrabold shadow-sm">
                                {t("out_of_stock")}
                            </span>
                        ) : item.track_stock && item.stock_qty <= item.low_stock_threshold ? (
                            <span className="px-2 py-0.5 rounded-full bg-saffron-500/95 text-espresso-950 text-[10px] font-bold shadow-sm">
                                {t("low_stock")} ({item.stock_qty})
                            </span>
                        ) : null}
                    </div>

                    {/* Info Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(true);
                        }}
                        className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs shadow-md flex items-center justify-center text-espresso-700 hover:text-espresso-950 hover:bg-white transition active:scale-90 cursor-pointer"
                        title="View details & ingredients"
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Content & Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-[15px] font-extrabold text-espresso-950 leading-snug line-clamp-1">
                                {displayName}
                            </h4>
                            <span
                                className={`text-[16px] font-black shrink-0 bg-gradient-to-br ${accentGradient[c]} bg-clip-text text-transparent font-mono`}
                            >
                                {formatRupees(item.price_paise)}
                            </span>
                        </div>

                        {displayDesc && (
                            <p className="text-[12px] text-espresso-500 line-clamp-2 leading-relaxed font-normal">
                                {displayDesc}
                            </p>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-espresso-500">
                            <span className={`w-2 h-2 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span>{item.is_veg ? "Veg" : "Non-Veg"}</span>
                        </div>

                        {isOutOfStock ? (
                            <button
                                disabled
                                className="px-3.5 py-1.5 rounded-xl bg-cream-200 text-espresso-400 text-xs font-bold cursor-not-allowed"
                            >
                                {t("out_of_stock")}
                            </button>
                        ) : cartQty > 0 ? (
                            <div
                                className={`inline-flex items-center gap-1.5 p-1 rounded-xl border shadow-xs ${stepperBg[c]}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={handleRemoveClick}
                                    className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-white hover:bg-cream-100 text-espresso-800 flex items-center justify-center font-bold shadow-xs transition active:scale-90 cursor-pointer"
                                >
                                    <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </button>
                                <span className="w-6 sm:w-5 text-center text-sm font-black text-espresso-950 font-mono">
                                    {cartQty}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddClick}
                                    className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg text-white flex items-center justify-center font-bold shadow-xs transition active:scale-90 cursor-pointer ${stepperBtnAdd[c]}`}
                                >
                                    <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-white text-xs font-extrabold shadow-sm active:scale-95 transition cursor-pointer min-h-[36px] ${addBtnColors[c]}`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t("add_to_cart")}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dish Details Modal */}
            {showDetails && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in"
                    onClick={() => setShowDetails(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-cream-300 animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`px-5 py-4 bg-gradient-to-r ${accentGradient[c]} text-white flex items-center justify-between sticky top-0 z-10`}>
                            <div>
                                <h3 className="text-base font-extrabold leading-tight">{displayName}</h3>
                                <span className="text-sm font-mono font-bold opacity-95">{formatRupees(item.price_paise)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            <img
                                src={finalImageSrc}
                                alt={displayName}
                                className="w-full h-40 object-cover rounded-2xl"
                            />

                            <p className="text-xs text-espresso-700 leading-relaxed">
                                {displayDesc || "Authentic recipe crafted with fresh ingredients, traditional ground spices, and culinary mastery."}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${item.is_veg ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                    <span className={`w-2 h-2 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                                    {item.is_veg ? "100% Pure Vegetarian" : "Non-Vegetarian"}
                                </span>
                                {item.is_special && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-saffron-100 text-saffron-800 text-[11px] font-extrabold">
                                        <Sparkles className="w-3 h-3" />
                                        Chef's Special
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    handleAddClick(e);
                                    setShowDetails(false);
                                }}
                                disabled={isOutOfStock}
                                className={`w-full py-3 rounded-xl text-white text-xs font-extrabold shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer ${
                                    isOutOfStock ? "bg-cream-300 text-espresso-400 cursor-not-allowed" : addBtnColors[c]
                                }`}
                            >
                                <Plus className="w-4 h-4" />
                                <span>{t("add_to_cart")} — {formatRupees(item.price_paise)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
