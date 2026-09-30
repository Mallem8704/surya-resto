"use client";

import React, { useState } from "react";
import {
    Printer,
    Check,
    Copy,
    ExternalLink,
    HelpCircle,
    X,
    Laptop,
    Settings2,
    CheckCircle2,
    Zap,
} from "lucide-react";
import {
    KIOSK_PRINTING_GUIDE,
    ThermalPaperWidth,
    getThermalPaperSize,
    setThermalPaperSize,
    printTestReceipt,
    PrintOutletData,
} from "@/lib/thermalPrint";

interface POSKioskPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    outlet?: PrintOutletData | null;
    activePaperWidth: ThermalPaperWidth;
    onPaperWidthChange: (size: ThermalPaperWidth) => void;
}

export function POSKioskPrintModal({
    isOpen,
    onClose,
    outlet,
    activePaperWidth,
    onPaperWidthChange,
}: POSKioskPrintModalProps) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#171310] border border-[#D4AF37]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-[#201A14] to-[#171310] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span>Kiosk Silent Printing & Hardware</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    --kiosk-printing
                                </span>
                            </h2>
                            <p className="text-xs text-white/60">
                                Zero-click thermal printing configuration for Windows POS PCs
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 text-sm">
                    {/* Paper Size Configuration Selector */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <span>Thermal Roll Width</span>
                                <span className="text-xs font-normal text-white/60">
                                    (Active: {activePaperWidth})
                                </span>
                            </h3>
                            <p className="text-xs text-white/50 mt-0.5">
                                Select roll width for auto-formatting customer bills and kitchen tickets.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onPaperWidthChange("80mm");
                                    setThermalPaperSize("80mm");
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                    activePaperWidth === "80mm"
                                        ? "bg-[#D4AF37] text-black shadow-lg"
                                        : "bg-black/40 text-white/70 hover:text-white border border-white/10"
                                }`}
                            >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${activePaperWidth === "80mm" ? "opacity-100" : "opacity-0"}`} />
                                <span>80mm (Standard 3")</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onPaperWidthChange("58mm");
                                    setThermalPaperSize("58mm");
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                    activePaperWidth === "58mm"
                                        ? "bg-[#D4AF37] text-black shadow-lg"
                                        : "bg-black/40 text-white/70 hover:text-white border border-white/10"
                                }`}
                            >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${activePaperWidth === "58mm" ? "opacity-100" : "opacity-0"}`} />
                                <span>58mm (Eco Paper-Saver)</span>
                            </button>
                        </div>
                    </div>

                    {/* Step-by-Step Kiosk Printing Setup */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                            <Zap className="w-4 h-4" />
                            <span>4-Step Zero-Click Windows Setup</span>
                        </div>

                        {/* Step 1 */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                            <div className="flex items-center gap-2 font-bold text-white text-xs">
                                <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-[11px] font-black">
                                    1
                                </span>
                                <span>Set Windows Default Printer & Margins</span>
                            </div>
                            <p className="text-xs text-white/60 mt-1 pl-7">
                                Go to Windows Settings → <strong>Printers & scanners</strong> → Select your Thermal Receipt Printer (TVS RP3160, Epson TM-T82, Xprinter) → Click <strong>Set as default</strong>. In Printing Preferences, set paper size to <strong>{activePaperWidth}</strong> with <strong>0mm margins</strong>.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-white text-xs">
                                    <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-[11px] font-black">
                                        2
                                    </span>
                                    <span>Create Desktop Shortcut (Google Chrome / MS Edge)</span>
                                </div>
                            </div>
                            <p className="text-xs text-white/60 pl-7">
                                Right-click Windows Desktop → New → Shortcut. Paste the target command below:
                            </p>

                            {/* Command 1: Chrome */}
                            <div className="pl-7 space-y-2">
                                <div className="flex items-center justify-between bg-black/80 rounded-lg p-2.5 border border-white/10 font-mono text-[11px] text-amber-200">
                                    <span className="truncate mr-2">{KIOSK_PRINTING_GUIDE.chromeCommand}</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(KIOSK_PRINTING_GUIDE.chromeCommand, 1)}
                                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-sans font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                                    >
                                        {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedIndex === 1 ? "Copied" : "Copy Chrome"}</span>
                                    </button>
                                </div>

                                {/* Command 2: Edge */}
                                <div className="flex items-center justify-between bg-black/80 rounded-lg p-2.5 border border-white/10 font-mono text-[11px] text-amber-200">
                                    <span className="truncate mr-2">{KIOSK_PRINTING_GUIDE.edgeCommand}</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(KIOSK_PRINTING_GUIDE.edgeCommand, 2)}
                                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-sans font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                                    >
                                        {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedIndex === 2 ? "Copied" : "Copy Edge"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                            <div className="flex items-center gap-2 font-bold text-white text-xs">
                                <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-[11px] font-black">
                                    3
                                </span>
                                <span>One-Time Chrome Print Preview Settings</span>
                            </div>
                            <p className="text-xs text-white/60 mt-1 pl-7">
                                Press <strong>Ctrl + P</strong> once: Set destination to your thermal printer, Margins to <strong>None</strong>, <strong>UNCHECK Headers and Footers</strong> (removes unwanted URL/date headers), and CHECK <strong>Background graphics</strong>. Chrome permanently remembers this!
                            </p>
                        </div>

                        {/* Step 4 */}
                        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                            <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Instant Zero-Click Printing Verified</span>
                            </div>
                            <p className="text-xs text-emerald-200/80 mt-1 pl-6">
                                Launch POS from your new shortcut. Clicking "Print Bill" or pressing F9/F12 will now shoot the receipt straight to the thermal cutter with 0 popups!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer with Test Buttons */}
                <div className="px-6 py-4 bg-[#14100D] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => printTestReceipt(outlet, "80mm")}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Test 80mm Sample</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => printTestReceipt(outlet, "58mm")}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Test 58mm Sample</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-xs hover:bg-[#e2bd47] transition cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
