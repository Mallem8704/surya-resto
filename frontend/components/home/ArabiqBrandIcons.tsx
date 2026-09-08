"use client";

import React from "react";

export function ArabiqLogo({ className = "h-11 w-auto" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            <div className="relative rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-amber-500 via-orange-400 to-amber-600 shadow-lg shadow-amber-500/25 shrink-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center rounded-[14px] text-white font-black text-xl shadow-inner">
                    ☀️
                </div>
            </div>
            <div className="flex flex-col">
                <p className="text-sm sm:text-base font-serif font-black bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent uppercase tracking-[0.15em] leading-none">
                    Surya
                </p>
                <p className="text-[9px] sm:text-[10px] text-amber-200/90 font-sans font-bold tracking-widest uppercase mt-1">
                    Family Restaurant &bull; Kadiri
                </p>
            </div>
        </div>
    );
}

/**
 * Traditional Golden Divider
 */
export function ArabesqueDivider({ className = "my-4", light = false }: { className?: string; light?: boolean }) {
    const goldColor = light ? "#B38020" : "#F59E0B";
    const lineColor = light ? "#E8D8C0" : "rgba(245, 158, 11, 0.3)";

    return (
        <div className={`flex items-center justify-center gap-3 ${className}`}>
            <div className="h-[1px] w-12 sm:w-20" style={{ backgroundColor: lineColor }} />
            <div className="flex items-center gap-1.5 text-xs select-none" style={{ color: goldColor }}>
                <span>❖</span>
                <span className="text-base">✦</span>
                <span>❖</span>
            </div>
            <div className="h-[1px] w-12 sm:w-20" style={{ backgroundColor: lineColor }} />
        </div>
    );
}

/**
 * "Free HOME DELIVERY" Stamp Emblem Badge
 */
export function FreeDeliveryEmblem({ className = "" }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            <div className="relative w-28 h-32 rounded-3xl bg-gradient-to-b from-[#1E1712] via-[#140F0B] to-[#0A0705] border-2 border-amber-500 shadow-2xl p-2 flex flex-col items-center justify-center text-center">
                <div className="absolute inset-1.5 rounded-2xl border border-amber-400/40 pointer-events-none" />
                <span className="text-[13px] font-serif italic font-bold text-amber-400 leading-none mb-0.5">
                    Fast
                </span>
                <span className="text-[11px] font-sans font-black tracking-widest text-white uppercase leading-tight">
                    KADIRI
                </span>
                <span className="text-[9px] font-sans font-extrabold tracking-widest text-amber-400 uppercase leading-tight">
                    DELIVERY
                </span>

                <div className="mt-2 text-amber-400">
                    <svg className="w-5 h-5 mx-auto fill-current" viewBox="0 0 24 24">
                        <path d="M19 7h-3V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h.5A3.5 3.5 0 0 0 9 21.5a3.5 3.5 0 0 0 3.46-3h2.08a3.5 3.5 0 0 0 6.92-.5H22v-6l-3-5zm-5 9H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v10zm-5 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1-5h-.54a3.5 3.5 0 0 0-3.46-3H15V9h2.34L19 11.66V15z"/>
                    </svg>
                </div>
            </div>
        </div>
    );
}
