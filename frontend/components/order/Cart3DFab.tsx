"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { useLanguage } from "@/context/LanguageContext";

interface Cart3DFabProps {
    cartCount: number;
    cartTotalPaise: number;
    onClick: () => void;
}

export function Cart3DFab({ cartCount, cartTotalPaise, onClick }: Cart3DFabProps) {
    const { t } = useLanguage();
    const [isSpinning, setIsSpinning] = useState(false);
    const [isBadgePopping, setIsBadgePopping] = useState(false);
    const prevCountRef = useRef(cartCount);

    // Trigger animations when cart count changes
    useEffect(() => {
        if (cartCount > prevCountRef.current) {
            setIsSpinning(true);
            setIsBadgePopping(true);
            setTimeout(() => setIsSpinning(false), 500);
            setTimeout(() => setIsBadgePopping(false), 300);
        }
        prevCountRef.current = cartCount;
    }, [cartCount]);

    if (cartCount === 0) return null;

    return (
        <div className="fixed bottom-5 inset-x-0 z-40 max-w-lg mx-auto px-4 animate-card-entrance">
            <button
                onClick={onClick}
                className="w-full bg-gradient-to-r from-espresso-900 via-espresso-800 to-espresso-900 text-white rounded-2xl p-4 px-5 shadow-2xl border border-espresso-700/50 flex items-center justify-between gap-3 hover:shadow-3xl transition-all duration-300 active:scale-[0.98] cursor-pointer group"
            >
                {/* Left: Icon + Count */}
                <div className="flex items-center gap-3">
                    {/* 3D Bag Icon */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center shadow-lg shadow-saffron-500/30">
                            <ShoppingBag
                                className={`w-5 h-5 text-espresso-950 ${
                                    isSpinning ? "animate-cart-spin" : ""
                                }`}
                            />
                        </div>
                        {/* Count Badge */}
                        <span
                            className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm ${
                                isBadgePopping ? "animate-badge-pop" : ""
                            }`}
                        >
                            {cartCount > 9 ? "9+" : cartCount}
                        </span>
                    </div>

                    {/* Total */}
                    <div className="text-left">
                        <span className="text-[10px] text-espresso-300 block uppercase tracking-wider font-medium">
                            {t("total")}
                        </span>
                        <span className="text-lg font-extrabold text-white leading-tight">
                            {formatRupees(cartTotalPaise)}
                        </span>
                    </div>
                </div>

                {/* Right: View Cart CTA */}
                <div className="flex items-center gap-2 bg-saffron-500 hover:bg-saffron-400 text-espresso-950 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-saffron-500/30 transition-all group-hover:gap-3">
                    <span>{t("view_cart")}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
            </button>
        </div>
    );
}
