"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Radio,
    Smartphone,
    Calendar,
    Bell,
    Building2,
    ChevronDown,
    Menu,
    X,
    LayoutDashboard,
    ChefHat,
    Utensils,
    QrCode,
    Package,
    CreditCard,
    BarChart3,
    History,
    Settings,
    LogOut,
    Shield,
    User,
    Users,
    Cloud,
    Database,
    RefreshCw,
    CheckCircle2,
    HardDrive,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useOutlet, OutletInfo } from "@/context/OutletContext";
import { AdminBranchSwitchModal } from "@/components/admin/AdminBranchSwitchModal";
import { api } from "@/lib/api";

interface AdminHeaderProps {
    wsConnected: boolean;
    pendingServiceCalls: any[];
    onAttendServiceCall: (id: number) => void;
}

export function AdminHeader({
    wsConnected,
    pendingServiceCalls,
    onAttendServiceCall,
}: AdminHeaderProps) {
    const pathname = usePathname();
    const { user, isOwner, logout } = useAuth();
    const { t } = useLanguage();
    const { outlet, allOutlets, switchBranch } = useOutlet();
    const toast = useToast();
    const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [selectedTargetBranch, setSelectedTargetBranch] = useState<OutletInfo | null>(null);
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<any>(null);
    const [syncPopoverOpen, setSyncPopoverOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshSyncStatus = async () => {
        try {
            const data = await api.getHybridSyncStatus();
            setSyncStatus(data);
        } catch {
            // Standalone or offline fallback
        }
    };

    React.useEffect(() => {
        refreshSyncStatus();
        const interval = setInterval(refreshSyncStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleTriggerSync = async () => {
        setIsSyncing(true);
        try {
            const res = await api.triggerHybridSync();
            toast.success(res.message || "Cloud synchronization complete!");
            await refreshSyncStatus();
        } catch (err: any) {
            toast.error(err.message || "Sync failed. Local data remains safely buffered.");
        } finally {
            setIsSyncing(false);
        }
    };

    const pendingCount = pendingServiceCalls.length;
    const isBranch2 = outlet?.id === 2 || (outlet?.name || "").includes("Cafe");

    const navLinks = [
        { href: "/admin", labelKey: "live_orders", icon: LayoutDashboard, exact: true },
        { href: "/admin/pos", labelKey: "cashier_pos", icon: CreditCard },
        { href: "/captain", labelKey: "captain_pos", icon: Smartphone },
        { href: "/admin/kds", labelKey: "kds_view", icon: ChefHat },
        { href: "/admin/menu", labelKey: "menu_management", icon: Utensils },
        { href: "/admin/tables", labelKey: "tables_qr", icon: QrCode },
        { href: "/admin/reservations", labelKey: "table_reservations", icon: Calendar },
        { href: "/admin/customers", labelKey: "customers_crm", icon: Users },
        { href: "/admin/stock", labelKey: "inventory_stock", icon: Package },
        { href: "/admin/payments", labelKey: "payments_cashier", icon: CreditCard },
        { href: "/admin/analytics", labelKey: "sales_analytics", icon: BarChart3 },
        { href: "/admin/audit", labelKey: "audit_log", icon: History },
        { href: "/admin/settings", labelKey: "store_settings", icon: Settings },
    ];

    const isActive = (href: string, exact = false) => {
        if (exact) return pathname === href || pathname === "/admin/orders";
        return pathname.startsWith(href);
    };

    return (
        <>
            <header className="bg-white border-b border-cream-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mobile Hamburger Button */}
                    <button
                        onClick={() => setMobileDrawerOpen(true)}
                        className="md:hidden p-2 rounded-xl text-espresso-700 hover:bg-cream-100 transition cursor-pointer"
                        aria-label="Open Navigation Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Branch Badge / Switcher (Admin-Only Password Protected) */}
                    <div className="relative">
                        <button
                            onClick={() => isOwner && allOutlets.length > 1 && setBranchDropdownOpen(!branchDropdownOpen)}
                            disabled={!isOwner}
                            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-left ${
                                isBranch2
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                    : "bg-amber-50 border-amber-300 text-amber-950"
                            } ${isOwner && allOutlets.length > 1 ? "cursor-pointer hover:shadow-xs" : "cursor-default opacity-95"}`}
                            title={isOwner ? "Click to switch branch (Admin Password Required)" : "Assigned Branch"}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${isBranch2 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse shrink-0`} />
                            <div className="flex flex-col">
                                <span className="text-xs font-black tracking-wide max-w-[140px] sm:max-w-[220px] truncate">
                                    {outlet?.name || "Surya Family Restaurant"}
                                </span>
                                {!isOwner && (
                                    <span className="text-[9px] font-bold text-espresso-500 uppercase tracking-tighter">
                                        Assigned Branch
                                    </span>
                                )}
                            </div>
                            {isOwner && allOutlets.length > 1 && (
                                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5 shrink-0" />
                            )}
                        </button>

                        {/* Admin Branch Switcher Dropdown */}
                        {isOwner && branchDropdownOpen && allOutlets.length > 1 && (
                            <div className="absolute top-full left-0 mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-cream-200 shadow-xl p-2 z-50 animate-in fade-in">
                                <p className="text-[10px] font-black uppercase tracking-wider text-espresso-400 px-2 py-1 flex items-center justify-between">
                                    <span>Switch Active Branch</span>
                                    <Shield className="w-3 h-3 text-amber-500" />
                                </p>
                                {allOutlets.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => {
                                            if (outlet?.id !== b.id) {
                                                setSelectedTargetBranch(b);
                                                setSwitchModalOpen(true);
                                            }
                                            setBranchDropdownOpen(false);
                                        }}
                                        className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition cursor-pointer ${
                                            outlet?.id === b.id
                                                ? "bg-terracotta-50 border border-terracotta-200 text-terracotta-900 font-bold"
                                                : "hover:bg-cream-50 text-espresso-800"
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold truncate">{b.name}</p>
                                                {outlet?.id === b.id && (
                                                    <span className="text-[9px] bg-terracotta-200 text-terracotta-950 font-black px-1.5 py-0.5 rounded-md">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-espresso-500 line-clamp-1">{b.address}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* WebSocket Status */}
                    <div
                        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            wsConnected
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-saffron-50 border-saffron-300 text-saffron-800"
                        }`}
                    >
                        <Radio className={`w-3 h-3 ${wsConnected ? "animate-pulse text-emerald-600" : "text-saffron-600"}`} />
                        <span>{wsConnected ? "Socket Active" : "Connecting..."}</span>
                    </div>

                    {/* Zero-Cost Hybrid Cloud Sync Status & Popover */}
                    <div className="relative">
                        <button
                            onClick={() => setSyncPopoverOpen(!syncPopoverOpen)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                syncStatus?.cloud_connected
                                    ? "bg-sky-50 border-sky-300 text-sky-950 hover:bg-sky-100"
                                    : "bg-cream-100 border-cream-300 text-espresso-900 hover:bg-cream-200"
                            }`}
                            title="Zero-Cost Hybrid Cloud Sync Status"
                        >
                            {syncStatus?.cloud_connected ? (
                                <Cloud className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
                            ) : (
                                <HardDrive className="w-3.5 h-3.5 text-espresso-600 shrink-0" />
                            )}
                            <span className="hidden sm:inline">
                                {syncStatus?.cloud_connected ? "Hybrid: Cloud Active" : "Hybrid: Local-First"}
                            </span>
                            <span className="sm:hidden">
                                {syncStatus?.cloud_connected ? "Cloud" : "Local"}
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-1.5 py-0.2 rounded-md">
                                ₹0/mo
                            </span>
                        </button>

                        {/* Hybrid Sync Popover Dropdown */}
                        {syncPopoverOpen && (
                            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-80 bg-white rounded-2xl border border-cream-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between pb-2.5 border-b border-cream-100 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-espresso-950">Zero-Cost Hybrid Sync</h4>
                                            <p className="text-[10px] text-espresso-500 font-medium">Local-First Floor + Free Cloud Backup</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSyncPopoverOpen(false)}
                                        className="text-espresso-400 hover:text-espresso-700 p-1 rounded-md cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-cream-50 border border-cream-200">
                                        <span className="text-espresso-600 font-medium">Architecture Mode</span>
                                        <span className="font-extrabold text-espresso-900 text-right">
                                            {syncStatus?.cloud_connected ? "Active Dual Sync" : "Local Standalone (₹0)"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                                        <span className="text-emerald-950 font-medium">Monthly Cloud Cost</span>
                                        <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                            ₹0.00 (Zero Cost)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="p-2 rounded-xl bg-cream-50 border border-cream-200 text-center">
                                            <p className="text-[10px] text-espresso-500 uppercase font-bold">Unsynced Orders</p>
                                            <p className="text-base font-black text-terracotta-600">
                                                {syncStatus?.pending_orders ?? 0}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-cream-50 border border-cream-200 text-center">
                                            <p className="text-[10px] text-espresso-500 uppercase font-bold">Total Orders</p>
                                            <p className="text-base font-black text-espresso-900">
                                                {syncStatus?.total_orders ?? 0}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-espresso-500 leading-tight pt-1">
                                        🛡️ <strong>Zero Internet Downtime:</strong> Counter billing &amp; KDS always run locally with 0 latency. Orders automatically replicate to free Supabase PostgreSQL whenever internet is available.
                                    </p>
                                </div>

                                <div className="mt-3.5 pt-3 border-t border-cream-100 flex items-center justify-between gap-2">
                                    <button
                                        onClick={refreshSyncStatus}
                                        className="p-2 text-espresso-500 hover:text-espresso-800 hover:bg-cream-100 rounded-xl transition cursor-pointer"
                                        title="Refresh status"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        onClick={handleTriggerSync}
                                        disabled={isSyncing}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                        <span>{isSyncing ? "Syncing..." : "Sync to Cloud Now"}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Pending Service Calls Banner Button */}
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-300 text-red-900 text-xs font-extrabold animate-bounce shadow-xs">
                            <Bell className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>{pendingCount}</span>
                        </div>
                    )}

                    {/* Language Switcher */}
                    <LanguageToggle />

                    {/* Role Pill */}
                    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wider uppercase border border-cream-300 bg-cream-100 text-espresso-800">
                        <span>{isOwner ? "Owner Cockpit" : "Staff Portal"}</span>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-over Drawer */}
            {mobileDrawerOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileDrawerOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-72 max-w-[85vw] bg-espresso-950 text-white flex flex-col justify-between h-full p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
                        <div>
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-espresso-800 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <SuryaSunLogo size={32} />
                                    <div>
                                        <h3 className="font-extrabold text-sm text-white">{t("app_title")}</h3>
                                        <p className="text-[10px] text-terracotta-400 font-bold">{outlet?.name || "Admin"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileDrawerOpen(false)}
                                    className="p-1.5 rounded-lg text-espresso-400 hover:text-white hover:bg-espresso-900 transition cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Nav Items */}
                            <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
                                {navLinks.map((item) => {
                                    const active = isActive(item.href, item.exact);
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileDrawerOpen(false)}
                                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                active
                                                    ? "bg-terracotta-500 text-white shadow-md shadow-terracotta-500/30"
                                                    : "text-espresso-300 hover:bg-espresso-900 hover:text-white"
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-espresso-400"}`} />
                                            <span>{t(item.labelKey as any)}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Drawer Footer User Info & Logout */}
                        <div className="pt-4 border-t border-espresso-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-espresso-800 flex items-center justify-center text-xs font-bold">
                                        {isOwner ? <Shield className="w-4 h-4 text-saffron-400" /> : <User className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white truncate max-w-[120px]">{isOwner ? "Branch Admin" : "Floor Staff"}</p>
                                        <p className="text-[10px] text-espresso-400 uppercase">{user?.role || "Staff"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 rounded-xl text-red-400 hover:bg-red-950/50 hover:text-red-300 transition cursor-pointer"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Password Verification Branch Switch Modal */}
            <AdminBranchSwitchModal
                isOpen={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                targetBranch={selectedTargetBranch}
            />
        </>
    );
}
