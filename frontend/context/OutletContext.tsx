"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface OutletInfo {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    currency: string;
    tax_rate_percent: number;
    opening_hours: string | null;
    tagline: string | null;
    logo_url: string | null;
    gstin: string | null;
    fssai_license_number: string | null;
    upi_vpa: string | null;
}

interface OutletContextType {
    outlet: OutletInfo | null;
    allOutlets: OutletInfo[];
    isLoading: boolean;
    taxRate: number; // decimal, e.g. 0.05
    refreshOutlet: () => Promise<void>;
    switchBranch: (outletId: number) => Promise<void>;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [outlet, setOutlet] = useState<OutletInfo | null>(null);
    const [allOutlets, setAllOutlets] = useState<OutletInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const activeOutletId = user?.outlet_id || 1;

    const refreshOutlet = useCallback(async (targetId?: number) => {
        const idToFetch = targetId || user?.outlet_id || 1;
        try {
            const [singleData, listData] = await Promise.allSettled([
                api.getOutlet(idToFetch),
                api.getOutlets(),
            ]);

            if (singleData.status === "fulfilled" && singleData.value) {
                setOutlet(singleData.value);
            }
            if (listData.status === "fulfilled" && Array.isArray(listData.value)) {
                setAllOutlets(listData.value);
            }
        } catch (err) {
            console.error("Failed to fetch outlet:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.outlet_id]);

    useEffect(() => {
        refreshOutlet(activeOutletId);
    }, [refreshOutlet, activeOutletId]);

    const switchBranch = async (outletId: number) => {
        setIsLoading(true);
        await refreshOutlet(outletId);
    };

    const taxRate = outlet ? outlet.tax_rate_percent / 100 : 0.05;

    return (
        <OutletContext.Provider value={{ outlet, allOutlets, isLoading, taxRate, refreshOutlet: () => refreshOutlet(), switchBranch }}>
            {children}
        </OutletContext.Provider>
    );
}

export function useOutlet() {
    const context = useContext(OutletContext);
    if (!context) {
        throw new Error("useOutlet must be used within an OutletProvider");
    }
    return context;
}
