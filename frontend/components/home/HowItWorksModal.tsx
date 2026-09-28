"use client";

import React from "react";
import { X, QrCode, UtensilsCrossed, Smartphone, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
    if (!isOpen) return null;

    const steps = [
        {
            num: "01",
            title: "Scan Table QR Code",
            desc: "Point your iPhone or Android camera at the QR stand on your dining table. Instant digital menu, zero app download required.",
            icon: <QrCode className="w-6 h-6 text-amber-400" />,
        },
        {
            num: "02",
            title: "Explore 48 Authentic Dishes",
            desc: "Browse Biryanis, Punjabi curries, Tandoori starters, naan rotis, choose portion sizes, and add spice preferences.",
            icon: <UtensilsCrossed className="w-6 h-6 text-amber-400" />,
        },
        {
            num: "03",
            title: "Place Order (Kitchen KOT)",
            desc: "Tap Place Order. It dispatches directly to the chef's Kitchen Display (KDS) screen with your table number.",
            icon: <Smartphone className="w-6 h-6 text-amber-400" />,
        },
        {
            num: "04",
            title: "Enjoy Hot Food & Pay Seamlessly",
            desc: "Track cooking status live on your phone. Settle bill easily with Google Pay, PhonePe, UPI, or cash at counter.",
            icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#150600] border-2 border-amber-500/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-[#1A0800] via-[#2A1005] to-[#1A0800]">
                    <div className="flex items-center gap-3">
                        <SuryaSunLogo size={36} />
                        <div>
                            <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold block">
                                Surya Smart Table System
                            </span>
                            <h3 className="font-serif text-xl font-black text-[#F8F3EB]">
                                How Table QR Ordering Works
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Steps Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-3.5">
                        {steps.map((s) => (
                            <div
                                key={s.num}
                                className="p-4 rounded-2xl bg-[#200A02] border border-amber-500/20 flex items-start gap-4 hover:border-amber-400 transition group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#150600] border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                    {s.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                                            {s.num}
                                        </span>
                                        <h4 className="font-bold text-sm text-[#F8F3EB]">
                                            {s.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-amber-100/70 leading-relaxed">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action CTA */}
                    <div className="pt-2">
                        <Link
                            href="/order?branch=1&table=T1"
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                        >
                            <span>TRY SAMPLE TABLE MENU (TABLE 1)</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
