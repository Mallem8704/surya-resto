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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-900">
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 tracking-wide">
                                Admin Branch Authorization
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Multi-Branch Security Verification
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSwitchSubmit} className="p-5 space-y-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                Target Branch
                            </p>
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                                {targetBranch.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {targetBranch.address}
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                            Switching active branch context requires Admin authentication to maintain complete multi-tenant data isolation.
                        </span>
                    </div>

                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !password.trim()}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
