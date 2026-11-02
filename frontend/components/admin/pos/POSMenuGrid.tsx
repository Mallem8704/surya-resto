"use client";

import React, { useState, useMemo } from "react";
import { Search, Flame, Sparkles, Plus, Check, X } from "lucide-react";
import { formatRupees } from "@/lib/formatters";

interface MenuItemData {
    id: number;
    name: string;
    name_te?: string;
    price_paise: number;
    category_id: number;
    is_veg: boolean;
    is_available: boolean;
    has_variants?: boolean;
    variants?: Array<{ id: number; name: string; price_paise: number }>;
    addons?: Array<{ id: number; name: string; price_paise: number }>;
}

interface POSMenuGridProps {
    items: MenuItemData[];
    categories: any[];
    selectedCategory: number | "all";
    onSelectCategory: (catId: number | "all") => void;
    onAddItem: (item: MenuItemData, variant?: any, notes?: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
}

export function POSMenuGrid({
    items,
    categories,
    selectedCategory,
    onSelectCategory,
    onAddItem,
    searchQuery,
    onSearchChange,
    searchRef,
}: POSMenuGridProps) {
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non_veg">("all");
    const [variantModalItem, setVariantModalItem] = useState<MenuItemData | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
    const [variantNote, setVariantNote] = useState<string>("");

    const filteredItems = useMemo(() => {
        return items.filter((it) => {
            if (!it.is_available) return false;
            if (selectedCategory !== "all" && it.category_id !== selectedCategory) return false;
            if (vegFilter === "veg" && !it.is_veg) return false;
            if (vegFilter === "non_veg" && it.is_veg) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = it.name.toLowerCase().includes(q);
                const matchTe = it.name_te ? it.name_te.toLowerCase().includes(q) : false;
                const matchId = `${it.id}` === q;
                return matchName || matchTe || matchId;
            }
            return true;
        });
    }, [items, selectedCategory, vegFilter, searchQuery]);

    const handleItemClick = (it: MenuItemData) => {
        if (it.has_variants && it.variants && it.variants.length > 0) {
            setVariantModalItem(it);
            setSelectedVariant(it.variants[0]);
            setVariantNote("");
        } else {
            onAddItem(it);
        }
    };

    const handleConfirmVariant = () => {
        if (variantModalItem && selectedVariant) {
            onAddItem(variantModalItem, selectedVariant, variantNote);
            setVariantModalItem(null);
            setSelectedVariant(null);
            setVariantNote("");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
            {/* SEARCH & FILTERS BAR */}
            <div className="p-3 sm:p-4 border-b border-slate-200 space-y-3 bg-white">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search item by name or short-code... [F2]"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Veg / Non-Veg Quick Switcher */}
                    <div className="flex rounded-xl bg-slate-100 border border-slate-200 p-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setVegFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                vegFilter === "all" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setVegFilter("non_veg")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                vegFilter === "non_veg" ? "bg-red-600 text-white" : "text-red-400 hover:text-red-300"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Non-Veg
                        </button>
                        <button
                            type="button"
                            onClick={() => setVegFilter("veg")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                vegFilter === "veg" ? "bg-emerald-600 text-white" : "text-emerald-400 hover:text-emerald-300"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Veg
                        </button>
                    </div>
                </div>

                {/* CATEGORY TABS SCROLLABLE */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
                    <button
                        type="button"
                        onClick={() => onSelectCategory("all")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedCategory === "all"
                                ? "bg-blue-600 text-white shadow-xs shadow-md"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        All Categories ({items.length})
                    </button>
                    {categories.map((cat) => {
                        const count = items.filter((i) => i.category_id === cat.id && i.is_available).length;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onSelectCategory(cat.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                                    selectedCategory === cat.id
                                        ? "bg-blue-600 text-white shadow-xs shadow-md"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                <span>{cat.name}</span>
                                <span className="text-[10px] opacity-75 font-mono">({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MENU ITEMS GRID */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {filteredItems.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                        <p className="text-sm text-slate-500">No active menu items match your search.</p>
                        <button
                            onClick={() => {
                                onSearchChange("");
                                onSelectCategory("all");
                                setVegFilter("all");
                            }}
                            className="mt-3 px-4 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-blue-600 hover:bg-slate-200"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                        {filteredItems.map((it) => (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => handleItemClick(it)}
                                className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-600/60 transition-all text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden shadow-sm active:scale-98 min-h-[110px]"
                            >
                                {/* Top Badge & Type */}
                                <div className="flex items-start justify-between gap-1 w-full">
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                                            it.is_veg ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-red-500 ring-2 ring-red-500/20"
                                        }`}
                                    />
                                    {it.has_variants && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-tighter">
                                            Variants
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="my-1.5 w-full">
                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                                        {it.name}
                                    </h4>
                                    {it.name_te && (
                                        <p className="text-[10px] text-slate-400 font-telugu line-clamp-1 mt-0.5">
                                            {it.name_te}
                                        </p>
                                    )}
                                </div>

                                {/* Price & Add Icon */}
                                <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100">
                                    <span className="font-mono font-black text-xs sm:text-sm text-blue-600">
                                        {formatRupees(it.price_paise)}
                                    </span>
                                    <div className="w-6 h-6 rounded-lg bg-white group-hover:bg-blue-600 group-hover:text-slate-900 text-slate-600 flex items-center justify-center transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* VARIANT SELECTOR MODAL */}
            {variantModalItem && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold">
                                    Select Portion / Variant
                                </span>
                                <h3 className="font-serif text-lg font-black text-slate-900 mt-0.5">
                                    {variantModalItem.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setVariantModalItem(null)}
                                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Variants List */}
                        <div className="space-y-2">
                            {variantModalItem.variants?.map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setSelectedVariant(v)}
                                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                                        selectedVariant?.id === v.id
                                            ? "bg-blue-50 border-blue-600 ring-2 ring-blue-200"
                                            : "bg-white border-slate-200 hover:border-white/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                selectedVariant?.id === v.id
                                                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                                                    : "border-white/40"
                                            }`}
                                        >
                                            {selectedVariant?.id === v.id && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className="font-bold text-sm text-slate-900">{v.name}</span>
                                    </div>
                                    <span className="font-mono font-black text-sm text-blue-600">
                                        {formatRupees(v.price_paise)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Item Note */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Cooking Note (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Less spicy, extra salan..."
                                value={variantNote}
                                onChange={(e) => setVariantNote(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setVariantModalItem(null)}
                                className="flex-1 py-3 rounded-2xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-900 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmVariant}
                                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:scale-102 transition"
                            >
                                Add to Bill ({formatRupees(selectedVariant?.price_paise || variantModalItem.price_paise)})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
