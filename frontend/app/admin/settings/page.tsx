"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useOutlet } from "@/context/OutletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { 
    Settings, Store, MapPin, Phone, IndianRupee, Clock, Tag, Save, Shield, Sparkles, Plus, Trash2, Percent, CheckCircle2, Lock, Key, ShieldCheck 
} from "lucide-react";

export default function SettingsPage() {
    const { outlet, refreshOutlet, isLoading: outletLoading } = useOutlet();
    const { isAuthenticated, isLoading: authLoading, isOwner } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();
    
    // Coupons State
    const [coupons, setCoupons] = useState<any[]>([]);
    const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
    const [showNewCouponModal, setShowNewCouponModal] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        code: "",
        description: "",
        discount_type: "flat",
        discount_value: 50,
        min_order: 250,
        max_discount: 100,
        usage_limit: 100,
    });

    const fetchCoupons = async () => {
        setIsLoadingCoupons(true);
        try {
            const list = await api.getCoupons(outlet?.id);
            setCoupons(list);
        } catch {
            // Ignore error
        } finally {
            setIsLoadingCoupons(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, [outlet?.id]);

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCoupon.code.trim()) {
            toast.error("Please enter a valid coupon code");
            return;
        }

        try {
            await api.createCoupon({
                outlet_id: outlet?.id,
                code: newCoupon.code.trim().toUpperCase(),
                description: newCoupon.description.trim() || undefined,
                discount_type: newCoupon.discount_type,
                discount_value: newCoupon.discount_type === "flat" ? Math.round(newCoupon.discount_value * 100) : newCoupon.discount_value,
                min_order_paise: Math.round(newCoupon.min_order * 100),
                max_discount_paise: newCoupon.discount_type === "percent" ? Math.round(newCoupon.max_discount * 100) : undefined,
                usage_limit: newCoupon.usage_limit || undefined,
                is_active: true,
            });
            toast.success(`Coupon ${newCoupon.code.toUpperCase()} created successfully!`);
            setShowNewCouponModal(false);
            setNewCoupon({ code: "", description: "", discount_type: "flat", discount_value: 50, min_order: 250, max_discount: 100, usage_limit: 100 });
            fetchCoupons();
        } catch (err: any) {
            toast.error(err.message || "Failed to create coupon");
        }
    };

    const handleDeleteCoupon = async (id: number, code: string) => {
        if (!confirm(`Are you sure you want to deactivate coupon ${code}?`)) return;
        try {
            await api.deleteCoupon(id);
            toast.success(`Coupon ${code} deactivated.`);
            fetchCoupons();
        } catch (err: any) {
            toast.error(err.message || "Failed to deactivate coupon");
        }
    };

    // Password Security State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            toast.error("Please enter your current password");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await api.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success(res.message || "Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Failed to update password. Check current password.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        currency: "INR",
        tax_rate_percent: 5,
        opening_hours: "",
        tagline: "",
        gstin: "",
        fssai_license_number: "",
        upi_vpa: "",
    });

    useEffect(() => {
        if (outlet) {
            setFormData({
                name: outlet.name || "",
                address: outlet.address || "",
                phone: outlet.phone || "",
                currency: outlet.currency || "INR",
                tax_rate_percent: outlet.tax_rate_percent || 5,
                opening_hours: outlet.opening_hours || "",
                tagline: outlet.tagline || "",
                gstin: outlet.gstin || "",
                fssai_license_number: outlet.fssai_license_number || "",
                upi_vpa: outlet.upi_vpa || "",
            });
        }
    }, [outlet]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) {
            toast.error("Only owners can edit store settings");
            return;
        }

        setIsSaving(true);
        try {
            await api.updateOutlet(outlet?.id || 1, formData);
            await refreshOutlet();
            toast.success("Settings saved successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "tax_rate_percent" ? parseFloat(value) : value
        }));
    };

    return (
        <div className="flex h-screen bg-cream-50 overflow-hidden">
            <AdminSidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <AdminHeader 
                    wsConnected={wsConnected} 
                    pendingServiceCalls={pendingServiceCalls} 
                    onAttendServiceCall={handleAttendServiceCall} 
                />

                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-terracotta-100 text-terracotta-600 rounded-xl flex items-center justify-center shadow-inner">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-espresso-900">Store Settings</h1>
                                <p className="text-espresso-500 font-medium text-sm">Manage your cafe's core identity and operating details</p>
                            </div>
                        </div>

                        {!isOwner && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-amber-800">Read-Only Mode</h3>
                                    <p className="text-sm text-amber-700 mt-1">You are viewing these settings as staff. Only store owners can make changes here.</p>
                                </div>
                            </div>
                        )}

                        {outletLoading ? (
                            <div className="flex justify-center p-12">
                                <div className="w-8 h-8 border-4 border-terracotta-200 border-t-terracotta-500 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <form onSubmit={handleSave} className="space-y-6">
                                {/* Basic Info */}
                                <div className="bg-white rounded-2xl shadow-sm border border-espresso-100 overflow-hidden">
                                    <div className="bg-espresso-50 p-4 border-b border-espresso-100 flex items-center gap-2">
                                        <Store className="w-4 h-4 text-espresso-600" />
                                        <h2 className="font-bold text-espresso-800">Basic Information</h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Store Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Tagline</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Tag className="w-4 h-4 text-espresso-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="tagline"
                                                    value={formData.tagline}
                                                    onChange={handleChange}
                                                    disabled={!isOwner}
                                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Location */}
                                <div className="bg-white rounded-2xl shadow-sm border border-espresso-100 overflow-hidden">
                                    <div className="bg-espresso-50 p-4 border-b border-espresso-100 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-espresso-600" />
                                        <h2 className="font-bold text-espresso-800">Location & Contact</h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Phone Number</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="w-4 h-4 text-espresso-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    disabled={!isOwner}
                                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Opening Hours</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Clock className="w-4 h-4 text-espresso-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="opening_hours"
                                                    value={formData.opening_hours}
                                                    onChange={handleChange}
                                                    disabled={!isOwner}
                                                    placeholder="e.g. 6:00 AM - 10:00 PM"
                                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-bold text-espresso-800">Address</label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial */}
                                <div className="bg-white rounded-2xl shadow-sm border border-espresso-100 overflow-hidden">
                                    <div className="bg-espresso-50 p-4 border-b border-espresso-100 flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4 text-espresso-600" />
                                        <h2 className="font-bold text-espresso-800">Financial Settings</h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Currency</label>
                                            <select
                                                name="currency"
                                                value={formData.currency}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow bg-white"
                                            >
                                                <option value="INR">INR (₹)</option>
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">Tax Rate (%)</label>
                                            <input
                                                type="number"
                                                name="tax_rate_percent"
                                                value={formData.tax_rate_percent}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                min="0"
                                                step="0.1"
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Compliance & Payment Gateway */}
                                <div className="bg-white rounded-2xl shadow-sm border border-espresso-100 overflow-hidden">
                                    <div className="bg-espresso-50 p-4 border-b border-espresso-100 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-espresso-600" />
                                        <h2 className="font-bold text-espresso-800">Compliance & Digital Payments</h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">GSTIN (GST Number)</label>
                                            <input
                                                type="text"
                                                name="gstin"
                                                value={formData.gstin}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                placeholder="e.g. 37AAAAA0000A1Z5"
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow uppercase font-mono text-xs"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-espresso-800">FSSAI License No.</label>
                                            <input
                                                type="text"
                                                name="fssai_license_number"
                                                value={formData.fssai_license_number}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                placeholder="e.g. 10123999000123"
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow font-mono text-xs"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-espresso-800">Merchant UPI ID (VPA)</label>
                                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    0% Fee Direct Bank
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                name="upi_vpa"
                                                value={formData.upi_vpa}
                                                onChange={handleChange}
                                                disabled={!isOwner}
                                                placeholder="e.g. 9880358634@upi or surya@paytm"
                                                className="w-full px-4 py-2.5 rounded-xl border border-espresso-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow font-mono text-xs font-bold text-espresso-950"
                                            />
                                            <p className="text-[11px] text-espresso-500">
                                                Table Dynamic QRs and Thermal Bill QRs credit directly to this bank account instantly.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {isOwner && (
                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex items-center gap-2 bg-terracotta-600 hover:bg-terracotta-700 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-terracotta-600/20 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                                        >
                                            {isSaving ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Save className="w-5 h-5" />
                                            )}
                                            {isSaving ? "Saving..." : "Save Settings"}
                                        </button>
                                    </div>
                                )}
                            </form>

                            {/* PROMO CODES & DISCOUNT COUPON MANAGER */}
                            <div className="mt-10 bg-white rounded-2xl shadow-sm border border-espresso-100 overflow-hidden">
                                <div className="bg-espresso-50 p-4 border-b border-espresso-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-5 h-5 text-amber-600" />
                                        <h2 className="font-bold text-espresso-900">Promo Codes & Discount Coupons ({coupons.length})</h2>
                                    </div>
                                    {isOwner && (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewCouponModal(true)}
                                            className="px-3 py-1.5 rounded-xl bg-espresso-900 hover:bg-black text-amber-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Create Coupon</span>
                                        </button>
                                    )}
                                </div>

                                <div className="p-6">
                                    {coupons.length === 0 ? (
                                        <p className="text-sm text-espresso-400 text-center py-6">No promo codes created yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {coupons.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className={`p-4 rounded-2xl border flex flex-col justify-between transition ${
                                                        c.is_active
                                                            ? "bg-amber-50/50 border-amber-200"
                                                            : "bg-gray-50 border-gray-200 opacity-60"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-mono font-black text-sm tracking-wider">
                                                                {c.code}
                                                            </span>
                                                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                                                {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₹${(c.discount_value/100).toFixed(0)} FLAT OFF`}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-espresso-800 mb-1">{c.description || "Promo discount"}</p>
                                                        <div className="text-[11px] text-espresso-500 space-y-0.5">
                                                            <div>Min Order: ₹{(c.min_order_paise/100).toFixed(0)}</div>
                                                            {c.max_discount_paise && <div>Max Cap: ₹{(c.max_discount_paise/100).toFixed(0)}</div>}
                                                            <div>Times Used: <strong>{c.times_used}</strong> {c.usage_limit ? `/ ${c.usage_limit}` : ""}</div>
                                                        </div>
                                                    </div>

                                                    {isOwner && c.is_active && (
                                                        <div className="pt-3 mt-3 border-t border-amber-200/60 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCoupon(c.id, c.code)}
                                                                className="text-xs text-red-600 font-bold hover:text-red-800 flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Deactivate</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ══════════════════════════════════════════════════════════════
                                3. ACCOUNT SECURITY & MASTER PASSWORD
                               ══════════════════════════════════════════════════════════════ */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-cream-200">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cream-200">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-espresso-950">Account Security &amp; Master Credentials</h2>
                                        <p className="text-xs text-espresso-500">Update your private master login password safely with bcrypt encryption.</p>
                                    </div>
                                </div>

                                <form onSubmit={handlePasswordChange} className="max-w-xl space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1.5 flex items-center gap-1.5">
                                            <Key className="w-3.5 h-3.5 text-espresso-400" />
                                            <span>Current Password *</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your existing account password"
                                            required
                                            className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 text-sm font-medium focus:outline-none focus:border-indigo-500 bg-cream-50/50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1.5 flex items-center gap-1.5">
                                                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>New Password *</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Min. 8 characters"
                                                required
                                                minLength={8}
                                                className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 text-sm font-medium focus:outline-none focus:border-indigo-500 bg-cream-50/50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1.5 flex items-center gap-1.5">
                                                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>Confirm New Password *</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-type new password"
                                                required
                                                minLength={8}
                                                className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 text-sm font-medium focus:outline-none focus:border-indigo-500 bg-cream-50/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                                        <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">
                                            <strong>Security Policy:</strong> Passwords must be at least 8 characters long. After changing your password, any active brute-force lockouts are cleared, and all events are logged to the security audit trail.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isChangingPassword}
                                            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {isChangingPassword ? (
                                                <span>Updating Password...</span>
                                            ) : (
                                                <>
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>Update Master Password</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Create Coupon Modal */}
                            {showNewCouponModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 shadow-2xl border border-cream-200">
                                        <h3 className="text-lg font-black text-espresso-950 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-amber-500" />
                                            <span>Create New Promo Coupon</span>
                                        </h3>

                                        <form onSubmit={handleCreateCoupon} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">Coupon Code *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. MANDI20, WELCOME50"
                                                    value={newCoupon.code}
                                                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                                    required
                                                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-mono font-bold uppercase text-sm focus:outline-none focus:border-amber-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">Description</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Flat ₹50 OFF on Kadiri Deliveries"
                                                    value={newCoupon.description}
                                                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs focus:outline-none focus:border-amber-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">Discount Type</label>
                                                    <select
                                                        value={newCoupon.discount_type}
                                                        onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs font-bold"
                                                    >
                                                        <option value="flat">Flat ₹ (Rupees)</option>
                                                        <option value="percent">Percentage %</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">
                                                        {newCoupon.discount_type === "flat" ? "Discount (₹)" : "Discount (%)"}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={newCoupon.discount_value}
                                                        onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                                                        required
                                                        min={1}
                                                        className="w-full px-3 py-2 rounded-xl border border-cream-300 font-bold text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">Min Order (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={newCoupon.min_order}
                                                        onChange={(e) => setNewCoupon({ ...newCoupon, min_order: parseFloat(e.target.value) || 0 })}
                                                        min={0}
                                                        className="w-full px-3 py-2 rounded-xl border border-cream-300 font-bold text-xs"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1">Usage Limit</label>
                                                    <input
                                                        type="number"
                                                        value={newCoupon.usage_limit}
                                                        onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 100 })}
                                                        min={1}
                                                        className="w-full px-3 py-2 rounded-xl border border-cream-300 font-bold text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewCouponModal(false)}
                                                    className="px-4 py-2 rounded-xl border border-cream-300 text-espresso-700 text-xs font-bold hover:bg-cream-100 cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md cursor-pointer"
                                                >
                                                    Save & Publish Coupon
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
