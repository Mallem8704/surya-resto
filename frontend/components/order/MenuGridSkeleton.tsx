"use client";

import React from "react";

export function MenuGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="space-y-6 animate-pulse">
            <style jsx>{`
                @keyframes shimmerSweep {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .skeleton-shimmer {
                    background: linear-gradient(90deg, rgba(245, 237, 227, 0.4) 25%, rgba(245, 237, 227, 0.9) 50%, rgba(245, 237, 227, 0.4) 75%);
                    background-size: 200% 100%;
                    animation: shimmerSweep 1.8s infinite linear;
                }
            `}</style>

            {/* Category Filter Pills Shimmer */}
            <div className="flex gap-2.5 overflow-hidden py-2">
                {[80, 110, 95, 120, 100, 105, 90].map((width, idx) => (
                    <div
                        key={idx}
                        className="h-10 rounded-2xl skeleton-shimmer shrink-0 border border-cream-200/50"
                        style={{ width: `${width}px` }}
                    />
                ))}
            </div>

            {/* Food Grid Cards Shimmer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: count }).map((_, idx) => (
                    <div
                        key={idx}
                        className="rounded-3xl bg-white border border-cream-200/80 p-4 shadow-sm flex flex-col justify-between space-y-4 overflow-hidden"
                    >
                        {/* Food Image Placeholder */}
                        <div className="relative h-44 w-full rounded-2xl skeleton-shimmer overflow-hidden">
                            <div className="absolute top-3 left-3 w-16 h-5 rounded-md bg-white/60" />
                            <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/60" />
                        </div>

                        {/* Title & Description Shimmer */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="h-5 w-3/5 rounded-lg skeleton-shimmer" />
                                <div className="h-5 w-16 rounded-lg skeleton-shimmer" />
                            </div>
                            <div className="h-3.5 w-4/5 rounded skeleton-shimmer opacity-70" />
                            <div className="h-3.5 w-2/3 rounded skeleton-shimmer opacity-60" />
                        </div>

                        {/* Bottom Action Bar Shimmer */}
                        <div className="flex items-center justify-between pt-3 border-t border-cream-100">
                            <div className="h-4 w-12 rounded skeleton-shimmer" />
                            <div className="h-9 w-24 rounded-xl skeleton-shimmer" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
