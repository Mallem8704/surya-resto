"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    TrendingUp,
    ShoppingBag,
    Coffee,
    Clock,
    DollarSign,
    RefreshCw,
    Award,
    Flame,
    PieChart,
    Layers,
    Calendar,
    Printer,
    Download,
    Share2,
    MessageCircle,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Utensils,
    Bike,
    Banknote,
    QrCode,
    CreditCard,
    AlertTriangle,
    Shield,
    Store,
    ChevronRight,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useOutlet } from "@/context/OutletContext";
import { formatRupees } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { EODReportModal } from "@/components/admin/EODReportModal";
import { dispatchEODWhatsApp } from "@/lib/whatsapp";

export default function AdminAnalyticsDashboardPage() {
    const { isAuthenticated, isLoading: authLoading, isOwner } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();
    const { outlet } = useOutlet();

    // Filters
    const [selectedBranchId, setSelectedBranchId] = useState<number>(isOwner ? 0 : (outlet?.id || 1)); // Staff locked to their branch
    const [timePreset, setTimePreset] = useState<"today" | "yesterday" | "7d" | "30d" | "month">("7d");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showEODModal, setShowEODModal] = useState<boolean>(false);

    // Analytics Data State
    const [summary, setSummary] = useState<any>(null);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [topItems, setTopItems] = useState<any[]>([]);
    const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
    const [branchComparison, setBranchComparison] = useState<any[]>([]);

    // Convert time preset to days
    const presetDays = useMemo(() => {
        if (timePreset === "today") return 1;
        if (timePreset === "yesterday") return 2;
        if (timePreset === "7d") return 7;
        if (timePreset === "30d") return 30;
        if (timePreset === "month") return 30;
        return 7;
    }, [timePreset]);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    // RBAC: Lock staff to their assigned branch
    useEffect(() => {
        if (!isOwner && outlet?.id) {
            setSelectedBranchId(outlet.id);
        }
    }, [isOwner, outlet?.id]);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        const outletParam = selectedBranchId > 0 ? selectedBranchId : undefined;
        try {
            const [
                sumData,
                trendData,
                channelData,
                pmData,
                topData,
                hourlyData,
                catData,
                branchData,
            ] = await Promise.all([
                api.getAnalyticsSummary({ outlet_id: outletParam, days: presetDays }),
                api.getRevenueTrend(presetDays, outletParam),
                api.getChannelsBreakdown(presetDays, outletParam),
                api.getPaymentMethodsBreakdown(presetDays, outletParam),
                api.getTopItems(10, outletParam, presetDays),
                api.getHourlyDistribution(outletParam, presetDays),
                api.getCategoryBreakdown(outletParam, presetDays),
                api.getBranchComparison(presetDays),
            ]);

            setSummary(sumData);
            setRevenueTrend(trendData);
            setChannels(channelData);
            setPaymentMethods(pmData);
            setTopItems(topData);
            setHourlyDistribution(hourlyData);
            setCategoryBreakdown(catData);
            setBranchComparison(branchData);
        } catch (err) {
            console.error("Analytics fetch error:", err);
            toast.error("Failed to load analytics data");
        } finally {
            setIsLoading(false);
        }
    }, [selectedBranchId, presetDays, toast]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAnalytics();
        }
    }, [isAuthenticated, fetchAnalytics]);

    // Export CSV Report
    const handleExportCSV = () => {
        if (!summary) return;
        const csvRows = [
            ["SURYA FAMILY RESTAURANT - BUSINESS ANALYTICS REPORT"],
            [`Generated At: ${new Date().toLocaleString("en-IN")}`],
            [`Restaurant: Surya Family Restaurant Kadiri`],
            [`Time Range: ${timePreset.toUpperCase()}`],
            [],
            ["--- 1. EXECUTIVE KPI SUMMARY ---"],
            ["Metric", "Value"],
            ["Gross Sales (₹)", summary.gross_sales_rupees || 0],
            ["Total Discounts Given (₹)", summary.total_discount_rupees || 0],
            ["Net Sales (₹)", summary.net_sales_rupees || 0],
            ["GST Collected (₹)", summary.total_tax_rupees || 0],
            ["Total Orders Count", summary.total_orders || 0],
            ["Completed Orders", summary.completed_orders_count || 0],
            ["Average Order Value (AOV ₹)", summary.avg_order_value_rupees || 0],
            ["Total Items Sold", summary.total_items_sold || 0],
            ["Cancelled Orders Count", summary.cancelled_orders?.count || 0],
            ["Cancelled Loss Amount (₹)", summary.cancelled_orders?.lost_revenue_rupees || 0],
            [],
            ["--- 2. TOP 10 BESTSELLING DISHES ---"],
            ["Rank", "Item Name", "Quantity Sold", "Revenue (₹)"],
            ...topItems.map((it, idx) => [idx + 1, it.item_name, it.qty_sold, it.revenue_rupees]),
            [],
            ["--- 3. SALES BY CHANNEL ---"],
            ["Channel", "Orders Count", "Revenue (₹)", "Percentage (%)"],
            ...channels.map((c) => [c.name, c.count, c.revenue_rupees, `${c.percentage}%`]),
            [],
            ["--- 4. PAYMENT TENDER BREAKDOWN ---"],
            ["Payment Mode", "Transactions", "Revenue (₹)", "Percentage (%)"],
            ...paymentMethods.map((pm) => [pm.name, pm.count, pm.revenue_rupees, `${pm.percentage}%`]),
        ];

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Surya_Analytics_${timePreset}_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("📥 CSV Report downloaded successfully");
    };

    // WhatsApp Business Summary Dispatch
    const handleSendWhatsAppSummary = async () => {
        try {
            const report = await api.getEODReport(undefined, selectedBranchId || outlet?.id);
            dispatchEODWhatsApp(report, outlet?.phone || "9959159515");
            toast.success("📱 WhatsApp Business Report opened!");
        } catch {
            toast.error("Failed to generate WhatsApp report");
        }
    };

    if (authLoading || !isAuthenticated) return null;

    const maxDayRevenue = Math.max(...revenueTrend.map((d) => d.revenue_rupees || 0), 100);
    const maxHourlyOrders = Math.max(...hourlyDistribution.map((h) => h.order_count || 0), 1);

    return (
        <div className="flex h-screen bg-[#0F0C09] text-white overflow-hidden font-sans">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <AdminHeader
                    wsConnected={wsConnected}
                    pendingServiceCalls={pendingServiceCalls}
                    onAttendServiceCall={handleAttendServiceCall}
                />

                {/* MAIN ANALYTICS VIEW */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* ══════════════════════════════════════════════════════════
                        TOP CONTROL TOOLBAR (Petpooja & TMbill Standard)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-3xl bg-[#17130F] border border-[#D4AF37]/30 shadow-xl">
                        {/* Title & Branch Switcher */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
                                <h1 className="font-serif text-xl sm:text-2xl font-black text-white">
                                    Business Intelligence &amp; Analytics
                                </h1>
                                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                                    Live Sync
                                </span>
                            </div>

                            {/* Branch Selection Pills — Owner Only */}
                            {isOwner ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranchId(0)}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            selectedBranchId === 0
                                                ? "bg-[#D4AF37] text-black shadow-md"
                                                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                                        }`}
                                    >
                                        🏢 All Branches Unified
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranchId(1)}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            selectedBranchId === 1
                                                ? "bg-amber-500 text-black shadow-md"
                                                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                                        }`}
                                    >
                                        🏛️ Surya Family Restaurant (Kadiri)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranchId(2)}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            selectedBranchId === 2
                                                ? "bg-amber-500 text-black shadow-md"
                                                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                                        }`}
                                    >
                                        🌟 Branch 2
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-xs font-bold text-white/80">
                                        {outlet?.name || "Surya Family Restaurant"}
                                    </span>
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Assigned Outlet</span>
                                </div>
                            )}
                        </div>

                        {/* Date Presets & Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Date Presets */}
                            <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 text-xs overflow-x-auto no-scrollbar max-w-full">
                                {[
                                    { id: "today", label: "Today" },
                                    { id: "yesterday", label: "Yesterday" },
                                    { id: "7d", label: "7 Days" },
                                    { id: "30d", label: "30 Days" },
                                    { id: "month", label: "This Month" },
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setTimePreset(p.id as any)}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                            timePreset === p.id ? "bg-[#D4AF37] text-black shadow" : "text-white/60 hover:text-white"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* Export CSV */}
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                                title="Export Analytics to CSV Excel"
                            >
                                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span className="hidden sm:inline">Export CSV</span>
                            </button>

                            {/* WhatsApp Summary */}
                            <button
                                type="button"
                                onClick={handleSendWhatsAppSummary}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
                                title="Send Business Summary on WhatsApp"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Print Z-Report */}
                            <button
                                type="button"
                                onClick={() => setShowEODModal(true)}
                                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                                title="Daily Z-Report Register Closing"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Z-Report</span>
                            </button>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        6-CARD EXECUTIVE KPI SCORECARD (Petpooja / TMbill format)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {/* 1. Net Revenue */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-[#D4AF37]/30 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-[#D4AF37]">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Net Revenue</span>
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-white">
                                {formatRupees(summary?.net_sales_paise || summary?.total_revenue_paise || 0)}
                            </h3>
                            <p className="text-[10px] text-white/50">
                                Gross: {formatRupees(summary?.gross_sales_paise || 0)}
                            </p>
                        </div>

                        {/* 2. Total Orders */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-blue-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-white">
                                {summary?.total_orders || 0}
                            </h3>
                            <p className="text-[10px] text-emerald-400">
                                Completed: {summary?.completed_orders_count || summary?.total_orders || 0}
                            </p>
                        </div>

                        {/* 3. Average Order Value (AOV) */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-amber-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Average Order</span>
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-white">
                                {formatRupees(summary?.avg_order_value_paise || 0)}
                            </h3>
                            <p className="text-[10px] text-white/50">Per Table / Ticket</p>
                        </div>

                        {/* 4. Total Discounts */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-purple-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Discounts Given</span>
                                <Award className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-white">
                                {formatRupees(summary?.total_discount_paise || 0)}
                            </h3>
                            <p className="text-[10px] text-purple-300">Coupons &amp; Promos</p>
                        </div>

                        {/* 5. GST / Tax Collected */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-white/10 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-emerald-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">GST Collected</span>
                                <Shield className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-white">
                                {formatRupees(summary?.total_tax_paise || 0)}
                            </h3>
                            <p className="text-[10px] text-white/50">Govt Tax (5%)</p>
                        </div>

                        {/* 6. Cancelled / Void Loss */}
                        <div className="p-4 rounded-3xl bg-[#17130F] border border-red-500/30 shadow-lg space-y-2">
                            <div className="flex items-center justify-between text-red-400">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Void / Cancelled</span>
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <h3 className="font-mono font-black text-xl sm:text-2xl text-red-400">
                                {summary?.cancelled_orders?.count || 0}
                            </h3>
                            <p className="text-[10px] text-white/50">
                                Loss: {formatRupees(summary?.cancelled_orders?.lost_revenue_paise || 0)}
                            </p>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        CHANNEL SPLIT & PAYMENT BREAKDOWN MATRIX
                       ══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Channel Share (Dine-In vs Takeaway vs Delivery) */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-[#D4AF37]" />
                                    <h3 className="font-serif font-black text-base text-white">
                                        Sales by Channel (Channel Share)
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-white/50">{timePreset.toUpperCase()}</span>
                            </div>

                            <div className="space-y-4">
                                {channels.map((c, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="flex items-center gap-2 text-white">
                                                {c.name === "Dine-In Tables" ? <Utensils className="w-3.5 h-3.5 text-amber-400" /> : c.name === "Takeaway Parcel" ? <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> : <Bike className="w-3.5 h-3.5 text-blue-400" />}
                                                {c.name}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-white/60 font-mono">{c.count} orders</span>
                                                <span className="text-[#D4AF37] font-mono font-black">₹{c.revenue_rupees.toFixed(2)}</span>
                                                <span className="text-xs font-mono font-black text-emerald-400 w-12 text-right">{c.percentage}%</span>
                                            </div>
                                        </div>
                                        {/* Visual Progress Bar */}
                                        <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-emerald-500" : "bg-blue-500"
                                                }`}
                                                style={{ width: `${Math.max(c.percentage, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Tender Settlement Breakdown */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-emerald-400" />
                                    <h3 className="font-serif font-black text-base text-white">
                                        Payment Tender Settlement
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-white/50">Drawer Reconciliation</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {paymentMethods.map((pm, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                                                {pm.name.includes("Cash") ? <Banknote className="w-4 h-4 text-emerald-400" /> : pm.name.includes("UPI") ? <QrCode className="w-4 h-4 text-indigo-400" /> : pm.name.includes("Card") ? <CreditCard className="w-4 h-4 text-amber-400" /> : <Bike className="w-4 h-4 text-blue-400" />}
                                                {pm.name}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                                                {pm.percentage}%
                                            </span>
                                        </div>
                                        <h4 className="font-mono font-black text-lg text-white">
                                            ₹{pm.revenue_rupees.toFixed(2)}
                                        </h4>
                                        <p className="text-[10px] text-white/40 font-mono">{pm.count} transactions</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        DAILY REVENUE TREND CHART (Stacked Velocity)
                       ══════════════════════════════════════════════════════════ */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                                <h3 className="font-serif font-black text-base text-white">
                                    Daily Sales Velocity &amp; Revenue Trend
                                </h3>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-amber-400">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Dine-In
                                </span>
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Takeaway
                                </span>
                                <span className="flex items-center gap-1.5 text-blue-400">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Delivery
                                </span>
                            </div>
                        </div>

                        {/* Interactive Bar Chart */}
                        <div className="h-56 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-1">
                            {revenueTrend.map((d, i) => {
                                const heightPct = Math.round((d.revenue_rupees / maxDayRevenue) * 100);
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                        {/* Hover Tooltip */}
                                        <div className="absolute -top-12 bg-black/90 border border-[#D4AF37] px-2.5 py-1 rounded-xl text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                            <div className="font-bold text-[#D4AF37]">{d.display_date}</div>
                                            <div>₹{d.revenue_rupees.toFixed(2)} ({d.order_count} ord)</div>
                                        </div>

                                        <span className="text-[10px] font-mono text-white/50 group-hover:text-[#D4AF37] font-bold">
                                            {d.revenue_rupees > 0 ? `₹${Math.round(d.revenue_rupees)}` : ""}
                                        </span>

                                        <div className="w-full max-w-[40px] rounded-xl bg-black/40 border border-white/5 overflow-hidden flex flex-col-reverse h-36">
                                            <div
                                                className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-[#D4AF37] transition-all duration-500 rounded-t-xl group-hover:brightness-125"
                                                style={{ height: `${Math.max(heightPct, 4)}%` }}
                                            />
                                        </div>

                                        <span className="text-[10px] font-mono text-white/60 truncate w-full text-center">
                                            {d.display_date}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        HOURLY PEAK RUSH HEATMAP & TOP 10 BESTSELLERS
                       ══════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Top 10 Bestselling Dishes */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-serif font-black text-base text-white">
                                        Top 10 Bestselling Dishes
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-white/50">Menu Stars</span>
                            </div>

                            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                {topItems.length === 0 ? (
                                    <p className="text-xs text-white/50 text-center py-8">No item sales in this range.</p>
                                ) : (
                                    topItems.map((it, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-[#D4AF37]/40 transition flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                                                        idx === 0
                                                            ? "bg-amber-500 text-black"
                                                            : idx === 1
                                                            ? "bg-zinc-300 text-black"
                                                            : idx === 2
                                                            ? "bg-amber-700 text-white"
                                                            : "bg-white/10 text-white/60"
                                                    }`}
                                                >
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">
                                                        {it.item_name}
                                                    </h4>
                                                    <span className="text-[10px] text-emerald-400 font-mono">
                                                        {it.qty_sold} portions sold
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="font-mono font-black text-xs sm:text-sm text-[#D4AF37]">
                                                ₹{it.revenue_rupees.toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 2. Hourly Peak Rush Heatmap (24-Hour Velocity) */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-[#D4AF37]" />
                                    <h3 className="font-serif font-black text-base text-white">
                                        24-Hour Peak Rush &amp; Kitchen Load
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-white/50">Shift Staffing</span>
                            </div>

                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                {hourlyDistribution.filter((h) => h.hour >= 6 && h.hour <= 23).map((h) => {
                                    const pct = Math.round((h.order_count / maxHourlyOrders) * 100);
                                    const isPeak = h.order_count >= maxHourlyOrders * 0.7 && h.order_count > 0;
                                    return (
                                        <div key={h.hour} className="flex items-center gap-3 text-xs">
                                            <span className="font-mono font-bold text-white/70 w-16 shrink-0">
                                                {h.label}
                                            </span>
                                            <div className="flex-1 h-5 rounded-lg bg-black/60 overflow-hidden border border-white/5 flex items-center px-2 relative">
                                                <div
                                                    className={`absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500 ${
                                                        isPeak ? "bg-gradient-to-r from-red-600 to-amber-500" : "bg-amber-500/40"
                                                    }`}
                                                    style={{ width: `${Math.max(pct, h.order_count > 0 ? 5 : 0)}%` }}
                                                />
                                                <span className="relative z-10 text-[10px] font-mono font-bold text-white">
                                                    {h.order_count > 0 ? `${h.order_count} orders (₹${h.revenue_rupees.toFixed(0)})` : "-"}
                                                </span>
                                            </div>
                                            {isPeak && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 uppercase shrink-0">
                                                    🔥 Peak Rush
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        MULTI-BRANCH SIDE-BY-SIDE COMPARISON
                       ══════════════════════════════════════════════════════════ */}
                    {branchComparison.length > 0 && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-[#17130F] border border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Store className="w-5 h-5 text-[#D4AF37]" />
                                    <h3 className="font-serif font-black text-base text-white">
                                        Multi-Branch Head-to-Head Performance
                                    </h3>
                                </div>
                                <span className="text-[11px] font-mono text-white/50">Branch 1 vs Branch 2</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {branchComparison.map((b, i) => (
                                    <div
                                        key={b.outlet_id}
                                        className="p-5 rounded-3xl bg-black/40 border border-white/10 space-y-3 relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                                                    Branch {i + 1}
                                                </span>
                                                <h4 className="font-serif font-black text-lg text-white">
                                                    {b.outlet_name}
                                                </h4>
                                                <p className="text-xs text-white/50 line-clamp-1">{b.address}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-black text-xl text-[#D4AF37]">
                                                    ₹{b.total_revenue_rupees.toFixed(2)}
                                                </span>
                                                <span className="text-[10px] text-white/40 block font-mono">
                                                    {b.total_orders} orders
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                                            <div className="p-2.5 rounded-xl bg-white/5">
                                                <span className="text-[10px] text-white/50 block">Avg Ticket Size</span>
                                                <span className="font-mono font-bold text-white">₹{b.avg_order_value_rupees.toFixed(2)}</span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white/5">
                                                <span className="text-[10px] text-white/50 block">Phone Contact</span>
                                                <span className="font-mono font-bold text-amber-400">{b.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* END OF DAY REPORT MODAL */}
            {showEODModal && (
                <EODReportModal
                    isOpen={showEODModal}
                    onClose={() => setShowEODModal(false)}
                />
            )}
        </div>
    );
}
