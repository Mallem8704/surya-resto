"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Utensils,
    Plus,
    Edit2,
    Trash2,
    Search,
    Check,
    X,
    Lock,
    Unlock,
    Upload,
    Sparkles,
    ChefHat,
    AlertCircle,
    Star,
    Layers,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { VegBadge, SpecialBadge, StockBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { formatRupees } from "@/lib/formatters";
import { api } from "@/lib/api";
import { useAdminLiveState } from "@/hooks/useAdminLiveState";
import { useOutlet } from "@/context/OutletContext";
import { ItemVariantsModal } from "@/components/admin/ItemVariantsModal";

export default function AdminMenuManagementPage() {
    const { isAuthenticated, isOwner, isLoading: authLoading } = useAuth();
    const { t } = useLanguage();
    const toast = useToast();
    const router = useRouter();
    const { outlet } = useOutlet();
    const { wsConnected, pendingServiceCalls, handleAttendServiceCall } = useAdminLiveState();

    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceItem, setPriceItem] = useState<any | null>(null);
    const [showVariantsModal, setShowVariantsModal] = useState<boolean>(false);
    const [selectedVariantItem, setSelectedVariantItem] = useState<any | null>(null);
    const [newPriceRupees, setNewPriceRupees] = useState<string>("");

    // Form States
    const [formData, setFormData] = useState<any>({
        category_id: 1,
        name: "",
        name_te: "",
        description: "",
        description_te: "",
        price_rupees: "",
        is_veg: false,
        is_available: true,
        track_stock: false,
        stock_qty: 100,
        low_stock_threshold: 10,
        is_special: false,
        image_url: "",
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Auth Guard
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/admin/login");
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, menu] = await Promise.all([
                api.getCategories(false, outlet?.id),
                api.getMenu(outlet?.id),
            ]);
            setCategories(cats);
            setItems(menu);
            if (cats.length > 0 && !formData.category_id) {
                setFormData((prev: any) => ({ ...prev, category_id: cats[0].id }));
            }
        } catch {
            toast.error("Failed to load menu data");
        } finally {
            setIsLoading(false);
        }
    }, [toast, outlet?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    // Open Modal for New Item
    const handleOpenCreateItem = () => {
        setEditingItem(null);
        setImageFile(null);
        setFormData({
            category_id: categories[0]?.id || 1,
            name: "",
            name_te: "",
            description: "",
            description_te: "",
            price_rupees: "20",
            is_veg: true,
            is_available: true,
            track_stock: true,
            stock_qty: 100,
            low_stock_threshold: 10,
            is_special: false,
            image_url: "",
        });
        setShowItemModal(true);
    };

    // Open Modal for Edit Item
    const handleOpenEditItem = (item: any) => {
        setEditingItem(item);
        setImageFile(null);
        setFormData({
            category_id: item.category_id,
            name: item.name,
            name_te: item.name_te || "",
            description: item.description || "",
            description_te: item.description_te || "",
            price_rupees: String(item.price_paise / 100),
            is_veg: item.is_veg,
            is_available: item.is_available,
            track_stock: item.track_stock,
            stock_qty: item.stock_qty,
            low_stock_threshold: item.low_stock_threshold,
            is_special: item.is_special,
            image_url: item.image_url || "",
        });
        setShowItemModal(true);
    };

    // Toggle Availability
    const handleToggleAvailability = async (item: any) => {
        const nextState = !item.is_available;
        try {
            const updated = await api.toggleItemAvailability(item.id, nextState);
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_available: updated.is_available } : it)));
            toast.success(`${item.name} is now ${nextState ? "Available" : "Unavailable"}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to update availability");
        }
    };

    // Price Edit Modal (Owner Only)
    const handleOpenPriceModal = (item: any) => {
        if (!isOwner) {
            toast.error("Only Owner role can change item prices");
            return;
        }
        setPriceItem(item);
        setNewPriceRupees(String(item.price_paise / 100));
        setShowPriceModal(true);
    };

    const handleSavePrice = async () => {
        if (!priceItem || !newPriceRupees) return;
        const pricePaise = Math.round(parseFloat(newPriceRupees) * 100);
        if (isNaN(pricePaise) || pricePaise <= 0) {
            toast.error("Invalid price amount");
            return;
        }

        try {
            await api.updateItemPrice(priceItem.id, pricePaise);
            setItems((prev) =>
                prev.map((it) => (it.id === priceItem.id ? { ...it, price_paise: pricePaise } : it))
            );
            toast.success(`Price updated for ${priceItem.name} to ₹${newPriceRupees}`);
            setShowPriceModal(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to update price");
        }
    };

    // Delete Item (Owner Only)
    const handleDeleteItem = async (item: any) => {
        if (!isOwner) {
            toast.error("Only Owner can delete menu items");
            return;
        }
        if (!confirm(`Are you sure you want to delete '${item.name}'?`)) return;

        try {
            await api.deleteMenuItem(item.id);
            setItems((prev) => prev.filter((it) => it.id !== item.id));
            toast.success(`Deleted ${item.name}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete item");
        }
    };

    // Save Item (Create or Edit)
    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let uploadedImageUrl = formData.image_url;

            // Upload image file if selected
            if (imageFile) {
                const fd = new FormData();
                fd.append("file", imageFile);
                const uploadRes = await api.uploadImage(fd);
                uploadedImageUrl = uploadRes.url || uploadRes.image_url;
            }

            const payload: any = {
                category_id: Number(formData.category_id),
                name: formData.name.trim(),
                name_te: formData.name_te.trim() || undefined,
                description: formData.description.trim() || undefined,
                description_te: formData.description_te.trim() || undefined,
                is_veg: Boolean(formData.is_veg),
                is_available: Boolean(formData.is_available),
                track_stock: Boolean(formData.track_stock),
                stock_qty: Number(formData.stock_qty),
                low_stock_threshold: Number(formData.low_stock_threshold),
                is_special: Boolean(formData.is_special),
                image_url: uploadedImageUrl,
            };

            if (isOwner || !editingItem) {
                payload.price_paise = Math.round(parseFloat(formData.price_rupees) * 100);
            }

            if (editingItem) {
                const updated = await api.updateMenuItem(editingItem.id, payload);
                setItems((prev) => prev.map((it) => (it.id === editingItem.id ? updated : it)));
                toast.success(`Updated ${updated.name}`);
            } else {
                const created = await api.createMenuItem(payload);
                setItems((prev) => [...prev, created]);
                toast.success(`Created ${created.name}`);
            }

            setShowItemModal(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to save menu item");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredItems = items.filter((item) => {
        if (selectedCategory !== "all" && item.category_id !== selectedCategory) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const mEn = item.name.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
            const mTe = item.name_te?.toLowerCase().includes(q) || (item.description_te?.toLowerCase().includes(q) ?? false);
            if (!mEn && !mTe) return false;
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

                {/* Top Actions Bar */}
                <div className="p-6 bg-white border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-extrabold text-espresso-950 tracking-tight">
                                Menu & Pricing Management
                            </h2>
                            {/* Live Stats Pills */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 text-espresso-800 font-extrabold">
                                    Total: {items.length}
                                </span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 inline-flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                                    Available: {items.filter((i) => i.is_available).length}
                                </span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 font-extrabold border border-red-200 inline-flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 inline-block" />
                                    Unavailable: {items.filter((i) => !i.is_available).length}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-espresso-600">
                            Bilingual menu catalog, 1-tap availability toggles, image uploads & owner price controls.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="primary"
                            size="md"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={handleOpenCreateItem}
                        >
                            Add Menu Item
                        </Button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="p-6 pb-2 bg-cream-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-300 bg-white text-xs placeholder:text-espresso-400 focus:outline-none focus:border-terracotta-500"
                        />
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                selectedCategory === "all"
                                    ? "bg-terracotta-500 text-white"
                                    : "bg-white border border-cream-300 text-espresso-800 hover:bg-cream-100"
                            }`}
                        >
                            All Categories
                        </button>
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCategory(c.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                    selectedCategory === c.id
                                        ? "bg-terracotta-500 text-white"
                                        : "bg-white border border-cream-300 text-espresso-800 hover:bg-cream-100"
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Table */}
                <main className="flex-1 overflow-y-auto p-6 bg-cream-100">
                    <div className="bg-white rounded-2xl border border-cream-300 shadow-xs overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                            <thead>
                                <tr className="border-b border-cream-200 bg-cream-50/80 text-espresso-600 font-extrabold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Item Details</th>
                                    <th className="py-3.5 px-4">Telugu Name</th>
                                    <th className="py-3.5 px-4">Category</th>
                                    <th className="py-3.5 px-4">Price (₹)</th>
                                    <th className="py-3.5 px-4">Stock Level</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                                {filteredItems.map((item) => {
                                    const cat = categories.find((c) => c.id === item.category_id);

                                    return (
                                        <tr key={item.id} className="hover:bg-cream-50/50 transition">
                                            {/* Details */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {item.image_url ? (
                                                            <img
                                                                src={api.getImageUrl(item.image_url)}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <ChefHat className="w-5 h-5 text-terracotta-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <VegBadge isVeg={item.is_veg} showText={false} />
                                                            <span className="font-bold text-espresso-950 text-sm">{item.name}</span>
                                                            {item.is_special && <SpecialBadge />}
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-[11px] text-espresso-500 line-clamp-1 max-w-xs mt-0.5">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Telugu */}
                                            <td className="py-3.5 px-4 font-semibold text-espresso-800">
                                                {item.name_te || "—"}
                                            </td>

                                            {/* Category */}
                                            <td className="py-3.5 px-4 text-espresso-600 font-medium">
                                                {cat?.name || "General"}
                                            </td>

                                            {/* Price (Owner Only editable) */}
                                            <td className="py-3.5 px-4">
                                                <button
                                                    onClick={() => handleOpenPriceModal(item)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-extrabold text-xs transition cursor-pointer ${
                                                        isOwner
                                                            ? "border-terracotta-200 bg-terracotta-50 text-terracotta-700 hover:bg-terracotta-100"
                                                            : "border-cream-200 bg-cream-50 text-espresso-800 cursor-not-allowed"
                                                    }`}
                                                    title={isOwner ? "Click to edit price" : "Owner only price edit"}
                                                >
                                                    <span>{formatRupees(item.price_paise)}</span>
                                                    {isOwner ? <Edit2 className="w-3 h-3 text-terracotta-500" /> : <Lock className="w-3 h-3 text-espresso-400" />}
                                                </button>
                                            </td>

                                            {/* Stock */}
                                            <td className="py-3.5 px-4">
                                                {item.track_stock ? (
                                                    <StockBadge
                                                        status={
                                                            item.stock_qty <= 0
                                                                ? "out_of_stock"
                                                                : item.stock_qty <= item.low_stock_threshold
                                                                ? "low_stock"
                                                                : "in_stock"
                                                        }
                                                        qty={item.stock_qty}
                                                    />
                                                ) : (
                                                    <span className="text-[11px] text-espresso-400 font-semibold">Untracked</span>
                                                )}
                                            </td>

                                            {/* Availability Toggle */}
                                            <td className="py-3.5 px-4">
                                                <button
                                                    onClick={() => handleToggleAvailability(item)}
                                                    className={`px-3 py-1 rounded-full text-[11px] font-extrabold border transition cursor-pointer inline-flex items-center gap-1 ${
                                                        item.is_available
                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                                            : "bg-red-50 border-red-300 text-red-800 hover:bg-red-100"
                                                    }`}
                                                >
                                                    {item.is_available ? <Check className="w-3 h-3 text-emerald-700" /> : <X className="w-3 h-3 text-red-700" />}
                                                    <span>{item.is_available ? "Available" : "Disabled"}</span>
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedVariantItem(item);
                                                            setShowVariantsModal(true);
                                                        }}
                                                        className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                                        title="Manage Portion Sizes & Addons"
                                                    >
                                                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                                                        <span>Portions ({item.variants?.length || 0})</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenEditItem(item)}
                                                        className="p-1.5 rounded-lg text-espresso-500 hover:text-espresso-950 hover:bg-cream-100 transition cursor-pointer"
                                                        title="Edit Details"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>

                                                    {isOwner && (
                                                        <button
                                                            onClick={() => handleDeleteItem(item)}
                                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                                            title="Delete Item (Owner only)"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* CREATE / EDIT ITEM MODAL */}
                {showItemModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-cream-300 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-cream-200 mb-4">
                                <h3 className="text-base font-bold text-espresso-950">
                                    {editingItem ? "Edit Menu Item" : "Create New Menu Item"}
                                </h3>
                                <button
                                    onClick={() => setShowItemModal(false)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-espresso-700 mb-1">Item Name (English)*</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Masala Chai"
                                            className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-espresso-700 mb-1">Item Name (Telugu - తెలుగు)</label>
                                        <input
                                            type="text"
                                            value={formData.name_te}
                                            onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                                            placeholder="e.g. మసాలా చాయ్"
                                            className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-espresso-700 mb-1">Category*</label>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                            className="w-full p-2.5 rounded-xl border border-cream-300 bg-white font-medium"
                                        >
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-espresso-700 mb-1">Price (₹)*</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            required
                                            disabled={editingItem && !isOwner}
                                            value={formData.price_rupees}
                                            onChange={(e) => setFormData({ ...formData, price_rupees: e.target.value })}
                                            placeholder="25.00"
                                            className="w-full p-2.5 rounded-xl border border-cream-300 bg-white disabled:bg-cream-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">Description (English)</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Traditional slow-brewed tea..."
                                        className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">Description (Telugu)</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description_te}
                                        onChange={(e) => setFormData({ ...formData, description_te: e.target.value })}
                                        placeholder="తాజా పాలతో తయారుచేసిన వేడి చాయ్..."
                                        className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                    />
                                </div>

                                {/* Stock & Dietary Checks */}
                                <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <label className="flex items-center gap-2 font-bold text-espresso-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_veg}
                                            onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                                            className="accent-emerald-600"
                                        />
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                                            Pure Veg
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 font-bold text-espresso-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_special}
                                            onChange={(e) => setFormData({ ...formData, is_special: e.target.checked })}
                                            className="accent-saffron-500"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-saffron-500 fill-saffron-500" />
                                            Special
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 font-bold text-espresso-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.track_stock}
                                            onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                                            className="accent-terracotta-500"
                                        />
                                        <span>Track Stock</span>
                                    </label>
                                </div>

                                {formData.track_stock && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-espresso-700 mb-1">Current Stock Qty</label>
                                            <input
                                                type="number"
                                                value={formData.stock_qty}
                                                onChange={(e) => setFormData({ ...formData, stock_qty: Number(e.target.value) })}
                                                className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-espresso-700 mb-1">Low Stock Alert Level</label>
                                            <input
                                                type="number"
                                                value={formData.low_stock_threshold}
                                                onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                                                className="w-full p-2.5 rounded-xl border border-cream-300 bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Image Upload */}
                                <div>
                                    <label className="block font-bold text-espresso-700 mb-1">Item Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                        className="w-full p-2 rounded-xl border border-cream-300 bg-white text-xs"
                                    />
                                </div>

                                <div className="pt-3 flex items-center justify-end gap-2 border-t border-cream-200">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowItemModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        isLoading={isSaving}
                                    >
                                        Save Menu Item
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* OWNER PRICE EDIT MODAL */}
                {showPriceModal && priceItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/60 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                                <h3 className="text-base font-bold text-espresso-950">Update Price (₹)</h3>
                                <button
                                    onClick={() => setShowPriceModal(false)}
                                    className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-xs text-espresso-600">
                                Change selling price for <strong className="text-espresso-950">{priceItem.name}</strong>. This writes an entry to the audit log.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-espresso-700 mb-1">New Price (₹)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={newPriceRupees}
                                    onChange={(e) => setNewPriceRupees(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-cream-300 text-base font-extrabold text-terracotta-600 focus:outline-none focus:border-terracotta-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setShowPriceModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleSavePrice}
                                >
                                    Confirm Price
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Item Portion Sizes & Addons Modal */}
                {showVariantsModal && selectedVariantItem && (
                    <ItemVariantsModal
                        isOpen={showVariantsModal}
                        onClose={() => {
                            setShowVariantsModal(false);
                            setSelectedVariantItem(null);
                        }}
                        item={selectedVariantItem}
                        onItemUpdated={fetchData}
                    />
                )}
            </div>
        </div>
    );
}
