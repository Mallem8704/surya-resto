"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Crown,
    Repeat,
    Sparkles,
    Search,
    Phone,
    MessageCircle,
    MapPin,
    Calendar,
    ShoppingBag,
    TrendingUp,
    RefreshCw,
    X,
    ChevronRight,
    IndianRupee,
    Clock,
    Receipt,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    Mail,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { api } from "@/lib/api";
import { formatRupees, formatDateTime, formatRelativeTime } from "@/lib/formatters";

interface CustomerSummary {
    total_customers: number;
    vip_count: number;
    returning_count: number;
    new_count: number;
    total_revenue_paise: number;
}

interface CustomerListItem {
    id: number;
    phone: string;
    name: string | null;
    email: string | null;
    default_address: string | null;
    created_at: string;
    last_order_at: string | null;
    total_orders: number;
    total_spent_paise: number;
    tier: "vip" | "returning" | "new" | string;
    addresses_count: number;
    latest_order_number: string | null;
}

interface CustomerDetail {
    customer: {
        id: number;
        phone: string;
        name: string;
        email: string | null;
        default_address: string | null;
        created_at: string | null;
        last_order_at: string | null;
        tier: string;
        total_orders: number;
        total_spent_paise: number;
    };
    addresses: Array<{
        id: number;
        label: string;
        address_line: string;
        landmark: string | null;
        is_default: boolean;
        created_at: string | null;
    }>;
    orders: Array<{
        id: number;
        order_number: string;
        outlet_id: number;
        table_id: number | null;
        order_type: string;
        status: string;
        total_paise: number;
        payment_status: string;
        payment_method: string;
        delivery_address: string | null;
        created_at: string | null;
        items: Array<{
            id: number;
            item_name: string;
            variant_name: string | null;
            qty: number;
            total_price_paise: number;
        }>;
    }>;
}

