"use client";

import React, { useState, useEffect } from "react";
import { Banknote, ArrowDownRight, ArrowUpRight, Save, History, X } from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";

interface PettyCashModalProps {
    isOpen: boolean;
    onClose: () => void;
    outletId: number;
}

export function PettyCashModal({ isOpen, onClose, outletId }: PettyCashModalProps) {
    const toast = useToast();
    const [type, setType] = useState<"cash_out" | "cash_in">("cash_out");
    const [amountRupees, setAmountRupees] = useState("");
    const [category, setCategory] = useState("Groceries / Milk / Vegetables");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const QUICK_EXPENSE_REASONS = [
        "Milk / Dairy Supply",
        "Ice Blocks & Beverage",
        "Vegetables & Fresh Herbs",
        "Gas Cylinder Refill",
        "Packaging Boxes & Covers",
        "Staff Tea / Refreshment",
        "Miscellaneous Counter Expense",
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amountRupees);
        if (!amt || amt <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsSaving(true);
        try {
            const amountPaise = Math.round(amt * 100);

            // Record to active shift on backend
            try {
                await api.recordPettyCash({
                    type,
                    amount_paise: amountPaise,
                    category,
                    notes: notes.trim(),
                }, outletId);
            } catch (apiErr: any) {
                console.warn("Backend shift petty cash sync note:", apiErr.message);
            }

            // Save to local petty cash register fallback
            const logEntry = {
                id: Date.now(),
                outlet_id: outletId,
                type,
                amount_paise: amountPaise,
                category,
                notes: notes.trim(),
                timestamp: new Date().toISOString(),
            };

            const existing = JSON.parse(localStorage.getItem(`petty_cash_${outletId}`) || "[]");
            localStorage.setItem(`petty_cash_${outletId}`, JSON.stringify([logEntry, ...existing]));

            toast.success(`${type === "cash_out" ? "Cash Out recorded" : "Cash In recorded"}: ₹${amt}`);
            setAmountRupees("");
            setNotes("");
            onClose();
        } catch (err: any) {
            toast.error("Failed to save petty cash entry");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-blue-600" />
                        <h3 className="font-serif font-black text-base text-slate-900">
                            Cash Drawer &amp; Petty Cash
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Switcher */}
                    <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setType("cash_out")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                type === "cash_out" ? "bg-red-600 text-white" : "text-slate-600"
                            }`}
                        >
                            <ArrowDownRight className="w-4 h-4" />
                            <span>Cash Out (Expense)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("cash_in")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                type === "cash_in" ? "bg-emerald-600 text-white" : "text-slate-600"
                            }`}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Cash In (Opening / Float)</span>
                        </button>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            step="any"
                            placeholder="e.g. 250"
                            value={amountRupees}
                            onChange={(e) => setAmountRupees(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-blue-600"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Quick Reasons */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Category / Reason
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        >
                            {QUICK_EXPENSE_REASONS.map((r) => (
                                <option key={r} value={r} className="bg-white text-slate-900">
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Additional Notes
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Paid to milk vendor 5 Litres"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white shadow-xs font-black text-xs uppercase tracking-wider shadow-lg hover:scale-102 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save Entry</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
