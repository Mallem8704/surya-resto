"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { safeStorage } from "@/lib/safeStorage";

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: "owner" | "staff";
    outlet_id: number;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isOwner: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateAuthSession: (token: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Check if a stored token looks like a valid JWT (header.payload.signature).
 * This does NOT verify the signature — it only ensures the format is correct
 * and the token hasn't expired based on the embedded `exp` claim.
 */
function isTokenValid(token: string | null): boolean {
    if (!token) return false;

    // Reject fake fallback tokens from legacy cold-start workaround
    if (token.startsWith("surya_session_")) return false;

    // Basic JWT structure check: must have 3 dot-separated base64 parts
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Check if token has expired by decoding the payload
    try {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
            const expiresAt = payload.exp * 1000; // convert to milliseconds
            const now = Date.now();
            // Consider expired if less than 60 seconds of validity remaining
            if (now >= expiresAt - 60000) return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const router = useRouter();
    const logoutCalledRef = useRef(false);

    const logout = useCallback(() => {
        if (logoutCalledRef.current) return; // Prevent double-logout redirect loops
        logoutCalledRef.current = true;
        safeStorage.removeItem("surya_token");
        safeStorage.removeItem("surya_user");
        setUser(null);
        setToken(null);
        router.push("/admin/login");
        // Reset the guard after a short delay so future logouts can work
        setTimeout(() => { logoutCalledRef.current = false; }, 2000);
    }, [router]);

    useEffect(() => {
        const storedToken = safeStorage.getItem("surya_token");
        const storedUser = safeStorage.getItem("surya_user");

        // ── VALIDATE TOKEN FORMAT & EXPIRY BEFORE TRUSTING IT ──
        if (storedToken && storedUser && isTokenValid(storedToken)) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                safeStorage.removeItem("surya_user");
                safeStorage.removeItem("surya_token");
            }
        } else if (storedToken) {
            // Token exists but is invalid/expired — clean up stale session
            safeStorage.removeItem("surya_token");
            safeStorage.removeItem("surya_user");
        }
        setIsLoading(false);

        // Fetch fresh profile from backend to sync any name or role updates
        // AND to validate the token is actually accepted by the server
        if (storedToken && isTokenValid(storedToken)) {
            api.getMe()
                .then((freshUser) => {
                    if (freshUser && freshUser.name) {
                        const updated: AuthUser = {
                            id: freshUser.id,
                            email: freshUser.email,
                            name: freshUser.name,
                            role: freshUser.role,
                            outlet_id: freshUser.outlet_id,
                        };
                        setUser(updated);
                        safeStorage.setItem("surya_user", JSON.stringify(updated));
                    }
                })
                .catch((err: any) => {
                    // If backend rejects the token (401), force logout immediately
                    if (err?.status === 401) {
                        safeStorage.removeItem("surya_token");
                        safeStorage.removeItem("surya_user");
                        setUser(null);
                        setToken(null);
                    }
                    // Other errors (network, 500) — keep the session alive,
                    // the user can still work with cached data
                });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const login = async (email: string, password: string) => {
        const res = await api.login({ email, password });
        const authToken = res.access_token;

        // ── VALIDATE THE TOKEN FROM SERVER ──
        if (!authToken || !isTokenValid(authToken)) {
            throw new Error("Server returned an invalid authentication token. Please try again.");
        }

        const authUser: AuthUser = {
            id: res.user_id ?? res.user?.id ?? (res.sub ? Number(res.sub) : 1),
            email: res.email ?? res.user?.email ?? email,
            name: res.name ?? res.user?.name ?? "Staff Member",
            role: (res.role ?? res.user?.role ?? "staff") as "owner" | "staff",
            outlet_id: res.outlet_id ?? res.user?.outlet_id ?? 1,
        };

        setToken(authToken);
        setUser(authUser);

        safeStorage.setItem("surya_token", authToken);
        safeStorage.setItem("surya_user", JSON.stringify(authUser));

        router.push("/admin");
    };

    const updateAuthSession = (authToken: string, authUser: AuthUser) => {
        setToken(authToken);
        setUser(authUser);
        safeStorage.setItem("surya_token", authToken);
        safeStorage.setItem("surya_user", JSON.stringify(authUser));
    };

    const isAuthenticated = !!user && !!token;
    const isOwner = user?.role === "owner";

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isOwner,
                isLoading,
                login,
                logout,
                updateAuthSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