export default function AdminCustomersPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const toast = useToast();
    const { t } = useLanguage();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();

    const [summary, setSummary] = useState<CustomerSummary>({
        total_customers: 0,
        vip_count: 0,
        returning_count: 0,
        new_count: 0,
        total_revenue_paise: 0,
    });
    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedTier, setSelectedTier] = useState<string>("all");

    // Drawer state
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
    const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const res = await api.getAdminCustomers({
                search: searchQuery.trim() || undefined,
                tier: selectedTier !== "all" ? selectedTier : undefined,
            });
            if (res && res.summary && res.customers) {
                setSummary(res.summary);
                setCustomers(res.customers);
            }
        } catch (err: any) {
            console.error("Failed to load customers:", err);
            toast.error(err.message || "Failed to load customers CRM data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchCustomers();
        }
    }, [isAuthenticated, selectedTier]);

    // Handle search with debounce
    useEffect(() => {
        if (!isAuthenticated) return;
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Open customer drawer
    const openCustomerDrawer = async (customerId: number) => {
        setSelectedCustomerId(customerId);
        setDrawerLoading(true);
        try {
            const data = await api.getAdminCustomerDetails(customerId);
            setCustomerDetail(data);
        } catch (err: any) {
            console.error("Failed to load customer details:", err);
            toast.error(err.message || "Could not load customer profile");
            setSelectedCustomerId(null);
        } finally {
            setDrawerLoading(false);
        }
    };

    const closeCustomerDrawer = () => {
        setSelectedCustomerId(null);
        setCustomerDetail(null);
    };

    // Format phone display
    const formatDisplayPhone = (p: string) => {
        const clean = p.replace(/\D/g, "");
        if (clean.length === 10) {
            return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
        }
        return p;
    };

    // Get initials for avatar
    const getInitials = (name: string | null, phone: string) => {
        if (name && name.trim()) {
            const parts = name.trim().split(" ");
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return parts[0].slice(0, 2).toUpperCase();
        }
        return phone.slice(-2);
    };

    const renderTierBadge = (tier: string) => {
        switch (tier) {
            case "vip":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-700 border border-amber-300 dark:border-amber-600/30">
                        <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500/40" />
                        VIP Diner
                    </span>
                );
            case "returning":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-300 dark:border-emerald-600/30">
                        <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                        Returning
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 border border-blue-200">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        New Diner
                    </span>
                );
        }
    };

    return (
        <div className="flex h-screen bg-cream-50 overflow-hidden font-sans">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <AdminHeader
                    wsConnected={wsConnected}
                    pendingServiceCalls={pendingServiceCalls}
                    onAttendServiceCall={handleAttendServiceCall}
                />

                <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-cream-200">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-terracotta-500 text-white rounded-xl shadow-md shadow-terracotta-500/20">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black text-espresso-950 tracking-tight">
                                        Customers CRM & Loyalty
                                    </h1>
                                    <p className="text-xs sm:text-sm text-espresso-600">
                                        Diner profiles, repeat visit frequency, spend analytics, and direct support outreach
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchCustomers}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-cream-300 text-xs font-bold text-espresso-800 hover:bg-cream-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-terracotta-500" : ""}`} />
                                Refresh CRM
                            </button>
                        </div>
                    </div>

                    {/* KPI Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Total Customers */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-cream-200 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-espresso-500">
                                    Registered Diners
                                </span>
                                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                    <Users className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl sm:text-3xl font-black text-espresso-950">
                                    {summary.total_customers}
                                </div>
                                <div className="text-[11px] text-espresso-500 mt-1 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-blue-500" />
                                    Mobile & Password profiles
                                </div>
                            </div>
                        </div>

                        {/* VIP Customers */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 bg-linear-to-br from-white to-amber-50/40 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                    VIP Diners (5+ visits)
                                </span>
                                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                                    <Crown className="w-4 h-4 fill-amber-500" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl sm:text-3xl font-black text-amber-900">
                                    {summary.vip_count}
                                </div>
                                <div className="text-[11px] text-amber-700 font-semibold mt-1">
                                    {summary.total_customers > 0
                                        ? `${Math.round((summary.vip_count / summary.total_customers) * 100)}% of loyal customer base`
                                        : "Most frequent patrons"}
                                </div>
                            </div>
                        </div>

                        {/* Returning Diners */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/40 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                    Returning (2-4 visits)
                                </span>
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                                    <Repeat className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl sm:text-3xl font-black text-emerald-900">
                                    {summary.returning_count}
                                </div>
                                <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                                    Repeat dining customers
                                </div>
                            </div>
                        </div>

                        {/* Total Revenue */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-terracotta-200/80 bg-linear-to-br from-white to-terracotta-50/40 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-terracotta-800">
                                    Total Diner Spend
                                </span>
                                <div className="p-2 rounded-xl bg-terracotta-100 text-terracotta-700">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl sm:text-3xl font-black text-terracotta-900">
                                    {formatRupees(summary.total_revenue_paise, false)}
                                </div>
                                <div className="text-[11px] text-terracotta-700 font-semibold mt-1">
                                    Cumulative fulfilled orders
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Tier Filter Bar */}
                    <div className="bg-white rounded-2xl p-4 border border-cream-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by mobile number (+91), diner name, or email..."
                                className="w-full pl-10 pr-9 py-2.5 bg-cream-50/70 border border-cream-300 rounded-xl text-xs sm:text-sm text-espresso-950 placeholder:text-espresso-400 focus:outline-hidden focus:border-terracotta-500 focus:bg-white transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-espresso-700 p-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Tier Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                            {[
                                { id: "all", label: "All Diners", icon: Users, count: summary.total_customers },
                                { id: "vip", label: "VIP", icon: Crown, count: summary.vip_count },
                                { id: "returning", label: "Returning", icon: Repeat, count: summary.returning_count },
                                { id: "new", label: "New", icon: Sparkles, count: summary.new_count },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSelectedTier(tab.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                                            selectedTier === tab.id
                                                ? "bg-espresso-900 text-white shadow-sm"
                                                : "bg-cream-100 text-espresso-700 hover:bg-cream-200/80"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                        <span
                                            className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                                                selectedTier === tab.id
                                                    ? "bg-white/20 text-white"
                                                    : "bg-espresso-200 text-espresso-800"
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Customer Directory Table */}
                    <div className="bg-white rounded-2xl border border-cream-200 shadow-2xs overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 text-center">
                                <RefreshCw className="w-8 h-8 text-terracotta-500 animate-spin mx-auto mb-3" />
                                <p className="text-sm font-bold text-espresso-800">Loading customer CRM records...</p>
                                <p className="text-xs text-espresso-500 mt-1">Aggregating diner history & visits</p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-12 h-12 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-3 text-espresso-400">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-base font-extrabold text-espresso-900">No Customers Found</h3>
                                <p className="text-xs text-espresso-500 mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? `No diners match the search query "${searchQuery}". Try searching by a different name or 10-digit number.`
                                        : "Customer profiles will automatically appear here as diners register or place orders."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-cream-100/60 border-b border-cream-200 text-[11px] font-extrabold text-espresso-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 sm:px-6">Diner Profile</th>
                                            <th className="py-3 px-4">Loyalty Tier</th>
                                            <th className="py-3 px-4 text-center">Orders</th>
                                            <th className="py-3 px-4 text-right">Lifetime Spend</th>
                                            <th className="py-3 px-4">Last Visit</th>
                                            <th className="py-3 px-4">Saved Address</th>
                                            <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cream-100 text-xs sm:text-sm">
                                        {customers.map((c) => {
                                            const initials = getInitials(c.name, c.phone);
                                            const formattedPhone = formatDisplayPhone(c.phone);

                                            return (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => openCustomerDrawer(c.id)}
                                                    className="hover:bg-cream-50/70 transition-colors cursor-pointer group"
                                                >
                                                    {/* Diner Profile */}
                                                    <td className="py-3.5 px-4 sm:px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-terracotta-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                                                                {initials}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-extrabold text-espresso-950 group-hover:text-terracotta-600 transition truncate flex items-center gap-1.5">
                                                                    {c.name || "Guest Diner"}
                                                                </div>
                                                                <div className="text-xs text-espresso-500 font-mono tracking-tight">
                                                                    {formattedPhone}
                                                                </div>
                                                                {c.email && (
                                                                    <div className="text-[11px] text-espresso-400 truncate max-w-[180px]">
                                                                        {c.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Loyalty Tier */}
                                                    <td className="py-3.5 px-4">
                                                        {renderTierBadge(c.tier)}
                                                    </td>

                                                    {/* Orders Count */}
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-cream-100 text-espresso-900 font-black text-xs">
                                                            {c.total_orders}
                                                        </span>
                                                    </td>

                                                    {/* Lifetime Spend */}
                                                    <td className="py-3.5 px-4 text-right">
                                                        <span className="font-extrabold text-espresso-950">
                                                            {formatRupees(c.total_spent_paise)}
                                                        </span>
                                                    </td>

                                                    {/* Last Visit */}
                                                    <td className="py-3.5 px-4">
                                                        {c.last_order_at ? (
                                                            <div>
                                                                <div className="font-bold text-espresso-800 text-xs">
                                                                    {formatRelativeTime(c.last_order_at)}
                                                                </div>
                                                                {c.latest_order_number && (
                                                                    <span className="text-[10px] text-espresso-400 font-mono">
                                                                        #{c.latest_order_number}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-espresso-400 text-xs italic">Never ordered</span>
                                                        )}
                                                    </td>

                                                    {/* Saved Address */}
                                                    <td className="py-3.5 px-4">
                                                        {c.default_address ? (
                                                            <div className="max-w-[220px] truncate text-xs text-espresso-600 flex items-center gap-1.5" title={c.default_address}>
                                                                <MapPin className="w-3.5 h-3.5 text-terracotta-500 shrink-0" />
                                                                <span className="truncate">{c.default_address}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-espresso-400 text-xs italic">None</span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3.5 px-4 sm:px-6 text-right">
                                                        <div
                                                            className="flex items-center justify-end gap-1.5"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {/* Direct Call */}
                                                            <a
                                                                href={`tel:+91${c.phone}`}
                                                                title={`Call +91 ${c.phone}`}
                                                                className="p-2 rounded-xl bg-cream-100 text-espresso-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                                                            >
                                                                <Phone className="w-4 h-4" />
                                                            </a>

                                                            {/* Direct WhatsApp (CRM / Support) */}
                                                            <a
                                                                href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(
                                                                    `Hello ${c.name || "valued customer"}, greetings from Surya Family Restaurant Kadiri! How may we assist you today?`
                                                                )}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="Contact via WhatsApp"
                                                                className="p-2 rounded-xl bg-cream-100 text-espresso-700 hover:bg-emerald-500 hover:text-white transition"
                                                            >
                                                                <MessageCircle className="w-4 h-4" />
                                                            </a>

                                                            {/* Inspect Drawer */}
                                                            <button
                                                                onClick={() => openCustomerDrawer(c.id)}
                                                                title="View Customer Chronology"
                                                                className="p-2 rounded-xl bg-cream-100 text-espresso-700 hover:bg-espresso-900 hover:text-white transition cursor-pointer"
                                                            >
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Customer Detail Drawer */}
            {selectedCustomerId && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end transition-opacity"
                    onClick={closeCustomerDrawer}
                >
                    <div
                        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-cream-200 bg-cream-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-terracotta-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                                    {customerDetail
                                        ? getInitials(customerDetail.customer.name, customerDetail.customer.phone)
                                        : "..."}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-espresso-950">
                                            {customerDetail?.customer.name || "Customer Profile"}
                                        </h2>
                                        {customerDetail && renderTierBadge(customerDetail.customer.tier)}
                                    </div>
                                    <div className="text-xs text-espresso-600 font-mono mt-0.5">
                                        {customerDetail ? formatDisplayPhone(customerDetail.customer.phone) : ""}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={closeCustomerDrawer}
                                className="p-2 rounded-xl text-espresso-400 hover:text-espresso-700 hover:bg-cream-200 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {drawerLoading ? (
                                <div className="py-16 text-center">
                                    <RefreshCw className="w-8 h-8 text-terracotta-500 animate-spin mx-auto mb-3" />
                                    <p className="text-sm font-bold text-espresso-700">Loading diner profile & orders...</p>
                                </div>
                            ) : customerDetail ? (
                                <>
                                    {/* Stats Summary Strip */}
                                    <div className="grid grid-cols-3 gap-3 p-4 bg-cream-100/70 rounded-2xl border border-cream-200">
                                        <div className="text-center">
                                            <div className="text-xs text-espresso-500 font-bold uppercase tracking-wider">
                                                Total Visits
                                            </div>
                                            <div className="text-xl font-black text-espresso-950 mt-1">
                                                {customerDetail.customer.total_orders}
                                            </div>
                                        </div>
                                        <div className="text-center border-x border-cream-300">
                                            <div className="text-xs text-espresso-500 font-bold uppercase tracking-wider">
                                                Total Spend
                                            </div>
                                            <div className="text-xl font-black text-terracotta-600 mt-1">
                                                {formatRupees(customerDetail.customer.total_spent_paise, false)}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-espresso-500 font-bold uppercase tracking-wider">
                                                Avg Order (AOV)
                                            </div>
                                            <div className="text-xl font-black text-espresso-950 mt-1">
                                                {customerDetail.customer.total_orders > 0
                                                    ? formatRupees(
                                                          Math.round(
                                                              customerDetail.customer.total_spent_paise /
                                                                  customerDetail.customer.total_orders
                                                          ),
                                                          false
                                                      )
                                                    : "₹0"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Registration Info */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500">
                                            Account Details
                                        </h3>
                                        <div className="bg-white border border-cream-200 rounded-2xl p-4 space-y-2.5 text-xs text-espresso-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-espresso-500 flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5" /> Mobile:
                                                </span>
                                                <span className="font-mono font-bold text-espresso-950">
                                                    {formatDisplayPhone(customerDetail.customer.phone)}
                                                </span>
                                            </div>
                                            {customerDetail.customer.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-espresso-500 flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" /> Email:
                                                    </span>
                                                    <span className="font-semibold text-espresso-950">
                                                        {customerDetail.customer.email}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-espresso-500 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" /> Member Since:
                                                </span>
                                                <span className="font-semibold text-espresso-950">
                                                    {customerDetail.customer.created_at
                                                        ? formatDateTime(customerDetail.customer.created_at)
                                                        : "Unknown"}
                                                </span>
                                            </div>
                                            {customerDetail.customer.last_order_at && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-espresso-500 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" /> Last Order:
                                                    </span>
                                                    <span className="font-semibold text-espresso-950">
                                                        {formatRelativeTime(customerDetail.customer.last_order_at)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Saved Addresses */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500">
                                                Saved Delivery Addresses ({customerDetail.addresses.length})
                                            </h3>
                                        </div>
                                        {customerDetail.addresses.length === 0 ? (
                                            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 text-center text-xs text-espresso-500 italic">
                                                No saved delivery addresses registered
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {customerDetail.addresses.map((addr) => (
                                                    <div
                                                        key={addr.id}
                                                        className="p-3.5 bg-white border border-cream-200 rounded-xl text-xs space-y-1"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-espresso-900 flex items-center gap-1.5">
                                                                <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
                                                                {addr.label}
                                                            </span>
                                                            {addr.is_default && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-terracotta-50 text-terracotta-700 border border-terracotta-200">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-espresso-700">{addr.address_line}</p>
                                                        {addr.landmark && (
                                                            <p className="text-[11px] text-espresso-400">
                                                                Landmark: {addr.landmark}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Chronology */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-espresso-500">
                                                Order History ({customerDetail.orders.length})
                                            </h3>
                                        </div>

                                        {customerDetail.orders.length === 0 ? (
                                            <div className="p-6 bg-cream-50 rounded-2xl border border-cream-200 text-center text-xs text-espresso-500 italic">
                                                No orders recorded for this customer yet.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {customerDetail.orders.map((o) => (
                                                    <div
                                                        key={o.id}
                                                        className="bg-white border border-cream-200 rounded-2xl p-4 shadow-2xs space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-xs text-espresso-950 font-mono">
                                                                    #{o.order_number}
                                                                </span>
                                                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cream-100 text-espresso-700">
                                                                    {o.order_type.replace("_", " ")}
                                                                </span>
                                                            </div>
                                                            <OrderStatusBadge status={o.status} />
                                                        </div>

                                                        <div className="text-[11px] text-espresso-500 flex items-center justify-between">
                                                            <span>
                                                                {o.created_at ? formatDateTime(o.created_at) : ""}
                                                            </span>
                                                            <span className="capitalize">
                                                                Payment: {o.payment_method} ({o.payment_status})
                                                            </span>
                                                        </div>

                                                        {/* Items Summary */}
                                                        <div className="bg-cream-50/80 rounded-xl p-2.5 space-y-1.5">
                                                            {o.items.map((it) => (
                                                                <div
                                                                    key={it.id}
                                                                    className="flex items-center justify-between text-xs text-espresso-800"
                                                                >
                                                                    <div className="truncate pr-2">
                                                                        <span className="font-bold">{it.qty}x</span>{" "}
                                                                        <span>{it.item_name}</span>
                                                                        {it.variant_name && (
                                                                            <span className="text-espresso-500 text-[11px] ml-1">
                                                                                ({it.variant_name})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="font-semibold text-espresso-900 shrink-0">
                                                                        {formatRupees(it.total_price_paise)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Order Total */}
                                                        <div className="flex items-center justify-between pt-1 border-t border-cream-100 text-xs">
                                                            <span className="font-bold text-espresso-600">Total Billed</span>
                                                            <span className="font-black text-sm text-espresso-950">
                                                                {formatRupees(o.total_paise)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Drawer Footer Actions */}
                        {customerDetail && (
                            <div className="p-4 border-t border-cream-200 bg-cream-50 flex items-center justify-between gap-3">
                                <a
                                    href={`tel:+91${customerDetail.customer.phone}`}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-cream-300 text-xs font-bold text-espresso-900 hover:bg-cream-100 transition shadow-2xs"
                                >
                                    <Phone className="w-4 h-4 text-emerald-600" />
                                    Call Diner
                                </a>
                                <a
                                    href={`https://wa.me/91${customerDetail.customer.phone}?text=${encodeURIComponent(
                                        `Hello ${customerDetail.customer.name || "valued customer"}, greetings from Surya Family Restaurant Kadiri! How may we assist you today?`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
