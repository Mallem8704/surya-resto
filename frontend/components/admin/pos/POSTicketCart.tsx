"use client";

import React, { useState } from "react";
import {
    Trash2,
    Plus,
    Minus,
    Printer,
    Banknote,
    QrCode,
    CreditCard,
    Percent,
    User,
    Phone,
    FileText,
    CheckCircle2,
    ChefHat,
    Sparkles,
} from "lucide-react";
import { formatRupees } from "@/lib/formatters";

export interface POSCartItem {
    item_id: number;
    name: string;
    variant_id?: number;
    variant_name?: string;
    price_paise: number;
    qty: number;
    notes?: string;
}

interface POSTicketCartProps {
    orderType: "dine_in" | "takeaway" | "delivery";
    selectedTable: { id: number; label: string } | null;
    activeTableOrder: any | null;
    onOpenTableSelector: () => void;
    cartItems: POSCartItem[];
    onUpdateQty: (index: number, newQty: number) => void;
    onUpdateNotes: (index: number, notes: string) => void;
    onRemoveItem: (index: number) => void;
    onClearCart: () => void;
    customerName: string;
    onChangeCustomerName: (name: string) => void;
    customerPhone: string;
    onChangeCustomerPhone: (phone: string) => void;
    deliveryAddress: string;
    onChangeDeliveryAddress: (addr: string) => void;
    discountPaise: number;
    onSetDiscountPaise: (paise: number) => void;
    parcelChargePaise: number;
    onToggleParcelCharge: (enabled: boolean) => void;
    taxRatePercent: number;
    onSendKOT: () => void;
    onSettleCash: () => void;
    onSettleUPI: () => void;
    onSettleCard: () => void;
    onPrintBillEstimate: () => void;
    isSubmitting: boolean;
}

