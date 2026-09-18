"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ChefHat,
    Utensils,
    QrCode,
    Package,
    CreditCard,
    BarChart3,
    History,
    Coffee,
    LogOut,
    Shield,
    User,
    Settings,
    Smartphone,
    Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOutlet } from "@/context/OutletContext";
import { useLanguage } from "@/context/LanguageContext";
import { SuryaSunLogo } from "@/components/SuryaSunLogo";

export function AdminSidebar({ className = "" }: { className?: string }) {
    const pathname = usePathname();
    const { user, isOwner, logout } = useAuth();
    const { t } = useLanguage();
    const { outlet } = useOutlet();

    const navLinks = [
        { href: "/admin", labelKey: "live_orders", icon: LayoutDashboard, exact: true },
        { href: "/admin/pos", labelKey: "cashier_pos", icon: CreditCard },
        { href: "/captain", labelKey: "captain_pos", icon: Smartphone },
        { href: "/admin/kds", labelKey: "kds_view", icon: ChefHat },
        { href: "/admin/menu", labelKey: "menu_management", icon: Utensils },
        { href: "/admin/tables", labelKey: "tables_qr", icon: QrCode },
        { href: "/admin/reservations", labelKey: "table_reservations", icon: Calendar },
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
        <aside
            className={`hidden md:flex w-64 bg-espresso-950 text-white flex-col justify-between border-r border-espresso-800 shrink-0 ${className}`}
        >
            {/* Top Brand */}
            <div>
                <div className="p-4 border-b border-espresso-800 flex items-center gap-3">
                    <SuryaSunLogo size={36} />
                    <div>
                        <h2 className="font-extrabold text-sm tracking-tight text-white">{t("app_title")}</h2>
                        <span className="text-[10px] text-terracotta-400 font-bold uppercase tracking-wider block">
                            {outlet?.name || "Admin"} Cockpit
                        </span>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="p-3 space-y-1">
                    {navLinks.map((item) => {
                        const active = isActive(item.href, item.exact);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
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

            {/* Bottom User Info & Logout */}
            <div className="p-4 border-t border-espresso-800 bg-espresso-900/60">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-espresso-800 border border-espresso-700 flex items-center justify-center text-xs font-bold text-espresso-200 shrink-0">
                            {isOwner ? <Shield className="w-4 h-4 text-saffron-400" /> : <User className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">
                                {isOwner ? "Branch Admin" : "Floor Staff"}
                            </h4>
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-saffron-400">
                                {user?.role || "Staff"} &bull; B{user?.outlet_id === 56 || user?.outlet_id === 2 ? "2" : "1"}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        title="Sign Out"
                        className="p-1.5 rounded-lg text-espresso-400 hover:text-red-400 hover:bg-espresso-800 transition cursor-pointer"
                        aria-label="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-[10px] text-espresso-500 text-center font-medium truncate px-1">
                    {outlet?.name || "Surya Family Restaurant"} &bull; Kadiri
                </div>
            </div>
        </aside>
    );
}
