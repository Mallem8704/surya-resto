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
    Flame,
    X,
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
        <div className="flex flex-col h-full bg-white text-slate-900 border-l border-slate-200">
            {/* TICKET HEADER */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 text-white animate-pulse" />
                        <h2 className="font-serif text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                            {orderType === "dine_in" ? "Dine-In Ticket" : orderType === "takeaway" ? "Takeaway Parcel" : "Direct Delivery"}
                        </h2>
                    </div>
                    {orderType === "dine_in" ? (
                        <button
                            type="button"
                            onClick={onOpenTableSelector}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono font-bold text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                            <span>Table: {selectedTable ? selectedTable.label : "Select Table"}</span>
                            <span className="text-[10px] text-blue-600 font-semibold">[F4]</span>
                        </button>
                    ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold uppercase">
                            {orderType === "takeaway" ? "Counter Parcel" : "Doorstep Delivery"}
                        </span>
                    )}
                </div>

                {/* Customer Quick Inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Guest Name"
                            value={customerName}
                            onChange={(e) => onChangeCustomerName(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                        />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="tel"
                            maxLength={10}
                            placeholder="Mobile (10 Digits)"
                            value={customerPhone}
                            onChange={(e) => onChangeCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
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
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                        />
                    </div>
                )}
            </div>

            {/* RUNNING ITEMS LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
                {/* 1. Existing Running Table Items (if table was already occupied) */}
                {existingItems.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 font-bold uppercase tracking-wider">
                            <span>Previous Orders (Running KOT)</span>
                            <span>{existingItems.length} items</span>
                        </div>
                        {existingItems.map((it: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                <div className="flex-1 pr-2">
                                    <span className="font-bold text-slate-800">
                                        {it.item_name || it.menu_item?.name || `Item #${it.item_id}`}
                                    </span>
                                    {it.variant_name && (
                                        <span className="text-[10px] text-blue-600 block font-mono">({it.variant_name})</span>
                                    )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-600 font-bold mr-3">{it.quantity}x</span>
                                <span className="font-mono font-bold text-xs text-slate-800">
                                    {formatRupees((it.unit_price_paise || it.price_paise || 0) * it.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Newly Added Cart Items */}
                {cartItems.length === 0 && existingItems.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <p className="text-xs">Ticket is empty. Tap menu items to add to bill.</p>
                    </div>
                ) : (
                    cartItems.map((ci, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                                        {ci.name}
                                    </h4>
                                    {ci.variant_name && (
                                        <span className="text-[10px] text-blue-600 font-mono font-bold block">
                                            {ci.variant_name}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(idx)}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Qty and Subtotal */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQty(idx, ci.qty - 1)}
                                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-xs px-1">{ci.qty}</span>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQty(idx, ci.qty + 1)}
                                        className="w-6 h-6 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center font-bold transition"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                                    {formatRupees(ci.price_paise * ci.qty)}
                                </span>
                            </div>

                            {/* Optional Kitchen Note */}
                            <input
                                type="text"
                                placeholder="Add cooking note (e.g. less spicy)..."
                                value={ci.notes || ""}
                                onChange={(e) => onUpdateNotes(idx, e.target.value)}
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                        </div>
                    ))
                )}
            </div>

            {/* FINANCIAL SUMMARY & ACTIONS */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                {/* Financial lines */}
                <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                        <span>Subtotal ({cartItems.length + existingItems.length} items)</span>
                        <span className="font-mono font-bold text-slate-900">{formatRupees(totalSubtotalPaise)}</span>
                    </div>

                    {/* Discount Pill */}
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setDiscountModalOpen(true)}
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Percent className="w-3 h-3" />
                            <span>{discountPaise > 0 ? `Discount Applied (-${formatRupees(discountPaise)})` : "+ Add Discount [F8]"}</span>
                        </button>
                        {discountPaise > 0 && (
                            <span className="font-mono font-bold text-emerald-600">-{formatRupees(discountPaise)}</span>
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
                                    className="rounded text-blue-600"
                                />
                                <span>Packaging / Parcel Container</span>
                            </label>
                            {parcelChargePaise > 0 && (
                                <span className="font-mono font-bold text-slate-900">+{formatRupees(parcelChargePaise)}</span>
                            )}
                        </div>
                    )}

                    {/* Tax */}
                    <div className="flex justify-between text-[11px]">
                        <span>GST ({taxRatePercent}%)</span>
                        <span className="font-mono font-bold text-slate-900">{formatRupees(taxPaise)}</span>
                    </div>

                    {/* Grand Total */}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                        <span className="font-serif font-black text-sm text-slate-900 uppercase">Grand Total</span>
                        <span className="font-mono font-black text-xl sm:text-2xl text-blue-600">
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
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-serif font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        <Flame className="w-4 h-4 text-slate-950" />
                        <span>Send Kitchen KOT [F9]</span>
                    </button>

                    {/* Settlement Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                        <button
                            type="button"
                            onClick={onSettleCash}
                            disabled={isSubmitting || grandTotalPaise === 0}
                            className="py-2.5 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
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
                            className="py-2.5 px-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <QrCode className="w-3.5 h-3.5" />
                                <span>UPI</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[F11]</span>
                        </button>

                        <button
                            type="button"
                            onClick={onSettleCard}
                            disabled={isSubmitting || grandTotalPaise === 0}
                            className="py-2.5 px-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Card</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[Card]</span>
                        </button>

                        <button
                            type="button"
                            onClick={onPrintBillEstimate}
                            disabled={isSubmitting || totalSubtotalPaise === 0}
                            className="py-2.5 px-1.5 rounded-xl bg-white hover:bg-slate-100 active:scale-98 border border-slate-300 text-slate-800 font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-1">
                                <Printer className="w-3.5 h-3.5 text-blue-600" />
                                <span>Print</span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono">[F12]</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* DISCOUNT MODAL */}
            {discountModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h3 className="font-serif font-black text-sm text-slate-900">Custom Discount</h3>
                            <button onClick={() => setDiscountModalOpen(false)} className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setDiscountType("flat")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${discountType === "flat" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600"}`}
                            >
                                Flat ₹
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType("percent")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${discountType === "percent" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600"}`}
                            >
                                Percent %
                            </button>
                        </div>

                        <input
                            type="number"
                            placeholder={discountType === "flat" ? "Enter ₹ amount (e.g. 50)" : "Enter % (e.g. 10)"}
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono text-center text-sm focus:outline-none focus:border-blue-600"
                            autoFocus
                        />

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => { onSetDiscountPaise(0); setDiscountModalOpen(false); }}
                                className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-600"
                            >
                                Remove
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyDiscount}
                                className="flex-1 py-2 rounded-xl bg-blue-600 text-white shadow-xs font-black text-xs uppercase"
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
