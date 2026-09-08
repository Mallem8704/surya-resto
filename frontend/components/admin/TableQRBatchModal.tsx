"use client";

import React from "react";
import { Printer, X, Sparkles } from "lucide-react";
import { useOutlet } from "@/context/OutletContext";
import { api } from "@/lib/api";

interface TableQRBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Array<{ id: number; label: string; qr_code_url?: string }>;
}

export function TableQRBatchModal({ isOpen, onClose, tables }: TableQRBatchModalProps) {
    const { outlet } = useOutlet();

    if (!isOpen) return null;

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl p-4 sm:p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
                {/* Header (Hidden on print) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cream-200 shrink-0 print:hidden gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-espresso-950">
                                Printable Table QR Standees ({tables.length} Tables)
                            </h2>
                            <p className="text-xs text-espresso-600">
                                Ready-to-print A4 / Acrylic standee inserts for {outlet?.name || "Surya Family Restaurant"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2.5 rounded-xl bg-espresso-900 hover:bg-black text-amber-400 font-extrabold text-xs flex items-center gap-2 transition hover:scale-102 shadow-md cursor-pointer"
                        >
                            <Printer className="w-4 h-4 text-amber-400" />
                            Print Standees Sheet
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-espresso-400 hover:text-espresso-800 hover:bg-cream-100 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Standees Grid */}
                <div className="flex-1 overflow-y-auto py-6 print:overflow-visible print:p-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-8">
                        {tables.map((t) => {
                            const qrImageUrl = api.getTableQrUrl(t.id);

                            return (
                                <div
                                    key={t.id}
                                    className="bg-espresso-950 text-white rounded-3xl p-6 border-4 border-amber-400/40 shadow-xl flex flex-col items-center text-center relative overflow-hidden print:border-black print:bg-white print:text-black print:shadow-none print:break-inside-avoid"
                                >
                                    {/* Gold Accent Top Bar */}
                                    <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

                                    <div className="flex items-center gap-2 text-amber-400 print:text-amber-700 text-xs font-black uppercase tracking-widest mt-1 mb-2">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>{outlet?.name || "SURYA FAMILY RESTAURANT"}</span>
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Table Badge */}
                                    <div className="px-6 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 print:bg-black print:text-white font-black text-2xl tracking-tight mb-4">
                                        TABLE {t.label}
                                    </div>

                                    {/* QR Code */}
                                    <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-amber-400/60 mb-4 inline-block">
                                        <img
                                            src={qrImageUrl}
                                            alt={`QR Code for Table ${t.label}`}
                                            className="w-44 h-44 object-contain rounded-lg"
                                        />
                                    </div>

                                    <h3 className="font-extrabold text-sm text-white print:text-black mb-1">
                                        Scan to View Digital Menu & Order
                                    </h3>
                                    <p className="text-[11px] text-white/60 print:text-gray-600 max-w-[220px] leading-tight">
                                        Use any Phone Camera or UPI App to order directly to your table!
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-white/10 print:border-gray-300 w-full flex items-center justify-between text-[10px] text-white/40 print:text-gray-500">
                                        <span>Free Wi-Fi & Fast Service</span>
                                        <span>Kadiri, AP</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
