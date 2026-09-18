"use client";

import React from "react";

const SUN_RAYS = [
    { x1: "75",    y1: "50",    x2: "88",    y2: "50",    w: "3.5" }, // 0°
    { x1: "71.65", y1: "62.5",  x2: "82.91", y2: "69",    w: "2"   }, // 30°
    { x1: "62.5",  y1: "71.65", x2: "69",    y2: "82.91", w: "3.5" }, // 60°
    { x1: "50",    y1: "75",    x2: "50",    y2: "88",    w: "2"   }, // 90°
    { x1: "37.5",  y1: "71.65", x2: "31",    y2: "82.91", w: "3.5" }, // 120°
    { x1: "28.35", y1: "62.5",  x2: "17.09", y2: "69",    w: "2"   }, // 150°
    { x1: "25",    y1: "50",    x2: "12",    y2: "50",    w: "3.5" }, // 180°
    { x1: "28.35", y1: "37.5",  x2: "17.09", y2: "31",    w: "2"   }, // 210°
    { x1: "37.5",  y1: "28.35", x2: "31",    y2: "17.09", w: "3.5" }, // 240°
    { x1: "50",    y1: "25",    x2: "50",    y2: "12",    w: "2"   }, // 270°
    { x1: "62.5",  y1: "28.35", x2: "69",    y2: "17.09", w: "3.5" }, // 300°
    { x1: "71.65", y1: "37.5",  x2: "82.91", y2: "31",    w: "2"   }, // 330°
] as const;

export function SuryaSunLogo({ size = 44, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <circle cx="50" cy="50" r="22" fill="#D4AF37" />
            <circle cx="50" cy="50" r="18" fill="#E8C547" />
            <circle cx="50" cy="50" r="12" fill="#D4AF37" stroke="#C8960C" strokeWidth="1.5" />
            {SUN_RAYS.map((r, i) => (
                <line
                    key={i}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke="#D4AF37"
                    strokeWidth={r.w}
                    strokeLinecap="round"
                />
            ))}
            {/* Face */}
            <circle cx="44" cy="47" r="2.5" fill="#8B3A00" />
            <circle cx="56" cy="47" r="2.5" fill="#8B3A00" />
            <path d="M44 55 Q50 60 56 55" stroke="#8B3A00" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}
