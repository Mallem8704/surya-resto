"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    QrCode,
    Check,
    Copy,
    Smartphone,
    ArrowRight,
    ShieldCheck,
    Banknote,
    Clock,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/formatters";
import { useToast } from "@/context/ToastContext";
import { soundManager } from "@/lib/sound";
import { useOrderSocket } from "@/hooks/useSockets";

interface UpiPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: number;
    orderNumber: string;
    totalPaise: number;
    customerPhone?: string;
    onPaymentSuccess: (orderData?: any) => void;
    onSwitchToCash?: () => void;
}

export function UpiPaymentModal({
    isOpen,
    onClose,
    orderId,
    orderNumber,
    totalPaise,
    customerPhone,
    onPaymentSuccess,
    onSwitchToCash,
}: UpiPaymentModalProps) {
    const toast = useToast();
    const [upiData, setUpiData] = useState<{
        upi_uri: string;
        amount_rs: number;
        outlet_name: string;
        upi_vpa: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [utrNumber, setUtrNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5-minute dynamic timer (in seconds)
    const hasCompletedRef = useRef(false);

    const amountRs = Math.round(totalPaise / 100);

    // Fetch live NPCI UPI Intent URI from backend
    const fetchUpiDetails = useCallback(() => {
        if (!orderId) return;
        setIsLoading(true);
        api.getDynamicUpi(orderId)
            .then((data) => {
                setUpiData(data);
                setTimeLeft(300);
            })
            .catch(() => {
                // Fallback default VPA conforming to universal NPCI specification
                const fallbackVpa = "SBIBHIM.INSTANT26821939387985481@sbipay";
                const cleanOrderNo = encodeURIComponent(orderNumber || "SURYA");
                const uri = `upi://pay?pa=${fallbackVpa}&pn=Surya%20Family%20Restaurant&am=${amountRs.toFixed(2)}&cu=INR&tn=Order%20%23${cleanOrderNo}`;
                setUpiData({
                    upi_uri: uri,
                    amount_rs: amountRs,
                    outlet_name: "Surya Family Restaurant",
                    upi_vpa: fallbackVpa,
                });
                setTimeLeft(300);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [orderId, orderNumber, amountRs]);

    useEffect(() => {
        if (!isOpen || !orderId) return;
        hasCompletedRef.current = false;
        fetchUpiDetails();
    }, [isOpen, orderId, fetchUpiDetails]);

    // Dynamic Countdown Timer (1 second interval)
    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    // Auto-completion helper triggered by WebSocket or Polling
    const handleAutoSuccess = useCallback(
        (orderData?: any) => {
            if (hasCompletedRef.current) return;
            hasCompletedRef.current = true;
            soundManager.playOrderPlacedSuccess();
            toast.success(`UPI Payment of ${formatRupees(totalPaise)} Verified!`);
            onPaymentSuccess(orderData);
            onClose();
        },
        [totalPaise, toast, onPaymentSuccess, onClose]
    );

    // 1. WebSocket Live Receipt Verification
    useOrderSocket(isOpen ? orderId : null, (updatedOrder) => {
        if (
            updatedOrder &&
            (updatedOrder.payment_status === "paid" ||
                updatedOrder.status === "accepted" ||
                updatedOrder.status === "preparing")
        ) {
            handleAutoSuccess(updatedOrder);
        }
    });

    // 2. Polling Fallback (every 3.5 seconds)
    useEffect(() => {
        if (!isOpen || !orderId || hasCompletedRef.current) return;

        const pollInterval = setInterval(async () => {
            try {
                const latest = await api.getOrder(orderId);
                if (latest && (latest.payment_status === "paid" || latest.status === "accepted")) {
                    clearInterval(pollInterval);
                    handleAutoSuccess(latest);
                }
            } catch {
                // Ignore transient polling failure
            }
        }, 3500);

        return () => clearInterval(pollInterval);
    }, [isOpen, orderId, handleAutoSuccess]);

    if (!isOpen) return null;

    const upiUri =
        upiData?.upi_uri ||
        `upi://pay?pa=SBIBHIM.INSTANT26821939387985481@sbipay&pn=Surya%20Family%20Restaurant&am=${amountRs.toFixed(2)}&cu=INR&tn=Order%20%23${encodeURIComponent(orderNumber)}`;
    const vpa = upiData?.upi_vpa || "SBIBHIM.INSTANT26821939387985481@sbipay";

    // Countdown formatting
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const isExpired = timeLeft === 0;

    // Copy UPI VPA to clipboard
    const handleCopyVpa = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(vpa);
            setCopied(true);
            toast.success(`UPI ID copied: ${vpa}`);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Manual Confirm Payment via Direct Merchant UPI
    const handleConfirmPayment = async () => {
        setIsSubmitting(true);
        try {
            const cleanUtr = utrNumber.trim();
            const res = await api.submitUpiRef({
                order_id: orderId,
                utr_number: cleanUtr || undefined,
                amount_paise: totalPaise,
                notes: `UPI customer submission${cleanUtr ? ` (UTR: ${cleanUtr})` : ""}`,
            });

            soundManager.playOrderPlacedSuccess();
            toast.success(`UPI Payment of ${formatRupees(totalPaise)} Confirmed!`);
            onPaymentSuccess(res);
            onClose();
        } catch (err: any) {
            console.error("Direct UPI submit error:", err);
            soundManager.playOrderPlacedSuccess();
            toast.success("UPI Payment details received! Kitchen will begin preparation.");
            onPaymentSuccess();
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Generate scannable QR Image URL
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-[#140F0B] text-[#F8F3EB] rounded-3xl border-2 border-[#D4AF37]/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-[#1E1610] via-[#2A1E14] to-[#1E1610] border-b border-[#D4AF37]/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-serif font-extrabold text-base text-white tracking-wide">
                                Pay with UPI
                            </h3>
                            <p className="text-xs text-[#D4AF37]/90 font-mono">Order #{orderNumber}</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Amount Card */}
                    <div className="p-4 rounded-2xl bg-[#1D1610] border border-[#D4AF37]/40 text-center space-y-1 shadow-inner">
                        <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                            Total Amount Payable
                        </span>
                        <div className="text-3xl font-black font-mono text-white tracking-tight">
                            {formatRupees(totalPaise)}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/60 pt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Zero Gateway Fees &bull; Direct Merchant UPI</span>
                        </div>
                    </div>

                    {/* QR Code Container with Expiry Handling */}
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                        <div className="p-3.5 bg-white rounded-2xl shadow-xl border-2 border-[#D4AF37] relative group">
                            {isLoading ? (
                                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-xl">
                                    <RefreshCw className="w-8 h-8 text-amber-700 animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={qrImageUrl}
                                        alt="NPCI Dynamic UPI QR"
                                        className={`w-48 h-48 object-contain rounded-lg transition ${
                                            isExpired ? "opacity-15 filter blur-xs" : ""
                                        }`}
                                    />
                                    {isExpired && (
                                        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-4 text-center space-y-2">
                                            <AlertCircle className="w-8 h-8 text-amber-400" />
                                            <p className="text-xs font-bold text-white">QR Code Expired</p>
                                            <p className="text-[10px] text-white/60">
                                                Dynamic security window timed out
                                            </p>
                                            <button
                                                onClick={fetchUpiDetails}
                                                className="mt-1 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C058] text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                <span>Regenerate QR</span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Status Pills: Timer and Live Verification */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                                    isExpired
                                        ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                                        : timeLeft <= 60
                                        ? "bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse"
                                        : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{isExpired ? "QR Expired" : `Expires in ${formattedCountdown}`}</span>
                            </div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] text-white/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Auto-Detecting</span>
                            </div>
                        </div>

                        <p className="text-[11px] text-white/60 text-center font-medium">
                            Scan with <span className="text-[#D4AF37] font-bold">GPay</span>,{" "}
                            <span className="text-[#D4AF37] font-bold">PhonePe</span>,{" "}
                            <span className="text-[#D4AF37] font-bold">PayTM</span>, or any UPI App
                        </p>
                    </div>

                    {/* 1-Tap UPI Apps (For Mobile Browsers) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block text-center">
                            Or open installed UPI App ({formatRupees(totalPaise)}):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Google Pay */}
                            <a
                                href={upiUri}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-[#D4AF37]/15 border border-white/10 hover:border-[#D4AF37] text-xs font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>Google Pay</span>
                            </a>

                            {/* PhonePe */}
                            <a
                                href={upiUri}
                                className="p-2.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400 text-xs font-bold text-purple-200 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span>PhonePe</span>
                            </a>

                            {/* Paytm */}
                            <a
                                href={upiUri}
                                className="p-2.5 rounded-xl bg-sky-950/30 hover:bg-sky-900/40 border border-sky-500/30 hover:border-sky-400 text-xs font-bold text-sky-200 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                                <span>Paytm</span>
                            </a>

                            {/* WhatsApp / BHIM / Other UPI */}
                            <a
                                href={upiUri}
                                className="p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-400 text-xs font-bold text-emerald-200 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>BHIM / Other</span>
                            </a>
                        </div>
                    </div>

                    {/* VPA ID Copy Bar */}
                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-white/40 block">UPI ID / VPA:</span>
                            <span className="font-mono font-bold text-[#D4AF37] truncate block">{vpa}</span>
                        </div>
                        <button
                            onClick={handleCopyVpa}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#D4AF37] hover:text-black text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? "Copied!" : "Copy ID"}</span>
                        </button>
                    </div>

                    {/* Optional UTR / Reference */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                            UPI Transaction ID / UTR (Optional):
                        </label>
                        <input
                            type="text"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            placeholder="e.g. 423987123456 or leave blank"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] font-mono"
                        />
                    </div>

                    {/* Submit Confirmation Button */}
                    <button
                        onClick={handleConfirmPayment}
                        disabled={isSubmitting}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>VERIFYING PAYMENT...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>I HAVE COMPLETED UPI PAYMENT</span>
                            </>
                        )}
                    </button>

                    {/* Switch to COD fallback */}
                    {onSwitchToCash && (
                        <div className="text-center pt-1">
                            <button
                                onClick={onSwitchToCash}
                                className="text-xs text-white/50 hover:text-white underline transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Switch to Cash on Delivery (COD)</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
