"use client";

import React, { useState } from "react";
import {
    X,
    Plus,
    Trash2,
    Edit2,
    Check,
    Layers,
    Sparkles,
    Tag,
    IndianRupee,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { formatRupees } from "@/lib/formatters";

interface ItemVariantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    onItemUpdated: () => void;
}

export function ItemVariantsModal({ isOpen, onClose, item, onItemUpdated }: ItemVariantsModalProps) {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<"variants" | "addons">("variants");

    // New Variant Form State
    const [variantName, setVariantName] = useState("");
    const [variantNameTe, setVariantNameTe] = useState("");
    const [variantPriceRupees, setVariantPriceRupees] = useState("");
    const [isDefaultVariant, setIsDefaultVariant] = useState(false);
    const [isAddingVariant, setIsAddingVariant] = useState(false);

    // Edit Variant Inline State
    const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
    const [editVariantPriceRupees, setEditVariantPriceRupees] = useState("");
    const [editVariantName, setEditVariantName] = useState("");

    // New Addon Form State
    const [addonName, setAddonName] = useState("");
    const [addonNameTe, setAddonNameTe] = useState("");
    const [addonPriceRupees, setAddonPriceRupees] = useState("");
    const [isAddingAddon, setIsAddingAddon] = useState(false);

    // Edit Addon Inline State
    const [editingAddonId, setEditingAddonId] = useState<number | null>(null);
    const [editAddonPriceRupees, setEditAddonPriceRupees] = useState("");
    const [editAddonName, setEditAddonName] = useState("");

    if (!isOpen || !item) return null;

    const variants = item.variants || [];
    const addons = item.addons || [];

    // ── 1. ADD PORTION VARIANT ──────────────────────────────────────────
    const handleAddVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceRs = parseFloat(variantPriceRupees);
        if (!variantName.trim() || isNaN(priceRs) || priceRs <= 0) {
            toast.error("Please enter valid variant name and price");
            return;
        }

        setIsAddingVariant(true);
        try {
            await api.addMenuItemVariant(item.id, {
                name: variantName.trim(),
                name_te: variantNameTe.trim() || undefined,
                price_paise: Math.round(priceRs * 100),
                is_default: isDefaultVariant,
                is_available: true,
            });
            toast.success(`Added variant "${variantName}"`);
            setVariantName("");
            setVariantNameTe("");
            setVariantPriceRupees("");
            setIsDefaultVariant(false);
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to add variant");
        } finally {
            setIsAddingVariant(false);
        }
    };

    // ── 2. UPDATE PORTION VARIANT ───────────────────────────────────────
    const handleSaveEditVariant = async (variantId: number) => {
        const priceRs = parseFloat(editVariantPriceRupees);
        if (isNaN(priceRs) || priceRs <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        try {
            await api.updateMenuItemVariant(variantId, {
                name: editVariantName.trim(),
                price_paise: Math.round(priceRs * 100),
            });
            toast.success("Variant updated");
            setEditingVariantId(null);
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to update variant");
        }
    };

    // ── 3. DELETE PORTION VARIANT ───────────────────────────────────────
    const handleDeleteVariant = async (variantId: number, varName: string) => {
        if (!confirm(`Delete variant "${varName}"?`)) return;
        try {
            await api.deleteMenuItemVariant(variantId);
            toast.success(`Deleted variant "${varName}"`);
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete variant");
        }
    };

    // ── 4. ADD CUSTOM ADDON ─────────────────────────────────────────────
    const handleAddAddon = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceRs = parseFloat(addonPriceRupees);
        if (!addonName.trim() || isNaN(priceRs) || priceRs < 0) {
            toast.error("Please enter valid addon name and price");
            return;
        }

        setIsAddingAddon(true);
        try {
            await api.addMenuItemAddon(item.id, {
                name: addonName.trim(),
                name_te: addonNameTe.trim() || undefined,
                price_paise: Math.round(priceRs * 100),
                is_available: true,
            });
            toast.success(`Added addon "${addonName}"`);
            setAddonName("");
            setAddonNameTe("");
            setAddonPriceRupees("");
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to add addon");
        } finally {
            setIsAddingAddon(false);
        }
    };

    // ── 5. UPDATE CUSTOM ADDON ──────────────────────────────────────────
    const handleSaveEditAddon = async (addonId: number) => {
        const priceRs = parseFloat(editAddonPriceRupees);
        if (isNaN(priceRs) || priceRs < 0) {
            toast.error("Please enter a valid price");
            return;
        }

        try {
            await api.updateMenuItemAddon(addonId, {
                name: editAddonName.trim(),
                price_paise: Math.round(priceRs * 100),
            });
            toast.success("Addon updated");
            setEditingAddonId(null);
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to update addon");
        }
    };

    // ── 6. DELETE CUSTOM ADDON ──────────────────────────────────────────
    const handleDeleteAddon = async (addonId: number, addName: string) => {
        if (!confirm(`Delete addon "${addName}"?`)) return;
        try {
            await api.deleteMenuItemAddon(addonId);
            toast.success(`Deleted addon "${addName}"`);
            onItemUpdated();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete addon");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#17130F] text-white rounded-3xl border border-[#D4AF37]/40 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-serif font-black text-lg sm:text-xl text-white flex items-center gap-2">
                                {item.name}
                            </h2>
                            <p className="text-xs text-white/50">
                                Manage Portion Sizes (Single/Full/Family) &amp; Custom Add-ons
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* TABS SWITCHER */}
                <div className="flex border-b border-white/10 bg-black/20 p-1.5 gap-2 px-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("variants")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === "variants"
                                ? "bg-[#D4AF37] text-black shadow-md"
                                : "text-white/60 hover:text-white bg-white/5"
                        }`}
                    >
                        <Tag className="w-4 h-4" />
                        <span>Portion Sizes &amp; Variants ({variants.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("addons")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === "addons"
                                ? "bg-[#D4AF37] text-black shadow-md"
                                : "text-white/60 hover:text-white bg-white/5"
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Custom Add-ons &amp; Extras ({addons.length})</span>
                    </button>
                </div>

                {/* MODAL CONTENT */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    {/* ══════════════════════════════════════════════════════════
                        TAB 1: PORTION SIZES & VARIANTS
                       ══════════════════════════════════════════════════════════ */}
                    {activeTab === "variants" && (
                        <div className="space-y-6">
                            {/* Existing Variants List */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                                    Current Portion Sizes
                                </h3>

                                {variants.length === 0 ? (
                                    <div className="p-4 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center text-xs text-white/40">
                                        No portion variants added yet. This item uses its base price of <strong>{formatRupees(item.price_paise)}</strong>.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {variants.map((v: any) => {
                                            const isEditing = editingVariantId === v.id;
                                            return (
                                                <div
                                                    key={v.id}
                                                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3"
                                                >
                                                    {isEditing ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editVariantName}
                                                                onChange={(e) => setEditVariantName(e.target.value)}
                                                                className="px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                                            />
                                                            <div className="relative w-28">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]">₹</span>
                                                                <input
                                                                    type="number"
                                                                    value={editVariantPriceRupees}
                                                                    onChange={(e) => setEditVariantPriceRupees(e.target.value)}
                                                                    className="w-full pl-6 pr-2 py-1 bg-black/60 border border-white/20 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEditVariant(v.id)}
                                                                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingVariantId(null)}
                                                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-white">{v.name}</span>
                                                                    {v.name_te && (
                                                                        <span className="text-xs text-white/40 font-telugu">({v.name_te})</span>
                                                                    )}
                                                                    {v.is_default && (
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 uppercase">
                                                                            Default
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono font-black text-sm text-[#D4AF37] block mt-0.5">
                                                                    {formatRupees(v.price_paise)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingVariantId(v.id);
                                                                        setEditVariantName(v.name);
                                                                        setEditVariantPriceRupees((v.price_paise / 100).toString());
                                                                    }}
                                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                                                                    title="Edit price/name"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteVariant(v.id, v.name)}
                                                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                                                                    title="Delete variant"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Add New Variant Box */}
                            <form onSubmit={handleAddVariant} className="p-4 rounded-3xl bg-black/30 border border-white/10 space-y-3">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    Add New Portion Variant
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Variant Name *</label>
                                        <input
                                            type="text"
                                            value={variantName}
                                            onChange={(e) => setVariantName(e.target.value)}
                                            placeholder="e.g. Family Pack (3-4 Pax)"
                                            required
                                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Telugu Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={variantNameTe}
                                            onChange={(e) => setVariantNameTe(e.target.value)}
                                            placeholder="e.g. ఫ్యామిలీ ప్యాక్"
                                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Price (₹) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]">₹</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={variantPriceRupees}
                                                onChange={(e) => setVariantPriceRupees(e.target.value)}
                                                placeholder="750"
                                                required
                                                className="w-full pl-7 pr-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isDefaultVariant}
                                            onChange={(e) => setIsDefaultVariant(e.target.checked)}
                                            className="rounded border-white/20 text-[#D4AF37] focus:ring-0"
                                        />
                                        <span>Set as Default Portion</span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={isAddingVariant}
                                        className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>{isAddingVariant ? "Adding..." : "Add Portion"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        TAB 2: CUSTOM ADD-ONS & EXTRAS
                       ══════════════════════════════════════════════════════════ */}
                    {activeTab === "addons" && (
                        <div className="space-y-6">
                            {/* Existing Addons List */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                                    Current Custom Add-ons
                                </h3>

                                {addons.length === 0 ? (
                                    <div className="p-4 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center text-xs text-white/40">
                                        No custom add-ons added yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {addons.map((a: any) => {
                                            const isEditing = editingAddonId === a.id;
                                            return (
                                                <div
                                                    key={a.id}
                                                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3"
                                                >
                                                    {isEditing ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editAddonName}
                                                                onChange={(e) => setEditAddonName(e.target.value)}
                                                                className="px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                                            />
                                                            <div className="relative w-28">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]">₹</span>
                                                                <input
                                                                    type="number"
                                                                    value={editAddonPriceRupees}
                                                                    onChange={(e) => setEditAddonPriceRupees(e.target.value)}
                                                                    className="w-full pl-6 pr-2 py-1 bg-black/60 border border-white/20 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEditAddon(a.id)}
                                                                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingAddonId(null)}
                                                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-white">{a.name}</span>
                                                                    {a.name_te && (
                                                                        <span className="text-xs text-white/40 font-telugu">({a.name_te})</span>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono font-black text-sm text-[#D4AF37] block mt-0.5">
                                                                    +{formatRupees(a.price_paise)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingAddonId(a.id);
                                                                        setEditAddonName(a.name);
                                                                        setEditAddonPriceRupees((a.price_paise / 100).toString());
                                                                    }}
                                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                                                                    title="Edit price/name"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteAddon(a.id, a.name)}
                                                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                                                                    title="Delete addon"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Add New Addon Box */}
                            <form onSubmit={handleAddAddon} className="p-4 rounded-3xl bg-black/30 border border-white/10 space-y-3">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    Add New Custom Add-on
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Addon Name *</label>
                                        <input
                                            type="text"
                                            value={addonName}
                                            onChange={(e) => setAddonName(e.target.value)}
                                            placeholder="e.g. Extra Arabian Mayo (50ml)"
                                            required
                                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Telugu Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={addonNameTe}
                                            onChange={(e) => setAddonNameTe(e.target.value)}
                                            placeholder="e.g. ఎక్స్ట్రా మయోన్నైస్"
                                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-1">Extra Price (₹) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]">₹</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={addonPriceRupees}
                                                onChange={(e) => setAddonPriceRupees(e.target.value)}
                                                placeholder="25"
                                                required
                                                className="w-full pl-7 pr-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={isAddingAddon}
                                        className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>{isAddingAddon ? "Adding..." : "Add Custom Add-on"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
