"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    Search,
    Printer,
    RefreshCw,
    AlertTriangle,
    CreditCard,
    Banknote,
    QrCode,
    CheckCircle2,
    Calendar,
    Clock,
    User,
    Phone,
    FileText,
    ArrowRightLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { printPOSReceipt, PrintOrderData } from "@/lib/thermalPrint";
import { formatRupees } from "@/lib/formatters";

interface POSRecentBillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    outlet: any;
}

export function POSRecentBillsModal({ isOpen, onClose, outlet }: POSRecentBillsModalProps) {
    const toast = useToast();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Change Payment Method State
    const [showChangePayment, setShowChangePayment] = useState<boolean>(false);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("cash");
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [isUpdatingPayment, setIsUpdatingPayment] = useState<boolean>(false);

    // Void Order State
    const [showVoidModal, setShowVoidModal] = useState<boolean>(false);
    const [voidReason, setVoidReason] = useState<string>("");
    const [isVoiding, setIsVoiding] = useState<boolean>(false);

    const fetchRecentOrders = async () => {
        setIsLoading(true);
        try {
            const data = await api.getOrders({ outlet_id: outlet?.id, date: new Date().toISOString().split("T")[0] });
            const list = Array.isArray(data) ? data : [];
            // Sort by latest created_at
            list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setOrders(list);
            if (list.length > 0 && !selectedOrder) {
                setSelectedOrder(list[0]);
            }
        } catch {
            toast.error("Failed to load recent orders");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRecentOrders();
        }
    }, [isOpen, outlet?.id]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !query ||
                o.order_number?.toLowerCase().includes(query) ||
                o.customer_name?.toLowerCase().includes(query) ||
                o.customer_phone?.toLowerCase().includes(query) ||
                (o.table?.label || "").toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "paid" && o.payment_status === "paid") ||
                (statusFilter === "pending" && o.payment_status !== "paid" && o.status !== "cancelled") ||
                (statusFilter === "cancelled" && o.status === "cancelled");

            return matchesQuery && matchesStatus;
        });
    }, [orders, searchQuery, statusFilter]);

    // 🖨️ Duplicate Bill Reprint
    const handleReprint = (order: any) => {
        const printData: PrintOrderData = {
            id: order.id,
            order_number: order.order_number + " (COPY)",
            order_type: order.order_type,
            table_id: order.table_id,
            table_label: order.table?.label || (order.order_type === "takeaway" ? "Takeaway" : "Counter"),
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            delivery_address: order.delivery_address,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            subtotal_paise: order.subtotal_paise,
            discount_paise: order.discount_paise,
            coupon_code: order.coupon_code,
            tax_paise: order.tax_paise,
            total_paise: order.total_paise,
            created_at: order.created_at,
            items: (order.items || []).map((it: any) => ({
                item_name: it.item_name || it.menu_item?.name || "Item",
                variant_name: it.variant_name,
                qty: it.qty,
                unit_price_paise: it.unit_price_paise,
                total_price_paise: it.total_price_paise,
                notes: it.notes,
            })),
        };
        printPOSReceipt(printData, outlet);
        toast.success(`🖨️ Duplicate bill #${order.order_number} sent to printer`);
    };

    // 🔄 Change Payment Method
    const handleChangePaymentSubmit = async () => {
        if (!selectedOrder) return;
        setIsUpdatingPayment(true);
        try {
            const updated = await api.changeOrderPaymentMethod(selectedOrder.id, newPaymentMethod, paymentNotes);
            toast.success(`Payment method updated to ${newPaymentMethod.toUpperCase()}`);
            setShowChangePayment(false);
            setPaymentNotes("");
            setSelectedOrder(updated);
            fetchRecentOrders();
        } catch (err: any) {
            toast.error(err.message || "Failed to update payment method");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    // ❌ Void / Cancel Order
    const handleVoidSubmit = async () => {
        if (!selectedOrder || !voidReason.trim()) {
            toast.error("Please enter a mandatory cancellation reason");
            return;
        }
        setIsVoiding(true);
        try {
            const updated = await api.voidOrder(selectedOrder.id, voidReason);
            toast.success(`Order #${selectedOrder.order_number} marked as VOIDED`);
            setShowVoidModal(false);
            setVoidReason("");
            setSelectedOrder(updated);
            fetchRecentOrders();
        } catch (err: any) {
            toast.error(err.message || "Failed to void order");
        } finally {
            setIsVoiding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[90vh] bg-[#17130F] text-white rounded-3xl border border-[#D4AF37]/30 shadow-2xl flex flex-col overflow-hidden">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-serif font-black text-lg sm:text-xl text-white flex items-center gap-2">
                                Bill History &amp; Quick Reprint
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-bold">
                                    [F7]
                                </span>
                            </h2>
                            <p className="text-xs text-white/50">Look up today's bills, reprint duplicates, or adjust payment tender</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchRecentOrders}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition cursor-pointer"
                            title="Refresh bills"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MODAL BODY (TWO COLUMN LAYOUT) */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    {/* LEFT LIST: SEARCH & BILL CARDS */}
                    <div className="w-full md:w-5/12 border-r border-white/10 flex flex-col bg-black/20">
                        {/* Search & Filter Bar */}
                        <div className="p-3 space-y-2 border-b border-white/10">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search bill #, table, customer..."
                                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]"
                                />
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] overflow-x-auto no-scrollbar">
                                {[
                                    { id: "all", label: "All Bills" },
                                    { id: "paid", label: "Settled (Paid)" },
                                    { id: "pending", label: "Pending" },
                                    { id: "cancelled", label: "Voided" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                                            statusFilter === tab.id ? "bg-[#D4AF37] text-black shadow" : "text-white/60 hover:text-white"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bills List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {isLoading ? (
                                <div className="p-8 text-center text-xs text-white/40">Loading today's bills...</div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="p-8 text-center text-xs text-white/40">No bills found matching search.</div>
                            ) : (
                                filteredOrders.map((o) => {
                                    const isSelected = selectedOrder?.id === o.id;
                                    const isCancelled = o.status === "cancelled";
                                    const isPaid = o.payment_status === "paid";
                                    return (
                                        <div
                                            key={o.id}
                                            onClick={() => setSelectedOrder(o)}
                                            className={`p-3 rounded-2xl border transition cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#D4AF37]/15 border-[#D4AF37] shadow-lg"
                                                    : "bg-black/40 border-white/5 hover:border-white/20"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="font-mono font-black text-xs text-white">
                                                        #{o.order_number}
                                                    </span>
                                                    <span className="text-[10px] text-white/50 block">
                                                        {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {o.order_type === "delivery" ? "🛵 Delivery" : o.order_type === "takeaway" ? "🛍️ Takeaway" : `🍽️ Table ${o.table?.label || "1"}`}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-mono font-black text-sm text-[#D4AF37]">
                                                        {formatRupees(o.total_paise || 0)}
                                                    </span>
                                                    <span
                                                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded block text-center mt-0.5 ${
                                                            isCancelled
                                                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                : isPaid
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                        }`}
                                                    >
                                                        {isCancelled ? "VOIDED" : (o.payment_method || "CASH").toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {o.customer_name && (
                                                <div className="mt-1 text-[10px] text-white/60 truncate flex items-center gap-1">
                                                    <User className="w-3 h-3 text-white/40" />
                                                    {o.customer_name} {o.customer_phone ? `(${o.customer_phone})` : ""}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT DETAIL: SELECTED BILL PREVIEW & ACTIONS */}
                    <div className="flex-1 flex flex-col bg-black/40 p-4 sm:p-6 overflow-y-auto">
                        {selectedOrder ? (
                            <div className="space-y-5 max-w-xl mx-auto w-full">
                                {/* Bill Meta Card */}
                                <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <div>
                                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">
                                                Tax Invoice / Cash Bill
                                            </span>
                                            <h3 className="font-mono font-black text-xl text-white">
                                                #{selectedOrder.order_number}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Reprint Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleReprint(selectedOrder)}
                                                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                                            >
                                                <Printer className="w-4 h-4" />
                                                <span>Reprint (Duplicate)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Order Info Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                                            <span className="text-[10px] text-white/40 block">Type / Seating</span>
                                            <span className="font-bold text-white">
                                                {selectedOrder.order_type === "delivery" ? "🛵 Delivery" : selectedOrder.order_type === "takeaway" ? "🛍️ Takeaway" : `🍽️ Table ${selectedOrder.table?.label || "1"}`}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                                            <span className="text-[10px] text-white/40 block">Time</span>
                                            <span className="font-bold text-white">
                                                {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                                            <span className="text-[10px] text-white/40 block">Payment Tender</span>
                                            <span className="font-bold text-amber-400 uppercase">
                                                {selectedOrder.payment_method || "CASH"} ({selectedOrder.payment_status || "PAID"})
                                            </span>
                                        </div>
                                    </div>

                                    {selectedOrder.customer_name && (
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                                            <span className="text-[10px] text-white/40 block">Customer Details</span>
                                            <span className="font-bold text-white">
                                                {selectedOrder.customer_name} {selectedOrder.customer_phone ? `• ${selectedOrder.customer_phone}` : ""}
                                            </span>
                                            {selectedOrder.delivery_address && (
                                                <p className="text-[10px] text-white/60 mt-0.5">{selectedOrder.delivery_address}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Itemized List */}
                                <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 space-y-3">
                                    <h4 className="font-serif font-black text-sm text-white border-b border-white/10 pb-2">
                                        Ordered Items ({selectedOrder.items?.length || 0})
                                    </h4>

                                    <div className="space-y-2">
                                        {(selectedOrder.items || []).map((it: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                                                <div>
                                                    <span className="font-bold text-white">{it.item_name || it.menu_item?.name}</span>
                                                    {it.variant_name && (
                                                        <span className="text-[10px] text-amber-400 block">▶ {it.variant_name}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-white/60">x{it.qty}</span>
                                                    <span className="font-mono font-bold text-white">
                                                        {formatRupees(it.total_price_paise || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-white/60">
                                            <span>Subtotal:</span>
                                            <span className="font-mono">{formatRupees(selectedOrder.subtotal_paise || 0)}</span>
                                        </div>
                                        {(selectedOrder.discount_paise || 0) > 0 && (
                                            <div className="flex justify-between text-purple-400 font-bold">
                                                <span>Discount ({selectedOrder.coupon_code || "Special"}):</span>
                                                <span className="font-mono">-{formatRupees(selectedOrder.discount_paise || 0)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-white/60">
                                            <span>GST (5%):</span>
                                            <span className="font-mono">{formatRupees(selectedOrder.tax_paise || 0)}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-base text-[#D4AF37] pt-1.5 border-t border-white/10">
                                            <span>NET PAID:</span>
                                            <span className="font-mono">{formatRupees(selectedOrder.total_paise || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operational Action Controls */}
                                {selectedOrder.status !== "cancelled" && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewPaymentMethod(selectedOrder.payment_method || "cash");
                                                setShowChangePayment(true);
                                            }}
                                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs text-white flex items-center justify-center gap-2 transition cursor-pointer"
                                        >
                                            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                                            <span>Change Payment Method</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowVoidModal(true)}
                                            className="p-3 rounded-2xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 font-bold text-xs text-red-400 flex items-center justify-center gap-2 transition cursor-pointer"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Void / Cancel Bill</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-white/40 text-xs">
                                Select a bill on the left to view complete details &amp; reprint
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL 1: CHANGE PAYMENT METHOD */}
                {showChangePayment && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-[#1E1914] rounded-3xl border border-amber-500/40 p-5 space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <h3 className="font-serif font-black text-base text-white flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                                    Change Payment Tender
                                </h3>
                                <button type="button" onClick={() => setShowChangePayment(false)} className="text-white/60 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-white/60">
                                Adjust the payment method recorded for bill <strong className="text-white">#{selectedOrder?.order_number}</strong> ({formatRupees(selectedOrder?.total_paise || 0)}).
                            </p>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "cash", label: "💵 Cash", icon: Banknote },
                                    { id: "upi", label: "📱 UPI / QR", icon: QrCode },
                                    { id: "card", label: "💳 Card", icon: CreditCard },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setNewPaymentMethod(m.id)}
                                        className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                                            newPaymentMethod === m.id
                                                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                                : "bg-black/40 border-white/10 text-white/70 hover:bg-white/5"
                                        }`}
                                    >
                                        <m.icon className="w-5 h-5" />
                                        <span>{m.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="text-[11px] text-white/60 font-bold block mb-1">Audit Reason / Notes</label>
                                <input
                                    type="text"
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="e.g. Guest paid via PhonePe instead of Cash"
                                    className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowChangePayment(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleChangePaymentSubmit}
                                    disabled={isUpdatingPayment}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider"
                                >
                                    {isUpdatingPayment ? "Updating..." : "Save Payment Method"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 2: VOID / CANCEL BILL */}
                {showVoidModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-[#1E1914] rounded-3xl border border-red-500/40 p-5 space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <h3 className="font-serif font-black text-base text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Void / Cancel Bill
                                </h3>
                                <button type="button" onClick={() => setShowVoidModal(false)} className="text-white/60 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-white/60">
                                Are you sure you want to VOID bill <strong className="text-white">#{selectedOrder?.order_number}</strong> ({formatRupees(selectedOrder?.total_paise || 0)})? This will release table occupancy and record a cancellation loss in audit logs.
                            </p>

                            <div>
                                <label className="text-[11px] text-red-300 font-bold block mb-1">Mandatory Cancellation Reason *</label>
                                <input
                                    type="text"
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="e.g. Customer changed mind / duplicate punch / wrong order"
                                    className="w-full px-3 py-2 bg-black/60 border border-red-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-red-400"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowVoidModal(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleVoidSubmit}
                                    disabled={isVoiding || !voidReason.trim()}
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50"
                                >
                                    {isVoiding ? "Voiding..." : "Confirm Void Bill"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
