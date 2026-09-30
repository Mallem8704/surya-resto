"use client";

import React, { useState, useEffect } from "react";
import { Phone, ArrowRight, CheckCircle2, X, Lock, Eye, EyeOff, User, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useCustomer } from "@/context/CustomerContext";
import { useToast } from "@/context/ToastContext";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomerAuthModal({ isOpen, onClose, onSuccess }: CustomerAuthModalProps) {
  const { loginCustomer, executePendingAuthCallback } = useCustomer();
  const toast = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedExisting, setDetectedExisting] = useState<boolean | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setIsLoading(false);
    }
  }, [isOpen]);

  // Check phone when 10 digits are reached
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      api.checkCustomerPhone(cleanPhone)
        .then((res) => {
          if (res.exists) {
            setDetectedExisting(true);
            setMode("login");
            if (res.name) setWelcomeName(res.name);
          } else {
            setDetectedExisting(false);
            setMode("register");
            if (res.name) setName(res.name);
          }
        })
        .catch(() => {});
    } else {
      setDetectedExisting(null);
      setWelcomeName(null);
    }
  }, [phone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!password || password.length < 4) {
      toast.error("Password must be at least 4 characters long");
      return;
    }

    if (mode === "register" && !name.trim()) {
      toast.error("Please enter your name for order billing");
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (mode === "register") {
        res = await api.registerCustomer({
          phone: cleanPhone,
          password: password.trim(),
          name: name.trim() || undefined,
        });
        toast.success(`Welcome to Surya Family Restaurant, ${res.customer.name || "friend"}!`);
      } else {
        res = await api.loginCustomerWithPassword({
          phone: cleanPhone,
          password: password.trim(),
        });
        toast.success(`Welcome back, ${res.customer.name || "valued diner"}!`);
      }

      // Store in context & persistent safeStorage (90-day active session)
      loginCustomer(res.access_token, res.customer);
      onClose();
      if (onSuccess) onSuccess();
      executePendingAuthCallback();
    } catch (err: any) {
      // If error indicates already exists or not found, offer quick tab switch
      const msg = err.message || "Authentication failed";
      toast.error(msg);
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("sign in")) {
        setMode("login");
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("register")) {
        setMode("register");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Customer Sign In</h2>
            <p className="text-xs text-amber-300/80 font-medium flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Strictly No OTP • 90-Day Active Session
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 mb-5 bg-white/5 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              mode === "login"
                ? "bg-amber-500 text-black shadow-md"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              mode === "register"
                ? "bg-amber-500 text-black shadow-md"
                : "text-white/70 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {welcomeName && mode === "login" && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Welcome back, <strong>{welcomeName}</strong>! Enter your password to proceed.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
              10-Digit Mobile Number *
            </label>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/20 focus-within:border-amber-400 focus-within:bg-white/10 transition">
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
                  IN
                </span>
                <span className="text-sm font-bold text-white/70">+91</span>
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="bg-transparent text-white font-bold text-base w-full focus:outline-none placeholder:text-white/30 tracking-wider font-mono"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Name Field (for registration) */}
          {mode === "register" && (
            <div className="animate-in fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Your Full Name *
              </label>
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/20 focus-within:border-amber-400 focus-within:bg-white/10 transition">
                <User className="w-4 h-4 text-white/50 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Mohammed Farhan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-white/30"
                  required={mode === "register"}
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                {mode === "register" ? "Create Password *" : "Password *"}
              </label>
              <span className="text-[10px] text-white/50">Min 4 characters</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/20 focus-within:border-amber-400 focus-within:bg-white/10 transition">
              <Lock className="w-4 h-4 text-white/50 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-white/30 font-mono tracking-widest"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/50 hover:text-white transition p-1 cursor-pointer"
                aria-label="Toggle password view"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || phone.replace(/\D/g, "").length !== 10 || password.length < 4}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm flex items-center justify-center gap-2 transition hover:scale-101 shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : mode === "login" ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Sign In & Confirm Order <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Create Account & Place Order <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-white/50 mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
          <span>Your session remains active for 90 days. Never worry about OTP delays or lost passwords.</span>
        </p>
      </div>
    </div>
  );
}
