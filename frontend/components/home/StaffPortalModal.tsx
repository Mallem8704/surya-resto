"use client";

import React from "react";
import { X, Shield, ChefHat, UserCheck, UtensilsCrossed, ArrowRight, Lock, KeyRound, QrCode } from "lucide-react";
import Link from "next/link";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";

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
            icon: <Shield className="w-5 h-5 text-amber-400" />,
            badge: "Full Access",
            badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        },
        {
            title: "Cashier POS & Billing Terminal",
            role: "High-Speed Billing & Settle",
            desc: "Cashier billing, split bills, cash/UPI payment collection, and thermal receipt printing.",
            href: "/admin/pos",
            icon: <UserCheck className="w-5 h-5 text-sky-400" />,
            badge: "Cashier POS",
            badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        },
        {
            title: "Kitchen Display System (KDS)",
            role: "Head Chef & Kitchen Line",
            desc: "Live incoming KOT tickets, audio chime alerts, cooking timers, and ready status dispatch.",
            href: "/admin/kds",
            icon: <ChefHat className="w-5 h-5 text-rose-400" />,
            badge: "Kitchen Live",
            badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
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
            title: "Tables & QR Stands Management",
            role: "Floor Map & Standee Cards",
            desc: "Live table occupancy status, dynamic QR code generation, and printable table stands.",
            href: "/admin/tables",
            icon: <QrCode className="w-5 h-5 text-purple-400" />,
            badge: "12 Tables",
            badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#150600] border-2 border-amber-500/50 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95 max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-[#1A0800] via-[#2A1005] to-[#1A0800]">
                    <div className="flex items-center gap-3">
                        <SuryaSunLogo size={36} />
                        <div>
                            <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                <span>Authorized Staff & Operations</span>
                            </span>
                            <h3 className="font-serif text-lg font-black text-[#F8F3EB]">
                                Surya Staff Cockpits
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

                {/* Portals List */}
                <div className="p-6 space-y-3 overflow-y-auto">
                    {portals.map((p, idx) => (
                        <Link
                            key={idx}
                            href={p.href}
                            onClick={onClose}
                            className="p-3.5 rounded-2xl bg-[#200A02] border border-amber-500/20 hover:border-amber-400 hover:bg-[#2C1004] flex items-start gap-3.5 transition group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#150600] border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                {p.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h4 className="font-bold text-sm text-[#F8F3EB] group-hover:text-amber-400 transition-colors truncate">
                                        {p.title}
                                    </h4>
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${p.badgeColor} shrink-0`}>
                                        {p.badge}
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-100/60 line-clamp-2 leading-relaxed">
                                    {p.desc}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform self-center shrink-0" />
                        </Link>
                    ))}

                    <div className="pt-2 text-center">
                        <Link
                            href="/admin/login"
                            onClick={onClose}
                            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:underline"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Go directly to Admin Login (owner@suryarestaurant.com)</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
