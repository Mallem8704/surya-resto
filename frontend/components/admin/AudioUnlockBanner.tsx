"use client";

import React, { useState, useEffect } from "react";
import { soundManager, SoundMode, VoiceLanguage } from "@/lib/sound";
import { Volume2, VolumeX, CheckCircle2, BellRing, X, Languages, Sparkles, Play } from "lucide-react";

interface AudioUnlockBannerProps {
    variant?: "banner" | "pill" | "compact";
    className?: string;
    onUnlock?: () => void;
}

/**
 * Audio Autoplay Unlock Indicator & Soundbox Control for Kitchen Tablets, KDS & Cashier POS.
 * Browsers block Web Audio API and SpeechSynthesis until first touch/click.
 * Provides live soundbox toggles (Voice + Chime vs Chime only), English/Telugu language selection,
 * and quick test actions for Table Orders and UPI Payment confirmations.
 */
export function AudioUnlockBanner({
    variant = "banner",
    className = "",
    onUnlock,
}: AudioUnlockBannerProps) {
    const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
    const [justActivated, setJustActivated] = useState<boolean>(false);
    const [isDismissed, setIsDismissed] = useState<boolean>(false);
    const [soundMode, setSoundMode] = useState<SoundMode>("voice_and_chime");
    const [voiceLang, setVoiceLang] = useState<"en" | "te">("en");
    const [showControls, setShowControls] = useState<boolean>(false);

    useEffect(() => {
        soundManager.init();
        setIsUnlocked(soundManager.isUnlocked());
        setSoundMode(soundManager.getSoundMode());
        setVoiceLang(soundManager.getVoiceLanguage());

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
            setIsUnlocked(true);
            setJustActivated(true);
            soundManager.playNewOrderChime();
            setTimeout(() => {
                soundManager.testVoice("table", voiceLang);
            }, 400);

            if (onUnlock) onUnlock();

            setTimeout(() => {
                setJustActivated(false);
            }, 5000);
        } catch (e) {
            console.warn("Error unlocking audio:", e);
        }
    };

    const handleModeChange = (mode: SoundMode) => {
        setSoundMode(mode);
        soundManager.setSoundMode(mode);
        if (mode === "mute") {
            // mute
        } else {
            soundManager.playAddToCartPop();
        }
    };

    const handleLangChange = (lang: "en" | "te") => {
        setVoiceLang(lang);
        soundManager.setVoiceLanguage(lang);
        soundManager.testVoice("table", lang);
    };

    const handleTestTableOrder = () => {
        soundManager.playOrderVoiceAlert({
            order_number: "101",
            table_label: "T3",
            order_type: "dine_in",
            total_paise: 45000,
        }, voiceLang as any);
    };

    const handleTestDeliveryOrder = () => {
        soundManager.playOrderVoiceAlert({
            order_number: "102",
            order_type: "delivery",
            total_paise: 65000,
        }, voiceLang as any);
    };

    const handleTestPayment = () => {
        soundManager.playPaymentSoundbox(450, "UPI", "T3");
    };

    // Compact mode (toolbars, subheaders)
    if (variant === "compact") {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <button
                    type="button"
                    onClick={isUnlocked ? () => setShowControls(!showControls) : handleUnlock}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isUnlocked
                            ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                            : "bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                    }`}
                    title={isUnlocked ? "Voice Soundbox Active - Click to configure" : "Tap to enable Voice Soundbox"}
                >
                    {isUnlocked ? (
                        <>
                            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Voice Alert Active ({voiceLang === "te" ? "తెలుగు" : "ENG"})</span>
                        </>
                    ) : (
                        <>
                            <BellRing className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                            <span>Tap to Enable Voice Soundbox</span>
                        </>
                    )}
                </button>
            </div>
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
                        <span>Tap to enable Voice Soundbox</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Soundbox Active ({voiceLang === "te" ? "తెలుగు" : "EN"})</span>
                        <button
                            type="button"
                            onClick={handleTestTableOrder}
                            className="ml-1 text-[11px] underline text-emerald-400 hover:text-emerald-200 cursor-pointer"
                        >
                            Test Order
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Default Full-width Top Banner
    if (isUnlocked && isDismissed && !justActivated) {
        return null;
    }

    return (
        <div
            className={`w-full transition-all duration-300 ${
                !isUnlocked
                    ? "bg-gradient-to-r from-amber-600 via-saffron-500 to-amber-600 text-espresso-950 shadow-lg border-b-2 border-amber-300"
                    : "bg-emerald-950/95 border-b border-emerald-500/40 text-emerald-200"
            } px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm shrink-0 z-40 select-none ${className}`}
        >
            <div
                onClick={!isUnlocked ? handleUnlock : undefined}
                className={`flex items-center gap-2.5 flex-1 min-w-[240px] ${!isUnlocked ? "cursor-pointer" : ""}`}
            >
                {!isUnlocked ? (
                    <>
                        <div className="w-7 h-7 rounded-full bg-espresso-950 text-saffron-400 flex items-center justify-center shrink-0 shadow animate-bounce">
                            <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-black text-espresso-950 text-xs sm:text-sm tracking-tight block">
                                Tap to enable Restaurant Voice Soundbox
                            </span>
                            <span className="text-[11px] font-semibold text-espresso-900/90">
                                Kitchen, Delivery & Table orders will announce in loud spoken voice
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-bold text-white text-xs sm:text-sm">
                                Voice Soundbox Active
                            </span>
                            <span className="text-[11px] text-emerald-300/80">
                                • Spoken voice alerts enabled for Table, Delivery, KOT & UPI payments
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {!isUnlocked ? (
                    <button
                        type="button"
                        onClick={handleUnlock}
                        className="px-3.5 py-1.5 rounded-full bg-espresso-950 text-saffron-300 hover:text-white hover:bg-espresso-900 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                        Enable Audio Now
                    </button>
                ) : (
                    <>
                        {/* Sound Mode Toggle */}
                        <div className="flex items-center bg-emerald-900/60 rounded-lg p-0.5 border border-emerald-500/30 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleModeChange("voice_and_chime")}
                                className={`px-2 py-0.5 rounded transition ${
                                    soundMode === "voice_and_chime"
                                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                                        : "text-emerald-300 hover:text-white"
                                }`}
                                title="Spoken Voice announcement + Bell Chime"
                            >
                                Voice + Bell
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeChange("chime_only")}
                                className={`px-2 py-0.5 rounded transition ${
                                    soundMode === "chime_only"
                                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                                        : "text-emerald-300 hover:text-white"
                                }`}
                                title="Bell Chime only (no spoken voice)"
                            >
                                Bell Only
                            </button>
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center bg-emerald-900/60 rounded-lg p-0.5 border border-emerald-500/30 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleLangChange("en")}
                                className={`px-2 py-0.5 rounded transition ${
                                    voiceLang === "en"
                                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                                        : "text-emerald-300 hover:text-white"
                                }`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLangChange("te")}
                                className={`px-2 py-0.5 rounded transition ${
                                    voiceLang === "te"
                                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                                        : "text-emerald-300 hover:text-white"
                                }`}
                            >
                                తెలుగు
                            </button>
                        </div>

                        {/* Quick Test Table Order Voice */}
                        <button
                            type="button"
                            onClick={handleTestTableOrder}
                            className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold border border-emerald-500/40 transition cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Test Table Order voice announcement"
                        >
                            <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>Test Table</span>
                        </button>

                        {/* Quick Test UPI Payment Soundbox */}
                        <button
                            type="button"
                            onClick={handleTestPayment}
                            className="px-2 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer hidden md:flex items-center gap-1"
                            title="Test UPI payment soundbox chime & voice"
                        >
                            <span>Test UPI</span>
                        </button>

                        {/* Dismiss */}
                        <button
                            type="button"
                            onClick={() => setIsDismissed(true)}
                            className="text-xs text-emerald-400/70 hover:text-emerald-200 p-1 rounded hover:bg-emerald-900/50 transition cursor-pointer flex items-center justify-center"
                            title="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
