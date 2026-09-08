"use client";

import React, { useState } from "react";
import { Lock, Building2, AlertCircle, ArrowRight, X, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useOutlet, OutletInfo } from "@/context/OutletContext";
import { useToast } from "@/context/ToastContext";

interface AdminBranchSwitchModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetBranch: OutletInfo | null;
}

export function AdminBranchSwitchModal({
    isOpen,
    onClose,
    targetBranch,
}: AdminBranchSwitchModalProps) {
    const { user, updateAuthSession } = useAuth();
    const { refreshOutlet } = useOutlet();
    const toast = useToast();

    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen || !targetBranch) return null;

    const handleSwitchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setErrorMessage("Please enter your Admin password to authorize branch switch.");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const res = await api.switchBranch({
                target_outlet_id: targetBranch.id,
                admin_password: password.trim(),
                admin_email: user?.email || undefined,
            });

            if (res && res.access_token) {
                const updatedUser = {
                    id: res.user_id ?? user?.id ?? 1,
                    email: res.email ?? user?.email ?? "",
                    name: res.name ?? user?.name ?? "Admin",
                    role: "owner" as const,
                    outlet_id: res.outlet_id,
                };
                updateAuthSession(res.access_token, updatedUser);
                await refreshOutlet();

                toast.success(`Switched active branch to ${targetBranch.name}`);
                setPassword("");
                onClose();
                if (typeof window !== "undefined") {
                    window.location.reload();
                }
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Branch switch failed:", err);
            const msg = err.message || "Invalid Admin password. Branch switch access denied.";
            setErrorMessage(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#120e09] border border-amber-400/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white">
                <div className="p-5 bg-gradient-to-r from-amber-950/80 via-black to-amber-950/80 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white tracking-wide">
                                Admin Branch Authorization
                            </h2>
                            <p className="text-[11px] text-amber-300/80 font-medium">
                                Multi-Branch Security Verification
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSwitchSubmit} className="p-5 space-y-4">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                Target Branch
                            </p>
                            <h3 className="text-sm font-bold text-white truncate">
                                {targetBranch.name}
                            </h3>
                            <p className="text-xs text-white/60 line-clamp-1 mt-0.5">
                                {targetBranch.address}
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-white/70 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                            Switching active branch context requires Admin authentication to maintain complete multi-tenant data isolation.
                        </span>
                    </div>

                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-amber-300 mb-1.5">
                            Admin Password
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Admin Password"
                                autoFocus
                                required
                                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 text-white placeholder:text-white/30 focus:outline-hidden focus:border-amber-400 transition text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !password.trim()}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-espresso-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span>Authorizing...</span>
                            ) : (
                                <>
                                    <span>Authorize Switch</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
