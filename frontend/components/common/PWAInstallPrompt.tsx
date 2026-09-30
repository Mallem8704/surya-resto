"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Sparkles, Bell, WifiOff, Share, PlusSquare, Smartphone, Check } from "lucide-react";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // 1. Detect if already installed/running in standalone display mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      setHasChecked(true);
      return;
    }

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 3. Listen for Android/Desktop Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Auto-open modal once after a short polite delay of 1.8 seconds
    const timer = setTimeout(() => {
      // Check if user previously closed it in this session; if not, open
      const dismissedThisSession = sessionStorage.getItem("surya_pwa_prompt_dismissed");
      if (!dismissedThisSession) {
        setIsOpen(true);
      }
      setHasChecked(true);
    }, 1800);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsOpen(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("PWA install error:", err);
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      // Browser fallback (Firefox or custom in-app webviews)
      alert("To install Surya Restaurant App: Tap your browser's menu (⋮ or share) and choose 'Add to Home Screen' or 'Install App'.");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("surya_pwa_prompt_dismissed", "true");
  };

  // If already running standalone, no need to show install widget
  if (isStandalone || !hasChecked) {
    return null;
  }

  return (
    <>
      {/* ── Persistent Floating Pill (always visible when main popup is closed) ── */}
      {!isOpen && (
        <aside
          role="region"
          aria-label="Web App Installation"
          className="fixed bottom-20 left-3 sm:bottom-6 sm:left-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full bg-gradient-to-r from-espresso-950 via-espresso-900 to-terracotta-900 text-white border border-amber-400/40 shadow-xl shadow-espresso-950/30 hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer group"
            title="Install Surya Restaurant App"
          >
            <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shrink-0">
              <Download className="w-3 h-3 text-amber-400 group-hover:animate-bounce" />
            </div>
            <span className="text-[11px] sm:text-xs">Install Surya App</span>
            <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full">
              Fast
            </span>
          </button>
        </aside>
      )}

      {/* ── High-Converting Install Modal ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-espresso-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-cream-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Sunburst Banner */}
            <div className="relative bg-gradient-to-br from-terracotta-700 via-amber-600 to-espresso-950 p-5 text-white">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/90 hover:text-white transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5">
                <div className="p-1 rounded-2xl bg-white/20 backdrop-blur-xs shadow-md border border-white/30 shrink-0">
                  <SuryaSunLogo size={42} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 bg-white/10 px-2 py-0.5 rounded-full">
                      Official Web App
                    </span>
                  </div>
                  <h3 id="pwa-install-title" className="text-base sm:text-lg font-serif font-black text-white mt-1 leading-tight">
                    Surya Restaurant Kadiri
                  </h3>
                  <p className="text-[11px] text-cream-100/90 font-medium">
                    Fast food ordering right on your home screen
                  </p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="p-5 space-y-3.5 bg-cream-50/40">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-espresso-900">1-Tap Quick Dining</h4>
                  <p className="text-[11px] text-espresso-600 leading-snug">
                    Launch in 0.5s without typing website URLs or scanning QR codes each time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-espresso-900">Live Kitchen & Delivery Tracking</h4>
                  <p className="text-[11px] text-espresso-600 leading-snug">
                    Follow your Biryani & Starters live from Kadiri kitchen to your table or doorstep.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center shrink-0 mt-0.5">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-espresso-900">Works in Poor Signal</h4>
                  <p className="text-[11px] text-espresso-600 leading-snug">
                    Instant offline caching ensures menu loads smoothly even around Kadiri Bypass.
                  </p>
                </div>
              </div>

              {/* iOS Safari Instructions */}
              {showIOSInstructions && (
                <div className="bg-amber-100/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2 text-xs text-amber-950 animate-in fade-in">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    How to install on iPhone & iPad:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900/90 pl-1 font-medium">
                    <li>
                      Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-terracotta-600" /> <strong>Share</strong> button in your Safari bottom bar.
                    </li>
                    <li>
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-terracotta-600" /> <strong>Add to Home Screen</strong>.
                    </li>
                    <li>Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-5 border-t border-cream-200 bg-white flex flex-col gap-2">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-terracotta-600 via-amber-600 to-espresso-950 hover:from-terracotta-700 hover:to-espresso-900 text-white font-bold text-xs shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isIOS ? "Show Installation Steps" : "Install Surya App Now"}</span>
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2 text-xs font-bold text-espresso-500 hover:text-espresso-800 transition text-center cursor-pointer"
              >
                Continue in Browser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
