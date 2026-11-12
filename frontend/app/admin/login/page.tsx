"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Building2, Shield, UserCheck, Sun, Crown } from "lucide-react";
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

    // Show session-expired warning if redirected from auto-logout
    useEffect(() => {
        const reason = searchParams.get("reason");
        if (reason === "session_expired") {
            toast.warning("Your session has expired. Please log in again.");
        }
    }, [searchParams, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email/username and password");
            return;
        }
        setIsLoading(true);
        try {
            await login(email, password);
            toast.success("Welcome to Surya Family Restaurant Operations Cockpit!");
        } catch (err: any) {
            toast.error(err.message || "Invalid credentials. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickFill = (uEmail: string, uPass: string) => {
        setEmail(uEmail);
        setPassword(uPass);
    };

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 select-none">
            <div className="max-w-md w-full space-y-5">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25 text-white">
                        <Sun className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Surya Family Restaurant</h1>
                    <p className="text-blue-600 text-sm mt-0.5 font-bold">Kadiri Operations Cockpit</p>
                    <p className="text-slate-500 text-xs mt-1">Opp. RTC Bus Stand, Bypass Road, Kadiri &bull; 098803 58634</p>
                </div>

                <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200/80 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
                            <Building2 className="w-4 h-4 text-blue-700" />
                            <span className="text-xs font-extrabold text-blue-900">Surya Restaurant Kadiri</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">11 AM – 10:30 PM</span>
                    </div>

                    {/* 1-Tap Quick Staff Credentials */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>1-Tap Staff Login:</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">Official Credentials</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickFill("owner@suryarestaurant.com", "admin123")}
                                className="px-2.5 py-2 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold transition shadow-xs cursor-pointer text-left flex items-center gap-1.5"
                            >
                                <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <div>
                                    <div className="leading-tight">Manager / Owner</div>
                                    <div className="text-[10px] font-normal text-slate-500">admin123</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickFill("staff@suryarestaurant.com", "staff123")}
                                className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold transition shadow-xs cursor-pointer text-left flex items-center gap-1.5"
                            >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                    <div className="leading-tight">Floor Cashier</div>
                                    <div className="text-[10px] font-normal text-slate-500">staff123</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Staff / Owner Email or Username
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="owner@suryarestaurant.com or admin"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full shadow-md shadow-blue-500/25 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Sign In to Operations Cockpit
                        </Button>
                    </form>

                    <div className="pt-3 border-t border-slate-200 text-center flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Authorized Surya Family Restaurant Staff Only</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">Loading Admin Portal...</div>}>
            <AdminLoginContent />
        </Suspense>
    );
}
