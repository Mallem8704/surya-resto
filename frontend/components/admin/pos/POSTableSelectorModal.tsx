"use client";

import React, { useState } from "react";
import { Users, Clock, Flame, CheckCircle2, ArrowRight } from "lucide-react";
import { formatRupees, formatRelativeTime } from "@/lib/formatters";

interface POSTableSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: any[];
    activeOrders: any[];
    selectedTableId: number | null;
    onSelectTable: (table: any) => void;
}

export function POSTableSelectorModal({
    isOpen,
    onClose,
    tables,
    activeOrders,
    selectedTableId,
    onSelectTable,
}: POSTableSelectorModalProps) {
    const [filter, setFilter] = useState<"all" | "free" | "occupied">("all");

    if (!isOpen) return null;

    const getOrderForTable = (tableId: number) => {
        return activeOrders.find((o) => o.table_id === tableId && o.status !== "completed" && o.status !== "cancelled");
    };

    const filteredTables = tables.filter((t) => {
        const order = getOrderForTable(t.id);
        const isOccupied = !!order || t.status === "occupied";
        if (filter === "free" && isOccupied) return false;
        if (filter === "occupied" && !isOccupied) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-[#140F0B] border border-[#D4AF37]/40 rounded-3xl p-6 space-y-6 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <span className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] font-bold">
                            Live Floor Map • Dining Section
                        </span>
                        <h2 className="font-serif text-xl sm:text-2xl font-black text-white mt-0.5">
                            Select Dine-In Table
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filter tabs */}
                        <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 text-xs">
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                className={`px-3 py-1.5 rounded-lg font-bold ${filter === "all" ? "bg-[#D4AF37] text-black" : "text-white/60"}`}
                            >
                                All ({tables.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("occupied")}
                                className={`px-3 py-1.5 rounded-lg font-bold ${filter === "occupied" ? "bg-red-600 text-white" : "text-red-400"}`}
                            >
                                Occupied
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("free")}
                                className={`px-3 py-1.5 rounded-lg font-bold ${filter === "free" ? "bg-emerald-600 text-white" : "text-emerald-400"}`}
                            >
                                Available
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Table Cards Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
                    {filteredTables.map((t) => {
                        const order = getOrderForTable(t.id);
                        const isOccupied = !!order || t.status === "occupied";
                        const isSelected = selectedTableId === t.id;

                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    onSelectTable(t);
                                    onClose();
                                }}
                                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden min-h-[120px] ${
                                    isSelected
                                        ? "bg-[#2A1E14] border-[#D4AF37] ring-2 ring-[#D4AF37] shadow-xl scale-102"
                                        : isOccupied
                                        ? "bg-[#1F120E] border-red-500/40 hover:border-red-500"
                                        : "bg-[#151D18] border-emerald-500/30 hover:border-emerald-500"
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-serif font-black text-lg text-white">{t.label}</span>
                                    <span
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            isOccupied ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        }`}
                                    >
                                        {isOccupied ? "Occupied" : "Available"}
                                    </span>
                                </div>

                                {order ? (
                                    <div className="mt-2 space-y-1">
                                        <p className="font-mono font-black text-sm text-[#D4AF37]">
                                            {formatRupees(order.total_price_paise || order.total_paise || 0)}
                                        </p>
                                        <div className="flex items-center gap-1 text-[10px] text-white/50">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatRelativeTime(order.created_at)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-emerald-400 font-medium mt-3">
                                        Ready for Guests
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
