"use client";

import { useOutlet } from "@/context/OutletContext";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    History,
    Shield,
    User,
    RefreshCw,
    Search,
    Filter,
    FileText,
    Layers,
    Tag,
    Clock,
    X,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";

export default function AdminAuditLogPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();
    const { outlet } = useOutlet();

    const [logs, setLogs] = useState<any[]>([]);
    const [filterEntity, setFilterEntity] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedLogForDetails, setSelectedLogForDetails] = useState<any | null>(null);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchAuditLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getAuditLogs({
                outlet_id: outlet?.id,
                entity_type: filterEntity === "all" ? undefined : filterEntity,
                limit: 100,
            });
            setLogs(data);
        } catch {
            toast.error("Failed to load audit logs");
        } finally {
            setIsLoading(false);
        }
    }, [filterEntity, toast, outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAuditLogs();
        }
    }, [isAuthenticated, fetchAuditLogs]);

    const filteredLogs = logs.filter((l) => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const mAction = l.action?.toLowerCase().includes(q) ?? false;
            const mEntity = l.entity_type?.toLowerCase().includes(q) ?? false;
            const mUser = l.user_name?.toLowerCase().includes(q) ?? false;
            const mDetails = (l.details_json || l.details || "")?.toLowerCase().includes(q) ?? false;
            if (!mAction && !mEntity && !mUser && !mDetails) return false;
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
                            <History className="w-5 h-5 text-terracotta-500" />
                            System Audit Logs & Staff Attribution
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 text-espresso-800 font-bold">
                                {logs.length} Recorded Mutations
                            </span>
                        </h2>
                        <p className="text-xs text-espresso-600">
                            Immutable audit trail of every price change, stock adjustment, order cancellation, and table mutation.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={fetchAuditLogs}
                    >
                        Refresh Logs
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="p-6 pb-2 bg-cream-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by user, action, item, or details..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 bg-white text-xs placeholder:text-espresso-400 focus:outline-none focus:border-terracotta-500"
                        />
                    </div>

                    {/* Entity Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                        {["all", "menu_item", "stock", "order", "table", "category"].map((ent) => (
                            <button
                                key={ent}
                                onClick={() => setFilterEntity(ent)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition cursor-pointer ${
                                    filterEntity === ent
                                        ? "bg-terracotta-500 text-white shadow-2xs"
                                        : "bg-white border border-cream-300 text-espresso-800 hover:bg-cream-100"
                                }`}
                            >
                                {ent === "all" ? "All Entities" : ent.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Audit Logs Table */}
                <main className="flex-1 overflow-y-auto p-6 bg-cream-100">
                    <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-cream-200 bg-cream-50/70 text-espresso-600 font-extrabold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Log ID</th>
                                    <th className="py-3.5 px-4">Timestamp</th>
                                    <th className="py-3.5 px-4">Staff / User Attribution</th>
                                    <th className="py-3.5 px-4">Action</th>
                                    <th className="py-3.5 px-4">Entity Type & ID</th>
                                    <th className="py-3.5 px-4">Mutation Details / Diff</th>
                                    <th className="py-3.5 px-4 text-right">Raw</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-espresso-400">
                                            No audit log entries match your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-cream-50/50 transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-espresso-900">
                                                #{log.id}
                                            </td>

                                            <td className="py-3.5 px-4 text-espresso-700 whitespace-nowrap">
                                                <div className="font-semibold">{formatDateTime(log.created_at)}</div>
                                                <span className="text-[10px] text-espresso-400">
                                                    {formatRelativeTime(log.created_at)}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 font-bold text-espresso-950">
                                                    <User className="w-3.5 h-3.5 text-terracotta-500" />
                                                    <span>{log.user_name || `User #${log.user_id}`}</span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className="px-2.5 py-1 rounded-md bg-espresso-900 text-white font-mono font-bold text-[10px] uppercase tracking-wide">
                                                    {log.action}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 font-semibold text-espresso-800">
                                                <span className="capitalize">{log.entity_type}</span>{" "}
                                                <span className="text-espresso-400">#{log.entity_id}</span>
                                            </td>

                                            <td className="py-3.5 px-4 text-espresso-700 max-w-sm">
                                                <p className="line-clamp-2 leading-relaxed font-mono text-[11px]">
                                                    {log.details_json || log.details || "—"}
                                                </p>
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => setSelectedLogForDetails(log)}
                                                    className="p-1.5 rounded-lg text-terracotta-600 hover:bg-terracotta-50 transition cursor-pointer"
                                                    title="View Full Payload"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* DETAILS MODAL */}
                {selectedLogForDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-cream-300 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                                <h3 className="text-base font-bold text-espresso-950">
                                    Audit Mutation #{selectedLogForDetails.id}
                                </h3>
                                <button
                                    onClick={() => setSelectedLogForDetails(null)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 text-xs text-espresso-800">
                                <div className="flex justify-between">
                                    <span className="text-espresso-500 font-semibold">User:</span>
                                    <strong className="text-espresso-950">{selectedLogForDetails.user_name}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-espresso-500 font-semibold">Action:</span>
                                    <span className="font-mono font-bold bg-cream-200 px-2 py-0.5 rounded">
                                        {selectedLogForDetails.action}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-espresso-500 font-semibold">Entity:</span>
                                    <span>{selectedLogForDetails.entity_type} #{selectedLogForDetails.entity_id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-espresso-500 font-semibold">Timestamp:</span>
                                    <span>{formatDateTime(selectedLogForDetails.created_at)}</span>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[11px] font-bold text-espresso-500 uppercase tracking-wider mb-1">
                                        Details / Diff Payload
                                    </label>
                                    <div className="p-3 rounded-xl bg-espresso-950 text-cream-100 font-mono text-xs overflow-x-auto">
                                        {selectedLogForDetails.details_json || selectedLogForDetails.details || "No details"}
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                size="sm"
                                className="w-full"
                                onClick={() => setSelectedLogForDetails(null)}
                            >
                                Close Log
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
