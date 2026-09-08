"use client";

import React from "react";
import { RotateCcw, Clock, ArrowRight, Utensils, MapPin } from "lucide-react";
import { formatRupees, formatDateTime } from "@/lib/formatters";

interface RepeatOrderCardProps {
  pastOrders: any[];
  onReorder: (order: any) => void;
}

export function RepeatOrderCard({ pastOrders, onReorder }: RepeatOrderCardProps) {
  if (!pastOrders || pastOrders.length === 0) return null;

  const latestOrder = pastOrders[0];

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-400/30 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
          <RotateCcw className="w-4 h-4" />
          <span>1-Tap Repeat Recent Order</span>
        </div>
        <span className="text-[11px] text-white/50">
          #{latestOrder.order_number}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-bold text-white line-clamp-1">
          {latestOrder.items?.map((it: any) => `${it.qty}x ${it.item_name}`).join(", ")}
        </div>
        <p className="text-xs text-amber-300 font-extrabold">
          {formatRupees(latestOrder.total_paise)} • Branch {latestOrder.outlet_id === 56 || latestOrder.outlet_id === 2 ? "2" : "1"}
        </p>
      </div>

      <button
        onClick={() => onReorder(latestOrder)}
        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition hover:scale-102 shadow-md cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reorder This Meal ({formatRupees(latestOrder.total_paise)})
      </button>
    </div>
  );
}
