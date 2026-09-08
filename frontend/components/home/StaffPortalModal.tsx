"use client";

import React from "react";
import { X, Shield, ChefHat, UserCheck, UtensilsCrossed, ArrowRight, Lock, KeyRound } from "lucide-react";
import Link from "next/link";
import { ArabesqueDivider } from "./ArabiqBrandIcons";

interface StaffPortalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StaffPortalModal({ isOpen, onClose }: StaffPortalModalProps) {
    if (!isOpen) return null;

    const portals = [
        {
            title: "Manager / Owner Cockpit",
            role: "Master Admin & Analytics",
            desc: "Full access to live orders, sales analytics, menu pricing, stock, staff, and outlet settings.",
            href: "/admin/login",
            icon: <Shield className="w-5 h-5 text-[#D4AF37]" />,
            badge: "Full Access",
            badgeColor: "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40",
        },
        {
            title: "Kitchen Display System (KDS)",
            role: "Head Chef & Kitchen Line",
            desc: "Live incoming KOT tickets, audio chime alerts, cooking timers, and ready status dispatch.",
            href: "/admin/kds",
            icon: <ChefHat className="w-5 h-5 text-amber-400" />,
            badge: "Kitchen Live",
            badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        },
        {
            title: "Captain Order App",
            role: "Floor Captains & Waiters",
            desc: "Take orders directly at customer tables, append dishes to existing running bills, and send KOTs.",
            href: "/captain",
            icon: <UtensilsCrossed className="w-5 h-5 text-emerald-400" />,
            badge: "Table Service",
            badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        },
        {
            title: "Cashier & Table Billing Cockpit",
            role: "POS & Settlement Counter",
            desc: "Manage occupied tables, generate dynamic UPI payment QRs, print thermal bills, and settle cash.",
            href: "/admin/tables",
            icon: <UserCheck className="w-5 h-5 text-sky-400" />,
            badge: "POS Billing",
            badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#120E0A] border-2 border-[#D4AF37]/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-[#D4AF37]/20 flex items-center justify-between bg-gradient-to-r from-[#1A140F] via-[#241B13] to-[#1A140F]">
                    <div>
                        <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            <span>Authorized Staff & Management Portals</span>
                        </span>
                        <h3 className="font-serif text-xl font-black text-[#F8F3EB]">
                            Arabiq Staff Cockpits
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D4AF37] flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Portals List */}
                <div className="p-6 space-y-3.5 overflow-y-auto">
                    <ArabesqueDivider className="my-1" />

                    {portals.map((p, idx) => (
                        <Link
                            key={idx}
                            href={p.href}
                            onClick={onClose}
                            className="p-4 rounded-2xl bg-[#1A140F] border border-[#D4AF37]/20 hover:border-[#D4AF37] hover:bg-[#251D16] flex items-start gap-3.5 transition group"
                        >
                            <div className="w-11 h-11 rounded-2xl bg-[#120E0A] border border-[#D4AF37]/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                {p.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="font-serif font-bold text-sm text-[#F8F3EB] group-hover:text-[#D4AF37] transition-colors truncate">
                                        {p.title}
                                    </h4>
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${p.badgeColor} shrink-0`}>
                                        {p.badge}
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#A6957E] line-clamp-2 leading-relaxed">
                                    {p.desc}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform self-center shrink-0" />
                        </Link>
                    ))}

                    <div className="pt-2 text-center">
                        <Link
                            href="/admin/login"
                            onClick={onClose}
                            className="inline-flex items-center gap-2 text-xs font-bold text-[#D4AF37] hover:underline"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Go directly to Main Login Page</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
