"use client";

import React, { useState, useEffect } from "react";
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    Phone,
    User,
    CheckCircle2,
    XCircle,
    Utensils,
    Search,
    RefreshCw,
    Shield,
    Sparkles,
    ChevronDown,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useOutlet } from "@/context/OutletContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAdminSocket } from "@/hooks/useSockets";
import { soundManager } from "@/lib/sound";

export default function AdminReservationsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);
    const { outlet } = useOutlet();
    const { isOwner } = useAuth();
    const [selectedBranchId, setSelectedBranchId] = useState<number>(outlet?.id || 1);
    const toast = useToast();

    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterDate, setFilterDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // RBAC: Staff locked to assigned branch, owner can switch
    useEffect(() => {
        if (outlet?.id) {
            if (!isOwner) {
                setSelectedBranchId(outlet.id);
            } else {
                setSelectedBranchId(outlet.id);
            }
        }
    }, [outlet?.id, isOwner]);

    const fetchReservations = async () => {
        setIsLoading(true);
        try {
            const data = await api.getReservations({
                outlet_id: selectedBranchId,
                date: filterDate || undefined,
                status: filterStatus === "all" ? undefined : filterStatus,
            });
            setReservations(data);
        } catch (err: any) {
            toast.error("Failed to load table reservations");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, [selectedBranchId, filterStatus, filterDate]);

    // Live WebSocket connection scoped to the currently selected branch
    const { isConnected: wsConnected } = useAdminSocket(selectedBranchId, (event) => {
        if (event.event === "new_reservation" && event.data) {
            soundManager.playNewOrderChime();
            setReservations((prev) => [event.data, ...prev.filter((r) => r.id !== event.data.id)]);
            toast.success(`👑 New Table Pre-Booking: ${event.data.reservation_number} for ${event.data.customer_name} (${event.data.party_size} Guests)!`);
        } else if (event.event === "reservation_status_updated" && event.data) {
            setReservations((prev) =>
                prev.map((r) => (r.id === event.data.id ? { ...r, status: event.data.status, table_id: event.data.table_id, table_label: event.data.table_label } : r))
            );
        }
    });

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            await api.updateReservationStatus(id, { status: newStatus });
            toast.success(`Reservation marked as ${newStatus}`);
            fetchReservations();
        } catch (err: any) {
            toast.error("Failed to update reservation");
        }
    };

    const filtered = reservations.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.customer_name?.toLowerCase().includes(q) ||
            r.customer_phone?.includes(q) ||
            r.reservation_number?.toLowerCase().includes(q)
        );
    });

    const todayDate = new Date().toISOString().split("T")[0];
    const todayCount = reservations.filter((r) => r.reservation_date === todayDate).length;
    const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
    const seatedCount = reservations.filter((r) => r.status === "seated").length;

    return (
        <div className="flex min-h-screen bg-cream-50 font-sans text-espresso-950">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <AdminHeader
                    wsConnected={wsConnected}
                    pendingServiceCalls={[]}
                    onAttendServiceCall={() => {}}
                />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
                    {/* Branch Switcher & Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-serif font-black text-espresso-950">
                                    Table Pre-Bookings & VIP Reservations
                                </h1>
                            </div>
                            <p className="text-xs text-espresso-600 mt-1">
                                Complete data isolation between Branch 1 & Branch 2 table pre-bookings.
                            </p>
                        </div>

                        {/* Dual Branch Toggle — Owner only, Staff sees assigned badge */}
                        {isOwner ? (
                            <div className="grid grid-cols-2 gap-1.5 bg-white p-1.5 rounded-2xl border border-terracotta-200 shadow-xs w-full sm:w-auto">
                                <button
                                    onClick={() => setSelectedBranchId(1)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                        selectedBranchId === 1
                                            ? "bg-terracotta-600 text-white shadow-xs"
                                            : "text-espresso-700 hover:bg-cream-100"
                                    }`}
                                >
                                    <span>🏛️ Surya Family Restaurant (Kadiri)</span>
                                </button>
                                <button
                                    onClick={() => setSelectedBranchId(2)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                        selectedBranchId === 2
                                            ? "bg-terracotta-600 text-white shadow-xs"
                                            : "text-espresso-700 hover:bg-cream-100"
                                    }`}
                                >
                                    <span>🌟 Branch 2</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-terracotta-50 border border-terracotta-200 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
                                <span className="text-xs font-black text-espresso-900">
                                    {outlet?.name || (selectedBranchId === 1 ? "🏛️ Surya Family Restaurant (Kadiri)" : "🌟 Branch 2")}
                                </span>
                                <span className="text-[9px] font-bold text-espresso-500 uppercase tracking-wider">Assigned</span>
                            </div>
                        )}
                    </div>

                    {/* Stats Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-espresso-500">Today's Reservations</span>
                                <div className="text-2xl font-mono font-black text-espresso-900 mt-1">{todayCount}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-saffron-100 text-saffron-800 flex items-center justify-center font-bold">
                                <Calendar className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-espresso-500">Confirmed (Awaiting Guests)</span>
                                <div className="text-2xl font-mono font-black text-emerald-700 mt-1">{confirmedCount}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-espresso-500">Currently Seated</span>
                                <div className="text-2xl font-mono font-black text-blue-700 mt-1">{seatedCount}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                                <Utensils className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-espresso-400" />
                            <input
                                type="text"
                                placeholder="Search name, phone, pass #..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-cream-50 border border-terracotta-200 text-xs text-espresso-900 focus:outline-none focus:border-terracotta-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-cream-50 border border-terracotta-200 text-xs text-espresso-900 focus:outline-none font-mono"
                            />

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-cream-50 border border-terracotta-200 text-xs text-espresso-900 focus:outline-none font-bold"
                            >
                                <option value="all">All Statuses</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="seated">Seated</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Reservations Table */}
                    <div className="bg-white rounded-2xl border border-terracotta-100 shadow-xs overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 text-center text-espresso-500 text-xs">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-terracotta-600" />
                                Loading reservations...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center space-y-2">
                                <Calendar className="w-10 h-10 text-espresso-300 mx-auto" />
                                <h3 className="font-bold text-sm text-espresso-900">No Reservations Found</h3>
                                <p className="text-xs text-espresso-500">No table pre-bookings matching your search filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-cream-100/60 border-b border-terracotta-100 text-[10px] font-black uppercase text-espresso-500 tracking-wider">
                                        <tr>
                                            <th className="p-4">Pass / Ref</th>
                                            <th className="p-4">Guest Details</th>
                                            <th className="p-4">Schedule & Guests</th>
                                            <th className="p-4">Preference & Occasion</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-terracotta-50">
                                        {filtered.map((res) => (
                                            <tr key={res.id} className="hover:bg-cream-50/60 transition">
                                                <td className="p-4 font-mono font-bold text-terracotta-700">
                                                    {res.reservation_number}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-espresso-900">{res.customer_name}</div>
                                                    <div className="text-espresso-600 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                                                        <Phone className="w-3 h-3 text-terracotta-600" /> +91 {res.customer_phone}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-espresso-900 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-saffron-600" /> {res.reservation_date} at {res.reservation_time}
                                                    </div>
                                                    <div className="text-espresso-600 text-[11px] flex items-center gap-1 mt-0.5">
                                                        <Users className="w-3 h-3 text-terracotta-600" /> {res.party_size} Guests {res.table_label ? `(Table ${res.table_label})` : ""}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-espresso-900 capitalize">
                                                        {res.seating_preference.replace("_", " ")}
                                                    </div>
                                                    <div className="text-espresso-500 text-[10px] capitalize">
                                                        Occasion: {res.occasion || "Casual"}
                                                    </div>
                                                    {res.special_requests && (
                                                        <div className="text-[10px] text-terracotta-700 italic mt-0.5">
                                                            Note: "{res.special_requests}"
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        res.status === "confirmed"
                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                            : res.status === "seated"
                                                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                            : res.status === "completed"
                                                            ? "bg-gray-100 text-gray-800"
                                                            : "bg-red-100 text-red-800 border border-red-300"
                                                    }`}>
                                                        {res.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right space-x-1.5">
                                                    {res.status === "confirmed" && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(res.id, "seated")}
                                                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition cursor-pointer"
                                                        >
                                                            Mark Seated
                                                        </button>
                                                    )}
                                                    {res.status === "seated" && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(res.id, "completed")}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer"
                                                        >
                                                            Completed
                                                        </button>
                                                    )}
                                                    {res.status !== "cancelled" && res.status !== "completed" && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(res.id, "cancelled")}
                                                            className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[10px] transition cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
