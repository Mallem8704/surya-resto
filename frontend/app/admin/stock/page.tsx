"use client";

import { useOutlet } from "@/context/OutletContext";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Package,
    AlertTriangle,
    Plus,
    Minus,
    RefreshCw,
    History,
    TrendingDown,
    TrendingUp,
    ShieldAlert,
    CheckCircle2,
    Layers,
    X,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { StockBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";

export default function AdminStockManagementPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();
    const { outlet } = useOutlet();

    const [stockItems, setStockItems] = useState<any[]>([]);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [stockLogs, setStockLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Manual Adjust Modal
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any | null>(null);
    const [adjustQty, setAdjustQty] = useState<string>("50");
    const [adjustReason, setAdjustReason] = useState<string>("restock");
    const [adjustNotes, setAdjustNotes] = useState<string>("");
    const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchStockData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [overview, low, logs] = await Promise.all([
                api.getStockOverview(outlet?.id),
                api.getLowStockItems(outlet?.id),
                api.getStockLogs({ outlet_id: outlet?.id, limit: 50 }),
            ]);
            setStockItems(overview);
            setLowStockItems(low);
            setStockLogs(logs);
        } catch {
            toast.error("Failed to load inventory data");
        } finally {
            setIsLoading(false);
        }
    }, [toast, outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchStockData();
        }
    }, [isAuthenticated, fetchStockData]);

    const handleOpenAdjust = (item: any, defaultReason = "restock") => {
        setSelectedItemForAdjust(item);
        setAdjustReason(defaultReason);
        setAdjustQty(defaultReason === "restock" ? "50" : "5");
        setAdjustNotes("");
        setShowAdjustModal(true);
    };

    const handleSubmitAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemForAdjust || !adjustQty) return;

        const qtyNum = parseInt(adjustQty, 10);
        if (isNaN(qtyNum) || qtyNum === 0) {
            toast.error("Please enter a valid non-zero quantity");
            return;
        }

        // Make sure wastage is negative
        const delta = adjustReason === "wastage" ? -Math.abs(qtyNum) : Math.abs(qtyNum);

        setIsSubmittingAdjust(true);
        try {
            await api.adjustStockManual({
                item_id: selectedItemForAdjust.id,
                change_qty: delta,
                reason: adjustReason,
                notes: adjustNotes.trim() || undefined,
            });

            toast.success(
                `Stock updated for ${selectedItemForAdjust.name}: ${delta > 0 ? `+${delta}` : delta} units`
            );
            setShowAdjustModal(false);
            fetchStockData();
        } catch (err: any) {
            toast.error(err.message || "Failed to adjust stock");
        } finally {
            setIsSubmittingAdjust(false);
        }
    };

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
                            Inventory & Stock Management
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 text-espresso-800 font-bold">
                                {stockItems.length} Tracked Items
                            </span>
                        </h2>
                        <p className="text-xs text-espresso-600">
                            Real-time ingredient & item inventory tracking, low-stock threshold alerts, and restocking audit logs.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={fetchStockData}
                    >
                        Refresh Inventory
                    </Button>
                </div>

                {/* LOW STOCK ALERT BANNER */}
                {lowStockItems.length > 0 && (
                    <div className="p-4 bg-saffron-100 border-b border-saffron-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-saffron-700 shrink-0" />
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-saffron-950">
                                    Low Stock Alert ({lowStockItems.length} items critical)
                                </h4>
                                <p className="text-[11px] text-saffron-800">
                                    The following items are running below their minimum operating threshold:
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto">
                            {lowStockItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleOpenAdjust(item, "restock")}
                                    className="px-3 py-1 rounded-full bg-white border border-saffron-300 text-saffron-950 text-xs font-bold shadow-2xs hover:bg-saffron-50 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    <span>{item.name}:</span>
                                    <strong className="text-red-700">{item.stock_qty} left</strong>
                                    <span className="text-[10px] text-terracotta-600 underline ml-1">+Restock</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content: 2-Column Split (Stock Overview + Logs) */}
                <main className="flex-1 overflow-y-auto p-6 bg-cream-100 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Stock Levels Table */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-x-auto">
                            <div className="p-4 border-b border-cream-200 bg-cream-50/70 flex items-center justify-between">
                                <h3 className="font-extrabold text-espresso-950 text-sm">
                                    Item Stock Levels ({stockItems.length})
                                </h3>
                                <span className="text-xs text-espresso-500 font-medium">Automatic deduction on sales</span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-cream-200 bg-cream-50/40 text-espresso-600 font-extrabold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Item Name</th>
                                        <th className="py-3 px-4">Current Stock</th>
                                        <th className="py-3 px-4">Alert Threshold</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Quick Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cream-100">
                                    {stockItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-cream-50/50 transition">
                                            <td className="py-3.5 px-4 font-bold text-espresso-950">
                                                <div>{item.name}</div>
                                                {item.name_te && <div className="text-[11px] text-espresso-500 font-normal">{item.name_te}</div>}
                                            </td>

                                            <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-espresso-900">
                                                {item.stock_qty} units
                                            </td>

                                            <td className="py-3.5 px-4 text-espresso-600 font-medium">
                                                &le; {item.low_stock_threshold} units
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <StockBadge status={item.status} qty={item.stock_qty} />
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenAdjust(item, "restock")}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] transition cursor-pointer"
                                                    >
                                                        + Restock
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenAdjust(item, "wastage")}
                                                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 font-bold text-[11px] transition cursor-pointer"
                                                    >
                                                        - Wastage
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Col: Stock Transaction Logs */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden flex flex-col h-full">
                            <div className="p-4 border-b border-cream-200 bg-cream-50/70 flex items-center justify-between">
                                <h3 className="font-extrabold text-espresso-950 text-sm flex items-center gap-2">
                                    <History className="w-4 h-4 text-terracotta-500" />
                                    Stock Audit Trail
                                </h3>
                                <span className="text-[11px] text-espresso-500 font-semibold">{stockLogs.length} events</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[600px]">
                                {stockLogs.length === 0 ? (
                                    <div className="text-center py-12 text-espresso-400 text-xs">
                                        No stock transactions recorded yet.
                                    </div>
                                ) : (
                                    stockLogs.map((log) => {
                                        const isPositive = log.change_qty > 0;

                                        return (
                                            <div
                                                key={log.id}
                                                className="p-3 rounded-2xl border border-cream-200 bg-cream-50/40 text-xs flex flex-col gap-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-espresso-950">
                                                        {log.item_name || `Item #${log.item_id}`}
                                                    </span>
                                                    <span
                                                        className={`font-mono font-black px-2 py-0.5 rounded-md ${
                                                            isPositive
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {isPositive ? `+${log.change_qty}` : log.change_qty}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-espresso-500">
                                                    <span className="capitalize font-semibold text-espresso-700">
                                                        Reason: {log.reason}
                                                    </span>
                                                    <span>{formatRelativeTime(log.created_at)}</span>
                                                </div>

                                                {log.notes && (
                                                    <p className="text-[10px] text-espresso-600 italic bg-white p-1.5 rounded-lg border border-cream-200 mt-1">
                                                        "{log.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* MANUAL STOCK ADJUSTMENT MODAL */}
                {showAdjustModal && selectedItemForAdjust && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                                <h3 className="text-base font-bold text-espresso-950">Adjust Item Stock</h3>
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 text-xs">
                                <div className="text-espresso-500 font-semibold">Target Item:</div>
                                <div className="text-sm font-black text-espresso-950">{selectedItemForAdjust.name}</div>
                                <div className="text-[11px] text-espresso-600 mt-1">
                                    Current Stock: <strong>{selectedItemForAdjust.stock_qty} units</strong>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitAdjust} className="space-y-3.5 text-xs">
                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">Action / Reason</label>
                                    <select
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-cream-300 bg-white font-bold"
                                    >
                                        <option value="restock">Restock (Inward Delivery)</option>
                                        <option value="wastage">Wastage / Spoilage / Breakage</option>
                                        <option value="adjustment">Audit Inventory Adjustment</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">
                                        Quantity to {adjustReason === "wastage" ? "Deduct" : "Add"}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={adjustQty}
                                        onChange={(e) => setAdjustQty(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-extrabold text-espresso-950"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">Notes / Invoice Reference</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Morning fresh dairy delivery"
                                        value={adjustNotes}
                                        onChange={(e) => setAdjustNotes(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-cream-200">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setShowAdjustModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="flex-1"
                                        isLoading={isSubmittingAdjust}
                                    >
                                        Record Change
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
