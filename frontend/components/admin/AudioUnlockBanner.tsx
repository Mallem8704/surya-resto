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
 * Clean, eye-comfortable light theme with Royal Blue accents.
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
        } catch (err) {
            console.error("Audio unlock failed", err);
        }
    };

    const handleModeChange = (mode: SoundMode) => {
        setSoundMode(mode);
        soundManager.setSoundMode(mode);
    };

    const handleLangChange = (lang: "en" | "te") => {
        setVoiceLang(lang);
        soundManager.setVoiceLanguage(lang);
    };

    const handleTestTableOrder = () => {
        soundManager.testVoice("table", voiceLang);
    };

    const handleTestPayment = () => {
        soundManager.testVoice("payment", voiceLang);
    };

    // Compact Button variant
    if (variant === "compact") {
        return (
            <div className={`inline-flex items-center gap-1.5 ${className}`}>
                <button
                    type="button"
                    onClick={!isUnlocked ? handleUnlock : () => setShowControls(!showControls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                        isUnlocked
                            ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                            : "bg-amber-500 border-amber-600 text-slate-950 animate-pulse hover:bg-amber-400"
                    }`}
                >
                    {isUnlocked ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Voice Alert Active ({voiceLang === "te" ? "తెలుగు" : "ENG"})</span>
                        </>
                    ) : (
                        <>
                            <BellRing className="w-3.5 h-3.5 text-slate-950 animate-bounce shrink-0" />
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
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-xl hover:bg-blue-700 animate-pulse transition-all cursor-pointer"
                    >
                        <BellRing className="w-4 h-4 animate-bounce shrink-0" />
                        <span>Tap to enable Voice Soundbox</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-blue-200 text-blue-900 text-xs font-bold shadow-md">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Soundbox Active ({voiceLang === "te" ? "తెలుగు" : "EN"})</span>
                        <button
                            type="button"
                            onClick={handleTestTableOrder}
                            className="ml-1 text-[11px] underline text-blue-600 hover:text-blue-800 cursor-pointer"
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
                    ? "bg-amber-50 border-b border-amber-200 text-amber-950"
                    : "bg-blue-50/90 border-b border-blue-200 text-blue-950"
            } px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm shrink-0 z-40 select-none ${className}`}
        >
            <div
                onClick={!isUnlocked ? handleUnlock : undefined}
                className={`flex items-center gap-2.5 flex-1 min-w-[240px] ${!isUnlocked ? "cursor-pointer" : ""}`}
            >
                {!isUnlocked ? (
                    <>
                        <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs animate-bounce">
                            <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-bold text-amber-950 text-xs sm:text-sm tracking-tight block">
                                Tap to enable Restaurant Voice Soundbox
                            </span>
                            <span className="text-[11px] font-medium text-amber-800">
                                Kitchen, Delivery & Table orders will announce in loud spoken voice
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                Voice Soundbox Active
                            </span>
                            <span className="text-[11px] text-slate-600">
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
                        className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        Enable Audio Now
                    </button>
                ) : (
                    <>
                        {/* Sound Mode Toggle */}
                        <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px] font-semibold shadow-2xs">
                            <button
                                type="button"
                                onClick={() => handleModeChange("voice_and_chime")}
                                className={`px-2 py-0.5 rounded transition ${
                                    soundMode === "voice_and_chime"
                                        ? "bg-blue-600 text-white font-bold shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
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
                                        ? "bg-blue-600 text-white font-bold shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                                title="Bell Chime only (no spoken voice)"
                            >
                                Bell Only
                            </button>
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px] font-semibold shadow-2xs">
                            <button
                                type="button"
                                onClick={() => handleLangChange("en")}
                                className={`px-2 py-0.5 rounded transition ${
                                    voiceLang === "en"
                                        ? "bg-blue-600 text-white font-bold shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLangChange("te")}
                                className={`px-2 py-0.5 rounded transition ${
                                    voiceLang === "te"
                                        ? "bg-blue-600 text-white font-bold shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                తెలుగు
                            </button>
                        </div>

                        {/* Quick Test Table Order Voice */}
                        <button
                            type="button"
                            onClick={handleTestTableOrder}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Test Table Order voice announcement"
                        >
                            <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
                            <span>Test Table</span>
                        </button>

                        {/* Quick Test UPI Payment Soundbox */}
                        <button
                            type="button"
                            onClick={handleTestPayment}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer hidden md:flex items-center gap-1 shadow-2xs"
                            title="Test UPI payment soundbox chime & voice"
                        >
                            <span>Test UPI</span>
                        </button>

                        {/* Dismiss */}
                        <button
                            type="button"
                            onClick={() => setIsDismissed(true)}
                            className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
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