export function POSTicketCart({
    orderType,
    selectedTable,
    activeTableOrder,
    onOpenTableSelector,
    cartItems,
    onUpdateQty,
    onUpdateNotes,
    onRemoveItem,
    onClearCart,
    customerName,
    onChangeCustomerName,
    customerPhone,
    onChangeCustomerPhone,
    deliveryAddress,
    onChangeDeliveryAddress,
    discountPaise,
    onSetDiscountPaise,
    parcelChargePaise,
    onToggleParcelCharge,
    taxRatePercent,
    onSendKOT,
    onSettleCash,
    onSettleUPI,
    onSettleCard,
    onPrintBillEstimate,
    isSubmitting,
}: POSTicketCartProps) {
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [discountInput, setDiscountInput] = useState("");
    const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");

    // Existing active table items (if running table order exists)
    const existingItems = activeTableOrder?.items || [];
    const existingSubtotalPaise = existingItems.reduce(
        (acc: number, it: any) => acc + (it.unit_price_paise || it.price_paise || 0) * it.quantity,
        0
    );

    // New Cart items subtotal
    const newItemsSubtotalPaise = cartItems.reduce((acc, ci) => acc + ci.price_paise * ci.qty, 0);

    // Combined Gross Subtotal
    const totalSubtotalPaise = existingSubtotalPaise + newItemsSubtotalPaise;

    // Net after discount
    const netAfterDiscountPaise = Math.max(0, totalSubtotalPaise - discountPaise);

    // Tax calculation
    const taxPaise = Math.round(netAfterDiscountPaise * (taxRatePercent / 100));

    // Grand Total
    const grandTotalPaise = netAfterDiscountPaise + taxPaise + parcelChargePaise;

    const handleApplyDiscount = () => {
        const val = parseFloat(discountInput) || 0;
        if (discountType === "flat") {
            onSetDiscountPaise(Math.round(val * 100));
        } else {
            const calculated = Math.round(totalSubtotalPaise * (val / 100));
            onSetDiscountPaise(calculated);
        }
        setDiscountModalOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#16120E] text-white">
            {/* TICKET HEADER */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 bg-[#1D1712] space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
                        <h2 className="font-serif text-sm sm:text-base font-black text-white uppercase tracking-wider">
                            {orderType === "dine_in" ? "Dine-In Ticket" : orderType === "takeaway" ? "Takeaway Parcel" : "Direct Delivery"}
                        </h2>
                    </div>
                    {orderType === "dine_in" ? (
                        <button
                            type="button"
                            onClick={onOpenTableSelector}
                            className="px-3 py-1 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-mono font-bold text-xs hover:bg-[#D4AF37]/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                            <span>Table: {selectedTable ? selectedTable.label : "Select Table"}</span>
                            <span className="text-[10px] text-white/50">[F4]</span>
                        </button>
                    ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-mono font-bold uppercase">
                            {orderType === "takeaway" ? "Counter Parcel" : "Doorstep Delivery"}
                        </span>
                    )}
                </div>

                {/* Customer Quick Inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Guest Name"
                            value={customerName}
                            onChange={(e) => onChangeCustomerName(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#D4AF37]"
                        />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Mobile No."
                            value={customerPhone}
                            onChange={(e) => onChangeCustomerPhone(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                        />
                    </div>
                </div>

                {orderType === "delivery" && (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Delivery Address & Landmark in Kadiri..."
                            value={deliveryAddress}
                            onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#D4AF37]"
                        />
                    </div>
                )}
            </div>

            {/* RUNNING ITEMS LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 1. Existing Running Table Items (if table was already occupied) */}
                {existingItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider">
                            <span>Previous Orders (Running KOT)</span>
                            <span>{existingItems.length} items</span>
                        </div>
                        {existingItems.map((it: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                <div className="flex-1 pr-2">
                                    <span className="font-bold text-white/80">
                                        {it.item_name || it.menu_item?.name || `Item #${it.item_id}`}
                                    </span>
                                    {it.variant_name && (
                                        <span className="text-[10px] text-[#D4AF37] block font-mono">({it.variant_name})</span>
                                    )}
                                </div>
                                <span className="text-[11px] font-mono text-white/60 font-bold mr-3">{it.quantity}x</span>
                                <span className="font-mono font-bold text-xs text-white/80">
                                    {formatRupees((it.unit_price_paise || it.price_paise || 0) * it.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Newly Added Cart Items */}
                {cartItems.length === 0 && existingItems.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-white/40 space-y-2">
                        <FileText className="w-8 h-8 text-white/20" />
                        <p className="text-xs">Ticket is empty. Tap menu items to add to bill.</p>
                    </div>
                ) : (
                    cartItems.map((ci, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-[#1F1813] border border-white/10 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">
                                        {ci.name}
                                    </h4>
                                    {ci.variant_name && (
                                        <span className="text-[10px] text-[#D4AF37] font-mono font-bold block">
                                            {ci.variant_name}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(idx)}
                                    className="text-white/40 hover:text-red-400 p-1 transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Qty and Subtotal */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQty(idx, ci.qty - 1)}
                                        className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-xs px-1">{ci.qty}</span>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQty(idx, ci.qty + 1)}
                                        className="w-6 h-6 rounded bg-[#D4AF37] hover:bg-[#C59B27] flex items-center justify-center text-black font-bold"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                <span className="font-mono font-black text-xs sm:text-sm text-[#D4AF37]">
                                    {formatRupees(ci.price_paise * ci.qty)}
                                </span>
                            </div>

                            {/* Optional Kitchen Note */}
                            <input
                                type="text"
                                placeholder="Add cooking note (e.g. less spicy)..."
                                value={ci.notes || ""}
                                onChange={(e) => onUpdateNotes(idx, e.target.value)}
                                className="w-full px-2 py-1 rounded bg-black/40 border border-white/5 text-[10px] text-white/80 placeholder-white/20 focus:outline-none focus:border-[#D4AF37]"
                            />
                        </div>
                    ))
                )}
            </div>

            {/* FINANCIAL SUMMARY & ACTIONS */}
            <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#1D1712] space-y-3 shrink-0">
                {/* Financial lines */}
                <div className="space-y-1.5 text-xs text-[#C5B39A]">
                    <div className="flex justify-between">
                        <span>Subtotal ({cartItems.length + existingItems.length} items)</span>
                        <span className="font-mono font-bold text-white">{formatRupees(totalSubtotalPaise)}</span>
                    </div>

                    {/* Discount Pill */}
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setDiscountModalOpen(true)}
                            className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Percent className="w-3 h-3" />
                            <span>{discountPaise > 0 ? `Discount Applied (-${formatRupees(discountPaise)})` : "+ Add Discount [F8]"}</span>
                        </button>
                        {discountPaise > 0 && (
                            <span className="font-mono font-bold text-emerald-400">-{formatRupees(discountPaise)}</span>
                        )}
                    </div>

                    {/* Parcel Charges */}
                    {orderType === "takeaway" && (
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                                <input
                                    type="checkbox"
                                    checked={parcelChargePaise > 0}
                                    onChange={(e) => onToggleParcelCharge(e.target.checked)}
                                    className="rounded text-[#D4AF37]"
                                />
                                <span>Packaging / Parcel Container</span>
                            </label>
                            {parcelChargePaise > 0 && (
                                <span className="font-mono font-bold text-white">+{formatRupees(parcelChargePaise)}</span>
                            )}
                        </div>
                    )}

                    {/* Tax */}
                    <div className="flex justify-between text-[11px]">
                        <span>GST ({taxRatePercent}%)</span>
                        <span className="font-mono font-bold text-white">{formatRupees(taxPaise)}</span>
                    </div>

                    {/* Grand Total */}
                    <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                        <span className="font-serif font-black text-sm text-white uppercase">Grand Total</span>
                        <span className="font-mono font-black text-lg sm:text-xl text-[#D4AF37]">
                            {formatRupees(grandTotalPaise)}
                        </span>
                    </div>
                </div>

                {/* FAST ACTION BUTTONS GRID */}
                <div className="space-y-2 pt-1">
                    {/* Send KOT Button */}
                    <button
                        type="button"
                        onClick={onSendKOT}
                        disabled={isSubmitting || cartItems.length === 0}
                        className="w-full py-2.5 rounded-xl bg-[#2A1E14] hover:bg-[#38281B] border border-[#D4AF37]/50 text-[#D4AF37] font-serif font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow"
                    >
                        <ChefHat className="w-4 h-4" />
                        <span>🔥 Send Kitchen KOT [F9]</span>
                    </button>

                    {/* Settlement Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={onSettleCash}
                            disabled={isSubmitting || grandTotalPaise === 0}
                            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Cash</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[F10]</span>
                        </button>

                        <button
                            type="button"
                            onClick={onSettleUPI}
                            disabled={isSubmitting || grandTotalPaise === 0}
                            className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <QrCode className="w-3.5 h-3.5" />
                                <span>UPI QR</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[F11]</span>
                        </button>

                        <button
                            type="button"
                            onClick={onPrintBillEstimate}
                            disabled={isSubmitting || totalSubtotalPaise === 0}
                            className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Bill Print</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[F12]</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* DISCOUNT MODAL */}
            {discountModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-[#171310] border border-[#D4AF37]/40 rounded-3xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="font-serif font-black text-sm text-white">Custom Discount</h3>
                            <button onClick={() => setDiscountModalOpen(false)} className="text-white/60 hover:text-white text-xs">✕</button>
                        </div>

                        <div className="flex rounded-xl bg-black/50 p-1 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setDiscountType("flat")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${discountType === "flat" ? "bg-[#D4AF37] text-black" : "text-white/60"}`}
                            >
                                Flat ₹
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType("percent")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${discountType === "percent" ? "bg-[#D4AF37] text-black" : "text-white/60"}`}
                            >
                                Percent %
                            </button>
                        </div>

                        <input
                            type="number"
                            placeholder={discountType === "flat" ? "Enter ₹ amount (e.g. 50)" : "Enter % (e.g. 10)"}
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-center text-sm focus:outline-none focus:border-[#D4AF37]"
                            autoFocus
                        />

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => { onSetDiscountPaise(0); setDiscountModalOpen(false); }}
                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70"
                            >
                                Remove
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyDiscount}
                                className="flex-1 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
