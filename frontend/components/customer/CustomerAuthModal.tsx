"use client";

import React, { useState } from "react";
import { Phone, ArrowRight, CheckCircle2, X, Sparkles, User, RefreshCw, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useCustomer } from "@/context/CustomerContext";
import { useToast } from "@/context/ToastContext";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomerAuthModal({ isOpen, onClose, onSuccess }: CustomerAuthModalProps) {
  const { loginCustomer } = useCustomer();
  const toast = useToast();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInstantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.quickLoginCustomer({
        phone: cleanPhone,
        name: name.trim() || undefined,
      });

      loginCustomer(res.access_token, res.customer);
      toast.success(`Welcome ${res.customer.name || "back to Surya Family Restaurant"}!`);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to identify mobile number");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Instant Customer Login</h2>
            <p className="text-xs text-white/50">Auto-fill Kadiri addresses & 1-tap re-order</p>
          </div>
        </div>

        <form onSubmit={handleInstantLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Mobile Number *
            </label>
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/20 focus-within:border-amber-400">
              <span className="inline-flex items-center gap-1.5"><span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">IN</span><span className="text-sm font-bold text-white/70">+91</span></span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="bg-transparent text-white font-bold text-base w-full focus:outline-none placeholder:text-white/30"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
              Your Name (Optional)
            </label>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/20 focus-within:border-amber-400">
              <User className="w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="e.g. Mohammed Farhan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || phone.replace(/\D/g, "").length !== 10}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition hover:scale-102 shadow-lg shadow-amber-500/30 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Continue & Load Saved Addresses <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

