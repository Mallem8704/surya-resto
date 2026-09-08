"use client";

import React from "react";
import { X, QrCode, UtensilsCrossed, Smartphone, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArabesqueDivider } from "./ArabiqBrandIcons";

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
            desc: "Point your iPhone or Android camera at the QR code stand on your dining table. No app download needed.",
            icon: <QrCode className="w-6 h-6 text-[#D4AF37]" />,
        },
        {
            num: "02",
            title: "Explore Live Menu",
            desc: "Browse mouth-watering photos, customize Mandi portions, pick spicy add-ons, and review real-time prices.",
            icon: <UtensilsCrossed className="w-6 h-6 text-[#D4AF37]" />,
        },
        {
            num: "03",
            title: "Place Order & Pay",
            desc: "Tap Send KOT. Pay seamlessly via Google Pay, PhonePe, Paytm, UPI, or pay at table after dining.",
            icon: <Smartphone className="w-6 h-6 text-[#D4AF37]" />,
        },
        {
            num: "04",
            title: "Hot Food Served Fast",
            desc: "Your order instantly appears on the chef's kitchen screen. Track cooking status live right on your phone!",
            icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#120E0A] border-2 border-[#D4AF37]/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-[#D4AF37]/20 flex items-center justify-between bg-gradient-to-r from-[#1A140F] via-[#241B13] to-[#1A140F]">
                    <div>
                        <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block">
                            DineOS Smart Table System
                        </span>
                        <h3 className="font-serif text-xl font-black text-[#F8F3EB]">
                            How Table QR Ordering Works
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D4AF37] flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Steps Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <ArabesqueDivider className="my-1" />

                    <div className="space-y-4">
                        {steps.map((s, i) => (
                            <div
                                key={s.num}
                                className="p-4 rounded-2xl bg-[#1A140F] border border-[#D4AF37]/20 flex items-start gap-4 hover:border-[#D4AF37]/60 transition group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2C2117] to-[#1A140F] border border-[#D4AF37]/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                    {s.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-serif font-bold text-sm text-[#F8F3EB] group-hover:text-[#D4AF37] transition-colors">
                                            {s.title}
                                        </h4>
                                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                                            STEP {s.num}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#C5B39A] leading-relaxed">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2">
                        <Link
                            href="/order?branch=1&table=T1"
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition active:scale-98 cursor-pointer"
                        >
                            <span>Try Table Ordering Demo Now</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
