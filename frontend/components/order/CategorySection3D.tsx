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
    // Tiffin & Breakfast
    "1": {
        color: "amber",
        gradient: "from-amber-400 via-amber-500 to-amber-600",
        glowColor: "bg-amber-400/20",
        icon: <Coffee className="w-6 h-6" />,
        bgPattern: "from-amber-50 to-saffron-50",
    },
    // Dosa & Uttapam
    "2": {
        color: "terracotta",
        gradient: "from-terracotta-400 via-terracotta-500 to-terracotta-600",
        glowColor: "bg-terracotta-400/20",
        icon: <Utensils className="w-6 h-6" />,
        bgPattern: "from-terracotta-50 to-cream-50",
    },
    // Snacks & Sweets
    "3": {
        color: "saffron",
        gradient: "from-saffron-400 via-saffron-500 to-saffron-600",
        glowColor: "bg-saffron-400/20",
        icon: <Sparkles className="w-6 h-6" />,
        bgPattern: "from-saffron-50 to-amber-50",
    },
    // Soups & Salads
    "4": {
        color: "cyan",
        gradient: "from-cyan-400 via-cyan-500 to-cyan-600",
        glowColor: "bg-cyan-400/20",
        icon: <Soup className="w-6 h-6" />,
        bgPattern: "from-cyan-50 to-blue-50",
    },
    // Veg Starters
    "5": {
        color: "emerald",
        gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
        glowColor: "bg-emerald-400/20",
        icon: <Salad className="w-6 h-6" />,
        bgPattern: "from-emerald-50 to-green-50",
    },
    // Non-Veg Starters
    "6": {
        color: "red",
        gradient: "from-red-400 via-red-500 to-red-600",
        glowColor: "bg-red-400/20",
        icon: <Flame className="w-6 h-6" />,
        bgPattern: "from-red-50 to-orange-50",
    },
    // Indian Breads
    "7": {
        color: "terracotta",
        gradient: "from-terracotta-400 via-chai-500 to-chai-600",
        glowColor: "bg-terracotta-400/20",
        icon: <CircleDot className="w-6 h-6" />,
        bgPattern: "from-cream-100 to-cream-50",
    },
    // Biryani & Pulavs
    "8": {
        color: "saffron",
        gradient: "from-saffron-400 via-saffron-500 to-amber-600",
        glowColor: "bg-saffron-400/20",
        icon: <Flame className="w-6 h-6" />,
        bgPattern: "from-saffron-50 to-amber-50",
    },
    // Curries & Main Course
    "9": {
        color: "terracotta",
        gradient: "from-terracotta-400 via-terracotta-500 to-terracotta-700",
        glowColor: "bg-terracotta-400/20",
        icon: <UtensilsCrossed className="w-6 h-6" />,
        bgPattern: "from-terracotta-50 to-cream-50",
    },
    // Arabian Mandi & Al-Faham
    "10": {
        color: "amber",
        gradient: "from-amber-500 via-saffron-500 to-amber-700",
        glowColor: "bg-amber-400/20",
        icon: <Crown className="w-6 h-6" />,
        bgPattern: "from-amber-50 to-saffron-50",
    },
    // Beverages & Desserts
    "11": {
        color: "purple",
        gradient: "from-purple-400 via-purple-500 to-purple-600",
        glowColor: "bg-purple-400/20",
        icon: <Wine className="w-6 h-6" />,
        bgPattern: "from-purple-50 to-pink-50",
    },
};

const DEFAULT_THEME: CategoryTheme = {
    color: "terracotta",
    gradient: "from-terracotta-400 via-terracotta-500 to-terracotta-600",
    glowColor: "bg-terracotta-400/20",
    icon: <Utensils className="w-6 h-6" />,
    bgPattern: "from-cream-100 to-cream-50",
};

/* ─────────── Focus Categories for 3D ─────────── */

export const FOCUS_CATEGORY_IDS = [1, 5, 6, 8, 9, 10, 11];

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
        <section className="mb-12">
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
