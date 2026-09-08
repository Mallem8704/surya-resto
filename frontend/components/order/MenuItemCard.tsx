"use client";

import React from "react";
import { Plus, Minus, ChefHat, Sparkles } from "lucide-react";
import { VegBadge, SpecialBadge, StockBadge } from "@/components/ui/Badge";
import { formatRupees } from "@/lib/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { getDishImage } from "@/lib/dishImages";

export interface MenuItemData {
    id: number;
    category_id: number;
    name: string;
    name_te?: string;
    description?: string;
    description_te?: string;
    price_paise: number;
    image_url?: string;
    is_veg: boolean;
    is_available: boolean;
    track_stock: boolean;
    stock_qty: number;
    low_stock_threshold: number;
    is_special: boolean;
}

interface MenuItemCardProps {
    item: MenuItemData;
    cartQty: number;
    onAdd: () => void;
    onRemove: () => void;
}

export function MenuItemCard({ item, cartQty, onAdd, onRemove }: MenuItemCardProps) {
    const { language, t } = useLanguage();
    const isOutOfStock = !item.is_available || (item.track_stock && item.stock_qty <= 0);

    const displayName = language === "te" && item.name_te ? item.name_te : item.name;
    const displayDesc = language === "te" && item.description_te ? item.description_te : item.description;

    return (
        <div
            className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isOutOfStock
                    ? "border-cream-200 opacity-60 bg-cream-50/50"
                    : "border-cream-200 hover:border-terracotta-300 hover:shadow-md hover:-translate-y-0.5"
            }`}
        >
            <div>
                {/* Image / Banner Area */}
                <div className="h-40 bg-linear-to-br from-cream-100 to-cream-200 relative flex items-center justify-center overflow-hidden">
                    <img
                        src={getDishImage(item)}
                        alt={displayName}
                        className="w-full h-full object-cover"
                    />

                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                        <VegBadge isVeg={item.is_veg} showText={false} />
                        {item.is_special && <SpecialBadge label={t("special")} />}
                    </div>

                    {/* Stock Alert Badge */}
                    <div className="absolute top-3 right-3 z-10">
                        {isOutOfStock ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-extrabold shadow-sm backdrop-blur-xs">
                                {t("out_of_stock")}
                            </span>
                        ) : item.track_stock && item.stock_qty <= item.low_stock_threshold ? (
                            <span className="px-2 py-0.5 rounded-full bg-saffron-500/90 text-espresso-950 text-[10px] font-bold shadow-xs backdrop-blur-xs">
                                {t("low_stock")} ({item.stock_qty})
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Content Details */}
                <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-base font-bold text-espresso-950 leading-snug line-clamp-1">
                            {displayName}
                        </h4>
                        <span className="text-base font-extrabold text-terracotta-600 shrink-0">
                            {formatRupees(item.price_paise)}
                        </span>
                    </div>

                    {displayDesc && (
                        <p className="text-xs text-espresso-600 line-clamp-2 leading-relaxed mb-3">
                            {displayDesc}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-cream-100 mt-auto">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-espresso-500">
                    <span className={`w-2 h-2 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span>{item.is_veg ? "100% Veg" : "Non-Veg"}</span>
                </div>

                {isOutOfStock ? (
                    <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-cream-200 text-espresso-400 text-xs font-bold cursor-not-allowed"
                    >
                        {t("out_of_stock")}
                    </button>
                ) : cartQty > 0 ? (
                    <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-terracotta-50 border border-terracotta-200 shadow-2xs">
                        <button
                            onClick={onRemove}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-terracotta-100 text-terracotta-600 flex items-center justify-center font-bold text-sm shadow-xs transition active:scale-95 cursor-pointer"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-extrabold text-espresso-900">
                            {cartQty}
                        </span>
                        <button
                            onClick={onAdd}
                            className="w-7 h-7 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white flex items-center justify-center font-bold text-sm shadow-xs transition active:scale-95 cursor-pointer"
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onAdd}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold shadow-sm shadow-terracotta-500/20 active:scale-95 transition cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("add_to_cart")}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
