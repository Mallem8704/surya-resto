"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, MapPin, Building2, Shield, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

function AdminLoginContent() {
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const toast = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password");
            return;
        }
        setIsLoading(true);
        try {
            await login(email, password);
            toast.success("Welcome to Surya Family Restaurant Operations Cockpit!");
        } catch (err: any) {
            toast.error(err.message || "Invalid credentials. Please check your email and password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickFill = (uEmail: string, uPass: string) => {
        setEmail(uEmail);
        setPassword(uPass);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex flex-col justify-center items-center p-4 select-none">
            <div className="max-w-md w-full space-y-5">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20 text-3xl">
                        ☀️
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Surya Family Restaurant</h1>
                    <p className="text-amber-400/90 text-sm mt-0.5 font-bold">Kadiri Operations Cockpit</p>
                    <p className="text-white/40 text-xs mt-1">Opp. RTC Bus Stand, Bypass Road, Kadiri &bull; 098803 58634</p>
                </div>

                <div className="bg-white rounded-3xl p-7 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300">
                            <Building2 className="w-4 h-4 text-amber-700" />
                            <span className="text-xs font-extrabold text-amber-900">Surya Restaurant Kadiri</span>
                        </div>
                        <span className="text-[11px] text-espresso-400 font-mono">11 AM – 10:30 PM</span>
                    </div>

                    {/* 1-Tap Quick Fill demo accounts */}
                    <div className="p-3 bg-cream-100 rounded-2xl border border-cream-300 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-espresso-700">
                            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>1-Tap Demo Quick Fill:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickFill("owner@suryarestaurant.com", "admin123")}
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-sm cursor-pointer text-left"
                            >
                                👑 Manager / Owner
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickFill("staff@suryarestaurant.com", "staff123")}
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold transition shadow-sm cursor-pointer text-left"
                            >
                                🧑‍🍳 Floor Staff
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1.5">Staff / Owner Email</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="owner@suryarestaurant.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-xs sm:text-sm text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-espresso-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-xs sm:text-sm text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full shadow-md shadow-amber-500/20 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Sign In to Operations Cockpit
                        </Button>
                    </form>

                    <div className="pt-3 border-t border-cream-200 text-center flex items-center justify-center gap-1.5 text-espresso-400 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-espresso-400" />
                        <span>Authorized Surya Family Restaurant Staff Only</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-stone-900 flex items-center justify-center text-white/50 text-sm">Loading Admin Portal...</div>}>
            <AdminLoginContent />
        </Suspense>
    );
}
