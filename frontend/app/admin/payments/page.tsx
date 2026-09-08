"use client";

import { printPOSReceipt } from "@/lib/thermalPrint";
import { dispatchCustomerWhatsApp, dispatchPostDiningReview } from "@/lib/whatsapp";
import { Printer, MessageCircle, Star } from "lucide-react";
import { EODReportModal } from "@/components/admin/EODReportModal";
import { PaymentSettlementModal } from "@/components/admin/PaymentSettlementModal";


import { useOutlet } from "@/context/OutletContext";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    CreditCard,
    Banknote,
    CheckCircle2,
    Clock,
    AlertCircle,
    RefreshCw,
    Search,
    Filter,
    ShieldCheck,
    Receipt,
    ArrowUpRight,
    TrendingUp,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatRupees, formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";

export default function AdminPaymentsPage() {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();
    const { outlet } = useOutlet();

    const [payments, setPayments] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [filterMethod, setFilterMethod] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showEODModal, setShowEODModal] = useState<boolean>(false);
    const [selectedOrderForSettlement, setSelectedOrderForSettlement] = useState<any | null>(null);
    const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchPaymentData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [paymentsData, ordersData] = await Promise.all([
                api.getPayments({ outlet_id: outlet?.id }),
                api.getOrders({ outlet_id: outlet?.id }),
            ]);
            setPayments(paymentsData);
            setOrders(ordersData);
        } catch {
            toast.error("Failed to load payments ledger");
        } finally {
            setIsLoading(false);
        }
    }, [toast, outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPaymentData();
        }
    }, [isAuthenticated, fetchPaymentData]);

    // 1-Tap Cash Payment Reconciliation
    const handleMarkCashPaid = async (orderId: number, orderNumber: string) => {
        try {
            await api.markCashPaid(orderId, `Cash collected at counter by ${user?.name || "Staff"}`);
            toast.success(`Order #${orderNumber} marked as PAID in Cash!`);
            fetchPaymentData();
        } catch (err: any) {
            toast.error(err.message || "Failed to reconcile cash payment");
        }
    };

    // Calculate Summary Metrics
    const isPaymentCompleted = (status: string) => status === "paid" || status === "completed";

    const totalCollectedPaise = payments
        .filter((p) => isPaymentCompleted(p.status))
        .reduce((sum, p) => sum + p.amount_paise, 0);

    const upiCollectedPaise = payments
        .filter((p) => isPaymentCompleted(p.status) && (p.method === "upi" || p.method === "card"))
        .reduce((sum, p) => sum + p.amount_paise, 0);

    const cashCollectedPaise = payments
        .filter((p) => isPaymentCompleted(p.status) && (p.method === "cash" || p.method === "counter"))
        .reduce((sum, p) => sum + p.amount_paise, 0);

    // Pending Orders (awaiting counter payment)
    const pendingOrders = orders.filter(
        (o) => o.payment_status === "pending" && o.status !== "cancelled"
    );
    const pendingDuesPaise = pendingOrders.reduce((sum, o) => sum + o.total_paise, 0);

    // Filter Payments List
    const filteredPayments = payments.filter((p) => {
        if (filterMethod !== "all" && p.method !== filterMethod) return false;
        if (filterStatus !== "all") {
            if (filterStatus === "paid" && !isPaymentCompleted(p.status)) return false;
            if (filterStatus === "pending" && isPaymentCompleted(p.status)) return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const mId = String(p.id).includes(q);
            const mOrder = String(p.order_id).includes(q);
            const mRef = (p.txn_id || p.gateway_payment_id || p.notes)?.toLowerCase().includes(q) ?? false;
            if (!mId && !mOrder && !mRef) return false;
        }
        return true;
    });

    if (authLoading || !isAuthenticated) return null;

    return (
        <div className="flex h-screen bg-cream-100 overflow-hidden font-sans">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <AdminHeader
                    wsConnected={wsConnected}
                    pendingServiceCalls={pendingServiceCalls}
                    onAttendServiceCall={handleAttendServiceCall}
                />

                {/* Top Bar */}
                <div className="p-6 bg-white border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
                    <div>
                        <h2 className="text-xl font-extrabold text-espresso-950 tracking-tight flex items-center gap-2">
                            Payments & Cashier Reconciliation
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 text-espresso-800 font-bold">
                                {payments.length} Transactions
                            </span>
                        </h2>
                        <p className="text-xs text-espresso-600">
                            Cash drawer balance, Direct Bank UPI ledger & 1-tap counter cash reconciliation.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow-md cursor-pointer"
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                            onClick={() => setShowEODModal(true)}
                        >
                            Daily EOD Z-Report
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                            onClick={fetchPaymentData}
                        >
                            Refresh Ledger
                        </Button>
                    </div>
                </div>

                <EODReportModal
                    isOpen={showEODModal}
                    onClose={() => setShowEODModal(false)}
                />

                {/* Summary KPI Cards */}
                <div className="p-4 sm:p-6 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
                    {/* Card 1: Total Collections */}
                    <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-espresso-500 block">
                                Total Collections
                            </span>
                            <span className="text-2xl font-black text-espresso-950 mt-1 block">
                                {formatRupees(totalCollectedPaise)}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                <TrendingUp className="w-3 h-3" /> Reconciled
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <Receipt className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 2: UPI Online */}
                    <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-espresso-500 block">
                                UPI & Card Online
                            </span>
                            <span className="text-2xl font-black text-terracotta-600 mt-1 block">
                                {formatRupees(upiCollectedPaise)}
                            </span>
                            <span className="text-[11px] text-espresso-500 font-medium mt-0.5">
                                Auto-verified via Razorpay
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center font-bold">
                            <CreditCard className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 3: Cash Collected */}
                    <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-espresso-500 block">
                                Cash at Counter
                            </span>
                            <span className="text-2xl font-black text-espresso-900 mt-1 block">
                                {formatRupees(cashCollectedPaise)}
                            </span>
                            <span className="text-[11px] text-espresso-500 font-medium mt-0.5">
                                Staff Cash Drawer
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                            <Banknote className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 4: Pending Dues */}
                    <div className="bg-white rounded-3xl p-5 border border-cream-300 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-espresso-500 block">
                                Pending Counter Dues
                            </span>
                            <span className="text-2xl font-black text-red-600 mt-1 block">
                                {formatRupees(pendingDuesPaise)}
                            </span>
                            <span className="text-[11px] text-red-700 font-bold mt-0.5">
                                {pendingOrders.length} Unpaid Orders
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 bg-cream-100 space-y-6">
                    {/* SECTION 1: PENDING CASH RECONCILIATION QUEUE */}
                    {pendingOrders.length > 0 && (
                        <div className="bg-white rounded-3xl border border-red-200 shadow-xs overflow-hidden">
                            <div className="p-4 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <h3 className="font-extrabold text-red-950 text-sm">
                                        Counter Cash Collection Queue ({pendingOrders.length} orders pending payment)
                                    </h3>
                                </div>
                                <span className="text-xs font-black text-red-700">
                                    Due: {formatRupees(pendingDuesPaise)}
                                </span>
                            </div>

                            <div className="divide-y divide-cream-100">
                                {pendingOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream-50/50 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-espresso-900 text-white flex items-center justify-center font-black text-xs">
                                                Table {order.table_label || `T${order.table_id}`}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-espresso-950 text-sm">
                                                        Order #{order.order_number}
                                                    </span>
                                                    <span className="text-[11px] text-espresso-500 font-medium">
                                                        ({formatRelativeTime(order.created_at)})
                                                    </span>
                                                </div>
                                                <div className="text-xs text-espresso-600 mt-0.5">
                                                    {order.items?.map((i: any) => `${i.qty}x ${i.item_name}`).join(", ")}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-sm font-black text-espresso-950 block">
                                                    {formatRupees(order.total_paise)}
                                                </span>
                                                <span className="text-[11px] text-saffron-700 font-bold uppercase tracking-wider">
                                                    Pay at Counter
                                                </span>
                                            </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-1.5 shadow-sm"
                                                onClick={() => {
                                                    setSelectedOrderForSettlement(order);
                                                    setShowSettlementModal(true);
                                                }}
                                                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                                            >
                                                Settle Bill (UPI / Cash / Split)
                                            </Button>

                                            <button
                                                onClick={() => handleMarkCashPaid(order.id, order.order_number)}
                                                className="px-2.5 py-1.5 rounded-xl border border-cream-300 hover:bg-cream-100 text-espresso-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                                title="Instant 1-Tap Cash Settlement"
                                            >
                                                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="hidden sm:inline">Quick Cash</span>
                                            </button>
                                        </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: ALL COMPLETED TRANSACTIONS TABLE */}
                    <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-cream-200 bg-cream-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-extrabold text-espresso-950 text-sm">
                                Payment Ledger History ({filteredPayments.length})
                            </h3>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <select
                                    value={filterMethod}
                                    onChange={(e) => setFilterMethod(e.target.value)}
                                    className="p-2 rounded-xl border border-cream-300 bg-white font-bold text-espresso-800"
                                >
                                    <option value="all">All Methods</option>
                                    <option value="upi">UPI / Online</option>
                                    <option value="cash">Cash Counter</option>
                                    <option value="card">Card</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="p-2 rounded-xl border border-cream-300 bg-white font-bold text-espresso-800"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                                <thead>
                                    <tr className="border-b border-cream-200 bg-cream-50/40 text-espresso-600 font-extrabold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Txn ID</th>
                                        <th className="py-3 px-4">Order Ref</th>
                                        <th className="py-3 px-4">Method</th>
                                        <th className="py-3 px-4">Amount (₹)</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Payment Notes</th>
                                        <th className="py-3 px-4 text-right">Timestamp</th>
                                        <th className="py-3 px-4 text-center">Receipts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cream-100">
                                    {filteredPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-10 text-espresso-400">
                                                No payment transactions match filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPayments.map((p) => {
                                            const isPaid = isPaymentCompleted(p.status);
                                            const isUpi = p.method === "upi" || p.method === "card";

                                            return (
                                                <tr key={p.id} className="hover:bg-cream-50/50 transition">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-espresso-900">
                                                        #{p.id}
                                                    </td>

                                                    <td className="py-3.5 px-4 font-bold text-espresso-950">
                                                        Order #{p.order_id}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                                                isUpi
                                                                    ? "bg-terracotta-100 text-terracotta-800"
                                                                    : "bg-amber-100 text-amber-900"
                                                            }`}
                                                        >
                                                            {isUpi ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                                            <span>{p.method.toUpperCase()}</span>
                                                        </span>
                                                    </td>

                                                <td className="py-3.5 px-4 font-mono font-black text-sm text-espresso-950">
                                                    {formatRupees(p.amount_paise)}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                            isPaid
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-saffron-100 text-saffron-900"
                                                        }`}
                                                    >
                                                        {isPaid ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                                                <span>Paid</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3 h-3 text-saffron-700" />
                                                                <span>Pending</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-espresso-600 font-mono text-[11px]">
                                                    {p.txn_id || p.gateway_payment_id || p.notes || "Cash Counter Reconciliation"}
                                                </td>

                                                <td className="py-3.5 px-4 text-right text-espresso-500 font-medium">
                                                    {formatDateTime(p.created_at)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                const matchOrder = orders.find(o => o.id === p.order_id);
                                                                if (matchOrder) {
                                                                    printPOSReceipt(matchOrder, outlet);
                                                                } else {
                                                                    toast.info("Loading order details...");
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-cream-200 text-espresso-800 transition cursor-pointer"
                                                            title="Print POS Thermal Bill"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                const matchOrder = orders.find(o => o.id === p.order_id);
                                                                if (matchOrder) {
                                                                    dispatchPostDiningReview(matchOrder, outlet);
                                                                } else {
                                                                    toast.info("Loading order details...");
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition cursor-pointer border border-amber-200"
                                                            title="Send 5-Star Google Review Invite on WhatsApp"
                                                        >
                                                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Payment Settlement Modal (Dynamic UPI / Cash Tender / Split) */}
            {showSettlementModal && selectedOrderForSettlement && (
                <PaymentSettlementModal
                    isOpen={showSettlementModal}
                    onClose={() => {
                        setShowSettlementModal(false);
                        setSelectedOrderForSettlement(null);
                    }}
                    order={selectedOrderForSettlement}
                    onSuccess={() => fetchPaymentData()}
                />
            )}
        </div>
    </div>
);
}
