"use client";

import React, { useState, useEffect } from "react";
import { soundManager } from "@/lib/sound";
import { Volume2, CheckCircle2, BellRing, X } from "lucide-react";

interface AudioUnlockBannerProps {
    variant?: "banner" | "pill" | "compact";
    className?: string;
    onUnlock?: () => void;
}

/**
 * Audio Autoplay Unlock Indicator / Banner for Kitchen Wall-Mounted Tablets and Cashier Terminals.
 * Browsers block Web Audio API by default until the first touch or click.
 * Displays 'Tap to enable Kitchen Order Chime' until unlocked, and marks it active once tapped.
 */
export function AudioUnlockBanner({
    variant = "banner",
    className = "",
    onUnlock,
}: AudioUnlockBannerProps) {
    const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
    const [justActivated, setJustActivated] = useState<boolean>(false);
    const [isDismissed, setIsDismissed] = useState<boolean>(false);

    useEffect(() => {
        // Initialize Web Audio context check
        soundManager.init();
        setIsUnlocked(soundManager.isUnlocked());

        const unsubscribe = soundManager.subscribe((unlocked) => {
            setIsUnlocked(unlocked);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleUnlock = async () => {
        try {
            await soundManager.unlockAudio();
            soundManager.playNewOrderChime();
            setIsUnlocked(true);
            setJustActivated(true);
            if (onUnlock) onUnlock();

            // Auto-hide the celebratory banner state after 4 seconds
            setTimeout(() => {
                setJustActivated(false);
            }, 4000);
        } catch (e) {
            console.warn("Error unlocking audio:", e);
        }
    };

    // Compact mode (ideal for toolbars and subheaders)
    if (variant === "compact") {
        return (
            <button
                type="button"
                onClick={handleUnlock}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isUnlocked
                        ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                        : "bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                } ${className}`}
                title={isUnlocked ? "Kitchen Order Chime Active - Click to test" : "Tap to enable Kitchen Order Chime"}
            >
                {isUnlocked ? (
                    <>
                        <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Kitchen Order Chime Active</span>
                    </>
                ) : (
                    <>
                        <BellRing className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                        <span>Tap to enable Kitchen Order Chime</span>
                    </>
                )}
            </button>
        );
    }

    // Floating Pill variant
    if (variant === "pill") {
        if (isUnlocked && !justActivated && isDismissed) return null;

        return (
            <div className={`fixed top-3 right-4 z-50 transition-all duration-300 ${className}`}>
                {!isUnlocked ? (
                    <button
                        type="button"
                        onClick={handleUnlock}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-saffron-500 to-amber-600 text-espresso-950 font-black text-xs sm:text-sm shadow-2xl border-2 border-amber-300/80 animate-pulse hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                        <BellRing className="w-4 h-4 animate-bounce shrink-0" />
                        <span>Tap to enable Kitchen Order Chime</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Kitchen Order Chime Active</span>
                        <button
                            type="button"
                            onClick={() => soundManager.playNewOrderChime()}
                            className="ml-1 text-[11px] underline text-emerald-400 hover:text-emerald-200 cursor-pointer"
                        >
                            Test
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Default Full-width Top Banner
    // If unlocked and not recently activated, render a sleek compact banner or dismissable active status
    if (isUnlocked && isDismissed && !justActivated) {
        return null;
    }

    return (
        <div
            className={`w-full transition-all duration-300 ${
                !isUnlocked
                    ? "bg-gradient-to-r from-amber-600 via-saffron-500 to-amber-600 text-espresso-950 shadow-lg border-b-2 border-amber-300"
                    : "bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200"
            } px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm shrink-0 z-40 select-none ${className}`}
        >
            <div
                onClick={handleUnlock}
                className="flex items-center gap-2.5 flex-1 cursor-pointer"
            >
                {!isUnlocked ? (
                    <>
                        <div className="w-7 h-7 rounded-full bg-espresso-950 text-saffron-400 flex items-center justify-center shrink-0 shadow animate-bounce">
                            <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-black text-espresso-950 text-xs sm:text-sm tracking-tight">
                                Tap to enable Kitchen Order Chime
                            </span>
                            <span className="hidden md:inline ml-2 text-xs font-medium text-espresso-900/90">
                                (Tablets block audio alerts by default until the first touch)
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                            <span className="font-bold text-white text-xs sm:text-sm">
                                Kitchen Order Chime Active
                            </span>
                            <span className="hidden sm:inline ml-2 text-xs text-emerald-300/80">
                                • Wall tablet audio engine running. Live chime verified.
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2">
                {!isUnlocked ? (
                    <button
                        type="button"
                        onClick={handleUnlock}
                        className="px-3.5 py-1 rounded-full bg-espresso-950 text-saffron-300 hover:text-white hover:bg-espresso-900 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                        Enable Audio Now
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => soundManager.playNewOrderChime()}
                            className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                            title="Play test order chime"
                        >
                            Test Chime
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDismissed(true)}
                            className="text-xs text-emerald-400/70 hover:text-emerald-200 p-1 rounded hover:bg-emerald-900/50 transition cursor-pointer flex items-center justify-center"
                            title="Dismiss notification"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
