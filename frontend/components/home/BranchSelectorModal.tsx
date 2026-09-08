"use client";

import React, { useState } from "react";
import { X, QrCode, Truck, ArrowRight, Store, Sparkles } from "lucide-react";
import Link from "next/link";
import { ArabesqueDivider } from "./ArabiqBrandIcons";

interface BranchSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: "table" | "delivery" | "all";
}

export function BranchSelectorModal({ isOpen, onClose, mode = "all" }: BranchSelectorModalProps) {
    const [selectedBranch, setSelectedBranch] = useState<number>(1);
    const [selectedTable, setSelectedTable] = useState<string>("T1");

    if (!isOpen) return null;

    const tables = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div
                className="bg-[#120E0A] border-2 border-amber-500/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white flex flex-col animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-[#1A140F] via-[#241B13] to-[#1A140F]">
                    <div>
                        <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold block">
                            Surya Family Restaurant
                        </span>
                        <h3 className="font-serif text-lg font-black text-[#F8F3EB]">
                            {mode === "delivery" ? "Surya Restaurant Takeaway / Delivery" : "Select Your Dining Table"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-amber-400 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Restaurant Location Header */}
                    <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
                        <Store className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <h4 className="font-bold text-xs text-white">Surya Family Restaurant</h4>
                            <p className="text-[10px] text-amber-200/80">Opp. RTC Bus Stand, Bypass Road, Kadiri &bull; 098803 58634</p>
                        </div>
                    </div>

                    {mode !== "delivery" && (
                        <div>
                            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                                Select Seated Table:
                            </label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {tables.map((tbl) => (
                                    <button
                                        key={tbl}
                                        type="button"
                                        onClick={() => setSelectedTable(tbl)}
                                        className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                            selectedTable === tbl
                                                ? "border-amber-400 bg-amber-500 text-black font-black shadow-md shadow-amber-500/30"
                                                : "border-amber-500/20 bg-[#1A140F] text-[#F8F3EB] hover:border-amber-500/50"
                                        }`}
                                    >
                                        {tbl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <ArabesqueDivider className="my-2" />

                    {/* Action CTAs */}
                    <div className="space-y-2.5">
                        {mode !== "delivery" && (
                            <Link
                                href={`/order?branch=1&table=${selectedTable}`}
                                onClick={onClose}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-98 cursor-pointer"
                            >
                                <QrCode className="w-4 h-4" />
                                <span>Open Table {selectedTable} Menu & Order</span>
                            </Link>
                        )}

                        <Link
                            href={`/delivery?branch=1`}
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-[#1A140F] border border-amber-500/40 hover:bg-[#2A1F17] text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                        >
                            <Truck className="w-4 h-4" />
                            <span>Takeaway / Home Order (Kadiri Town)</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
