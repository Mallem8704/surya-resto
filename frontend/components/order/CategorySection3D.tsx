"use client";

import React from "react";
import {
    Coffee,
    Utensils,
    Sparkles,
    Soup,
    Salad,
    Flame,
    CircleDot,
    Crown,
    Wine,
    UtensilsCrossed,
} from "lucide-react";
import { MenuItemCard3D } from "./MenuItemCard3D";
import { useLanguage } from "@/context/LanguageContext";
import type { MenuItemData } from "@/components/order/MenuItemCard";

/* ─────────── Category Theme Config ─────────── */

interface CategoryTheme {
    color: string;
    gradient: string;
    glowColor: string;
    icon: React.ReactNode;
    bgPattern: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
    // 1: Biryani & Pulao Specials
    "1": {
        color: "saffron",
        gradient: "from-amber-500 via-orange-500 to-amber-600",
        glowColor: "bg-amber-400/25",
        icon: <Flame className="w-6 h-6" />,
        bgPattern: "from-amber-50 to-orange-50",
    },
    // 2: Punjabi & North Indian Curries
    "2": {
        color: "terracotta",
        gradient: "from-amber-600 via-terracotta-500 to-orange-700",
        glowColor: "bg-terracotta-400/25",
        icon: <UtensilsCrossed className="w-6 h-6" />,
        bgPattern: "from-terracotta-50 to-cream-50",
    },
    // 3: Tandoori & Kebabs
    "3": {
        color: "red",
        gradient: "from-orange-500 via-red-500 to-red-600",
        glowColor: "bg-red-400/25",
        icon: <Flame className="w-6 h-6" />,
        bgPattern: "from-red-50 to-orange-50",
    },
    // 4: Non-Veg Starters & Andhra Specials
    "4": {
        color: "red",
        gradient: "from-red-500 via-rose-600 to-amber-700",
        glowColor: "bg-red-400/25",
        icon: <Flame className="w-6 h-6" />,
        bgPattern: "from-rose-50 to-red-50",
    },
    // 5: Veg Starters & Crispies
    "5": {
        color: "emerald",
        gradient: "from-emerald-400 via-emerald-500 to-green-600",
        glowColor: "bg-emerald-400/25",
        icon: <Salad className="w-6 h-6" />,
        bgPattern: "from-emerald-50 to-green-50",
    },
    // 6: Indian Breads & Naans
    "6": {
        color: "amber",
        gradient: "from-amber-400 via-yellow-500 to-amber-600",
        glowColor: "bg-amber-400/25",
        icon: <CircleDot className="w-6 h-6" />,
        bgPattern: "from-cream-100 to-amber-50",
    },
    // 7: Arabic Mandi Specials
    "7": {
        color: "amber",
        gradient: "from-amber-500 via-yellow-500 to-amber-700",
        glowColor: "bg-amber-400/30",
        icon: <Crown className="w-6 h-6" />,
        bgPattern: "from-amber-50 to-saffron-50",
    },
    // 8: Chinese Rice & Noodles
    "8": {
        color: "orange",
        gradient: "from-orange-400 via-amber-500 to-red-500",
        glowColor: "bg-orange-400/25",
        icon: <Soup className="w-6 h-6" />,
        bgPattern: "from-orange-50 to-amber-50",
    },
    // 9: Desserts & Sweets
    "9": {
        color: "purple",
        gradient: "from-pink-400 via-rose-500 to-purple-600",
        glowColor: "bg-pink-400/25",
        icon: <Sparkles className="w-6 h-6" />,
        bgPattern: "from-pink-50 to-purple-50",
    },
    // 10: Beverages & Lassi
    "10": {
        color: "cyan",
        gradient: "from-cyan-400 via-teal-500 to-blue-600",
        glowColor: "bg-cyan-400/25",
        icon: <Coffee className="w-6 h-6" />,
        bgPattern: "from-cyan-50 to-teal-50",
    },
};

const DEFAULT_THEME: CategoryTheme = {
    color: "terracotta",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    glowColor: "bg-amber-400/20",
    icon: <Utensils className="w-6 h-6" />,
    bgPattern: "from-cream-100 to-cream-50",
};

/* ─────────── Focus Categories for 3D ─────────── */

export const FOCUS_CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/* ─────────── Component ─────────── */

interface CategorySection3DProps {
    categoryId: number;
    categoryName: string;
    categoryNameTe?: string;
    items: MenuItemData[];
    cart: { id: number; qty: number }[];
    onAdd: (item: MenuItemData) => void;
    onRemove: (itemId: number) => void;
    sectionIndex?: number;
}

export function CategorySection3D({
    categoryId,
    categoryName,
    categoryNameTe,
    items,
    cart,
    onAdd,
    onRemove,
    sectionIndex = 0,
}: CategorySection3DProps) {
    const { language } = useLanguage();
    const theme = CATEGORY_THEMES[String(categoryId)] || DEFAULT_THEME;
    const displayName = language === "te" && categoryNameTe ? categoryNameTe : categoryName;
    const isFocusCategory = FOCUS_CATEGORY_IDS.includes(categoryId);

    if (items.length === 0) return null;

    return (
        <section id={`category-${categoryId}`} className="mb-10 sm:mb-12 scroll-mt-28">
            {/* Category Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    {/* Icon with glow */}
                    <div className="relative">
                        <div
                            className={`absolute inset-0 rounded-2xl ${theme.glowColor} blur-lg animate-pulse`}
                        />
                        <div
                            className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-lg`}
                        >
                            {theme.icon}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-espresso-950 leading-tight tracking-tight">
                            {displayName}
                        </h2>
                        <p className="text-xs text-espresso-400 font-semibold mt-0.5">
                            {items.length} {items.length === 1 ? "dish" : "dishes available"}
                        </p>
                    </div>
                </div>

                {/* Decorative gold line */}
                <div className="mt-3.5 flex items-center gap-2">
                    <div className={`h-[3px] w-20 rounded-full bg-gradient-to-r ${theme.gradient}`} />
                    <div className="h-[2px] flex-1 rounded-full bg-cream-200" />
                </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item, idx) => {
                    const cartItem = cart.find((i) => i.id === item.id);
                    return (
                        <MenuItemCard3D
                            key={item.id}
                            item={item}
                            cartQty={cartItem?.qty || 0}
                            onAdd={() => onAdd(item)}
                            onRemove={() => onRemove(item.id)}
                            staggerIndex={idx}
                            themeColor={isFocusCategory ? theme.color : "terracotta"}
                        />
                    );
                })}
            </div>
        </section>
    );
}
