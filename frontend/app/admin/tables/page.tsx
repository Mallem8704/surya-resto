"use client";

import { TableQRBatchModal } from "@/components/admin/TableQRBatchModal";


import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    QrCode,
    Plus,
    Printer,
    Coffee,
    CheckCircle2,
    Users,
    Edit2,
    Trash2,
    ExternalLink,
    X,
    Clock,
    AlertCircle,
    Check,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { useOutlet } from "@/context/OutletContext";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { useAdminSocket } from "@/hooks/useSockets";

export default function AdminTablesPage() {
    const { isAuthenticated, isLoading: authLoading, isOwner } = useAuth();
    const { outlet } = useOutlet();
    const toast = useToast();
    const router = useRouter();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();

    const [tables, setTables] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [selectedTableForQr, setSelectedTableForQr] = useState<any | null>(null);
    const [isQRBatchModalOpen, setIsQRBatchModalOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTableLabel, setNewTableLabel] = useState("");
    const [editingTable, setEditingTable] = useState<any | null>(null);
    const [editTableLabel, setEditTableLabel] = useState("");
    const [editTableStatus, setEditTableStatus] = useState("free");
    const [deletingTable, setDeletingTable] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [qrTargetDomain, setQrTargetDomain] = useState("https://arabic-restaurant-dineos.vercel.app");

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchTables = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getTables(outlet?.id || 1);
            setTables(data);
        } catch {
            toast.error("Failed to load tables");
        } finally {
            setIsLoading(false);
        }
    }, [toast, outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTables();
        }
    }, [isAuthenticated, fetchTables]);

    // WebSocket real-time live sync for table state
    useAdminSocket(outlet?.id || 1, (event) => {
        if (event.event === "table_created" && event.data) {
            setTables((prev) => {
                if (prev.some((t) => t.id === event.data.id)) return prev;
                return [...prev, event.data];
            });
        } else if (event.event === "table_updated" && event.data) {
            setTables((prev) =>
                prev.map((t) => (t.id === event.data.id ? { ...t, ...event.data } : t))
            );
        } else if (event.event === "table_deleted" && event.data) {
            setTables((prev) => prev.filter((t) => t.id !== event.data.id));
        } else if (event.event === "new_order" && event.data) {
            setTables((prev) =>
                prev.map((t) =>
                    t.id === event.data.table_id
                        ? { ...t, status: "occupied", active_order_id: event.data.id }
                        : t
                )
            );
        } else if (event.event === "order_status_updated" && event.data) {
            if (event.data.status === "served" || event.data.status === "cancelled") {
                setTables((prev) =>
                    prev.map((t) =>
                        t.active_order_id === event.data.id
                            ? { ...t, status: "free", active_order_id: null }
                            : t
                    )
                );
            }
        }
    });

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        const labelClean = newTableLabel.trim().toUpperCase();
        if (!labelClean) return;

        if (tables.some((t) => t.label.toUpperCase() === labelClean)) {
            toast.error(`Table '${labelClean}' already exists.`);
            return;
        }

        setIsActionLoading(true);
        try {
            const created = await api.createTable({ label: labelClean });
            setTables((prev) => [...prev, created]);
            setNewTableLabel("");
            setShowAddModal(false);
            toast.success(`Created Table ${created.label}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to create table");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleOpenEdit = (table: any) => {
        setEditingTable(table);
        setEditTableLabel(table.label);
        setEditTableStatus(table.status || "free");
    };

    const handleUpdateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTable) return;
        const labelClean = editTableLabel.trim().toUpperCase();
        if (!labelClean) return;

        if (
            tables.some(
                (t) => t.id !== editingTable.id && t.label.toUpperCase() === labelClean
            )
        ) {
            toast.error(`Table '${labelClean}' already exists.`);
            return;
        }

        setIsActionLoading(true);
        try {
            const updated = await api.updateTable(editingTable.id, {
                label: labelClean,
                status: editTableStatus,
            });
            setTables((prev) =>
                prev.map((t) => (t.id === editingTable.id ? { ...t, ...updated } : t))
            );
            setEditingTable(null);
            toast.success(`Updated Table ${updated.label}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update table");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteTable = async () => {
        if (!deletingTable) return;
        setIsActionLoading(true);
        try {
            await api.deleteTable(deletingTable.id);
            setTables((prev) => prev.filter((t) => t.id !== deletingTable.id));
            toast.success(`Table ${deletingTable.label} deleted`);
            setDeletingTable(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete table");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (table: any) => {
        const nextStatus = table.status === "free" ? "occupied" : "free";
        try {
            const updated = await api.updateTableStatus(table.id, nextStatus);
            setTables((prev) =>
                prev.map((t) => (t.id === table.id ? { ...t, status: updated.status } : t))
            );
            toast.success(`Table ${table.label} marked as ${nextStatus.toUpperCase()}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update table status");
        }
    };

    const handlePrint = () => {
        window.print();
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
                            Tables & QR Code Generator
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 text-espresso-800 font-bold">
                                {tables.length} Tables Active
                            </span>
                        </h2>
                        <p className="text-xs text-espresso-600">
                            Table occupancy control, dynamic QR generation & high-resolution printable table stand cards.
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <Button
                            variant="secondary"
                            size="md"
                            leftIcon={<QrCode className="w-4 h-4" />}
                            onClick={() => setIsQRBatchModalOpen(true)}
                        >
                            Batch Print QR Standees
                        </Button>

                        <a
                            href={outlet?.id === 2 ? "/Arabieq_Branch2_Table_QR_Stands.pdf" : "/Arabieq_Branch1_Table_QR_Stands.pdf"}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream-200 hover:bg-cream-300 text-espresso-900 font-bold text-xs border border-cream-300 transition-all shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5 text-espresso-700" />
                            Download QR Standees (PDF)
                        </a>

                        <Button
                            variant="primary"
                            size="md"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => setShowAddModal(true)}
                        >
                            Add New Table
                        </Button>
                    </div>
                </div>

                {/* Table Grid */}
                <main className="flex-1 overflow-y-auto p-6 bg-cream-100">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                <div
                                    key={n}
                                    className="h-64 bg-cream-200/60 rounded-3xl animate-pulse"
                                />
                            ))}
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-cream-300 p-8">
                            <Coffee className="w-12 h-12 text-espresso-300 mx-auto mb-3" />
                            <h3 className="font-extrabold text-espresso-900 text-lg mb-1">
                                No Cafe Tables Found
                            </h3>
                            <p className="text-sm text-espresso-600 mb-4">
                                Create your first table to generate dine-in QR codes.
                            </p>
                            <Button
                                variant="primary"
                                size="md"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setShowAddModal(true)}
                            >
                                Add Table
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {tables.map((table) => {
                                const qrUrl = api.getTableQrUrl(table.id);
                                const isFree = table.status === "free";

                                return (
                                    <div
                                        key={table.id}
                                        className="bg-white rounded-3xl p-5 border border-cream-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            {/* Table Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-2xl bg-espresso-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
                                                        {table.label}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-extrabold text-espresso-950 text-sm">
                                                            Table {table.label}
                                                        </h3>
                                                        <span className="text-[11px] text-espresso-500 font-medium">
                                                            {outlet?.name || "Cafe"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Status Badge Toggle */}
                                                <button
                                                    onClick={() => handleToggleStatus(table)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border transition cursor-pointer ${
                                                        isFree
                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                                            : "bg-saffron-50 border-saffron-300 text-saffron-900 hover:bg-saffron-100"
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${
                                                            isFree ? "bg-emerald-500" : "bg-saffron-500"
                                                        }`}
                                                    />
                                                    <span>{isFree ? "Free" : "Occupied"}</span>
                                                </button>
                                            </div>

                                            {/* QR Thumbnail Preview */}
                                            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 flex flex-col items-center justify-center mb-4">
                                                <img
                                                    src={qrUrl}
                                                    alt={`QR Code for Table ${table.label}`}
                                                    className="w-28 h-28 object-contain bg-white p-2 rounded-xl shadow-2xs border border-cream-200"
                                                />
                                                <span className="text-[10px] text-espresso-500 font-semibold mt-2">
                                                    /order?branch={outlet?.id || 1}&table={table.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-cream-100">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                                                onClick={() => setSelectedTableForQr(table)}
                                            >
                                                Print Stand
                                            </Button>

                                            <button
                                                onClick={() => handleOpenEdit(table)}
                                                className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-espresso-700 transition cursor-pointer"
                                                title="Edit Table"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            {isOwner && (
                                                <button
                                                    onClick={() => setDeletingTable(table)}
                                                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                                                    title="Delete Table"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <a
                                                href={`/order?branch=${outlet?.id || 1}&table=${table.label}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-espresso-700 transition"
                                                title="Open Customer View"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <TableQRBatchModal
                isOpen={isQRBatchModalOpen}
                onClose={() => setIsQRBatchModalOpen(false)}
                tables={tables}
            />
        </main>

                {/* ADD TABLE MODAL */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                                <h3 className="text-base font-bold text-espresso-950">Add Cafe Table</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTable} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-espresso-700 mb-1">
                                        Table Identifier / Label*
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. T9 or Patio-1"
                                        value={newTableLabel}
                                        onChange={(e) => setNewTableLabel(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-bold text-espresso-950 uppercase focus:outline-hidden focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="flex-1"
                                        disabled={isActionLoading}
                                    >
                                        {isActionLoading ? "Creating..." : "Create Table"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* EDIT TABLE MODAL */}
                {editingTable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                                <h3 className="text-base font-bold text-espresso-950">
                                    Edit Table {editingTable.label}
                                </h3>
                                <button
                                    onClick={() => setEditingTable(null)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateTable} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-espresso-700 mb-1">
                                        Table Identifier / Label*
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editTableLabel}
                                        onChange={(e) => setEditTableLabel(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-bold text-espresso-950 uppercase focus:outline-hidden focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-espresso-700 mb-1">
                                        Occupancy Status
                                    </label>
                                    <select
                                        value={editTableStatus}
                                        onChange={(e) => setEditTableStatus(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-semibold text-espresso-950 focus:outline-hidden focus:ring-2 focus:ring-terracotta-500"
                                    >
                                        <option value="free">Free (Available)</option>
                                        <option value="occupied">Occupied</option>
                                        <option value="reserved">Reserved</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setEditingTable(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="flex-1"
                                        disabled={isActionLoading}
                                    >
                                        {isActionLoading ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {deletingTable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-200 space-y-4">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-espresso-950">
                                    Delete Table {deletingTable.label}?
                                </h3>
                            </div>

                            <p className="text-xs text-espresso-600">
                                This will remove Table {deletingTable.label} and invalidate its QR code stand. Historical order receipts will be preserved.
                            </p>

                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setDeletingTable(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    className="flex-1"
                                    disabled={isActionLoading}
                                    onClick={handleDeleteTable}
                                >
                                    {isActionLoading ? "Deleting..." : "Delete Table"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PRINTABLE QR STAND CARD MODAL */}
                {selectedTableForQr && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/70 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] shadow-2xl border border-cream-300 overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="p-4 bg-cream-50 border-b border-cream-200 flex items-center justify-between no-print">
                                <div>
                                    <h3 className="text-sm font-bold text-espresso-950">Print Table Stand Card</h3>
                                    <p className="text-[11px] text-espresso-500">Select target domain for mobile scanning</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTableForQr(null)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-200 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Domain Selector Bar (No-Print) */}
                            <div className="p-3 bg-cream-100/70 border-b border-cream-200 no-print flex flex-col gap-1.5 text-xs">
                                <label className="font-bold text-espresso-800 text-[11px]">QR Scan Destination:</label>
                                <select
                                    value={qrTargetDomain}
                                    onChange={(e) => setQrTargetDomain(e.target.value)}
                                    className="w-full p-2 rounded-xl border border-cream-300 bg-white font-mono text-xs font-semibold"
                                >
                                    <option value="https://arabic-restaurant-dineos.vercel.app">
                                        Production (Vercel): https://arabic-restaurant-dineos.vercel.app
                                    </option>
                                    <option value="http://192.168.101.4:3000">
                                        Local Wi-Fi Network: http://192.168.101.4:3000
                                    </option>
                                    <option value="http://localhost:3000">
                                        Localhost (This PC only): http://localhost:3000
                                    </option>
                                </select>
                                <span className="text-[10px] text-espresso-500 font-mono">
                                    Encodes: {qrTargetDomain}/order?branch={outlet?.id || 1}&table={selectedTableForQr.label}
                                </span>
                            </div>

                            {/* PRINTABLE CARD CONTENT */}
                            <div id="printable-table-card" className="p-8 text-center bg-white space-y-4">
                                <div className="border-4 border-terracotta-500 rounded-3xl p-6 space-y-4 bg-cream-50/40">
                                    {/* Cafe Logo */}
                                    <div className="flex flex-col items-center">
                                        <img
                                            src="/logo.png"
                                            alt="Arabic Restaurant Logo"
                                            className="h-16 w-auto object-contain mx-auto mb-1"
                                        />
                                        <p className="text-[10px] text-espresso-600 font-bold uppercase tracking-wider">
                                            {outlet?.name || "Cafe"} &bull; Table Service
                                        </p>
                                    </div>

                                    {/* Table Identifier Badge */}
                                    <div className="py-2 px-6 rounded-2xl bg-espresso-950 text-white inline-block shadow-sm">
                                        <span className="text-lg font-black tracking-wider">
                                            TABLE {selectedTableForQr.label}
                                        </span>
                                    </div>

                                    {/* QR Code */}
                                    <div className="bg-white p-4 rounded-2xl border-2 border-cream-300 shadow-md inline-block">
                                        <img
                                            src={api.getTableQrUrl(selectedTableForQr.id, qrTargetDomain)}
                                            alt={`QR Code for Table ${selectedTableForQr.label}`}
                                            className="w-48 h-48 object-contain"
                                        />
                                    </div>

                                    {/* Instructional Footer */}
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-espresso-950">
                                            SCAN WITH CAMERA OR GOOGLE LENS
                                        </p>
                                        <p className="text-[11px] text-espresso-600 font-medium">
                                            View Menu &bull; Order &bull; Pay Online &bull; No App Needed
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-cream-200 flex items-center justify-center gap-2 text-[10px] text-espresso-500 font-bold">
                                        <span>UPI</span> &bull; <span>Google Pay</span> &bull; <span>PhonePe</span> &bull; <span>PayTM</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Controls */}
                            <div className="p-4 bg-cream-50 border-t border-cream-200 flex items-center justify-end gap-2 no-print">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedTableForQr(null)}
                                >
                                    Close
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Printer className="w-4 h-4" />}
                                    onClick={handlePrint}
                                >
                                    Print Stand Card
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
