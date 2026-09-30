"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { safeStorage } from "@/lib/safeStorage";

export interface CustomerAddress {
  id: number;
  label: string;
  address_line: string;
  landmark?: string | null;
  is_default: boolean;
}

export interface CustomerProfile {
  id: number;
  phone: string;
  name?: string | null;
  email?: string | null;
  default_address?: string | null;
  addresses: CustomerAddress[];
}

interface CustomerContextType {
  customer: CustomerProfile | null;
  isCustomerLoggedIn: boolean;
  isLoading: boolean;
  pastOrders: any[];
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginCustomer: (token: string, customerData: CustomerProfile) => void;
  logoutCustomer: () => void;
  refreshCustomer: () => Promise<void>;
  requireCustomerAuth: (onSuccessCallback?: () => void) => boolean;
  executePendingAuthCallback: () => void;
  addCustomerAddress: (address: { label: string; address_line: string; landmark?: string; is_default?: boolean }) => Promise<void>;
  fetchPastOrders: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);
export const CUSTOMER_TOKEN_KEY = "surya_customer_token";

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAuthCallback, setPendingAuthCallback] = useState<(() => void) | null>(null);

  const refreshCustomer = useCallback(async () => {
    const token = safeStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!token) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await api.getCustomerProfile();
      setCustomer(profile);
    } catch (err) {
      console.warn("Failed to refresh customer profile, session may have expired:", err);
      safeStorage.removeItem(CUSTOMER_TOKEN_KEY);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPastOrders = useCallback(async () => {
    const token = safeStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!token) return;

    try {
      const orders = await api.getCustomerOrders();
      setPastOrders(orders);
    } catch (err) {
      console.warn("Failed to fetch past customer orders:", err);
    }
  }, []);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  useEffect(() => {
    if (customer) {
      fetchPastOrders();
    } else {
      setPastOrders([]);
    }
  }, [customer, fetchPastOrders]);

  const loginCustomer = useCallback((token: string, customerData: CustomerProfile) => {
    safeStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    setCustomer(customerData);
  }, []);

  const logoutCustomer = useCallback(() => {
    safeStorage.removeItem(CUSTOMER_TOKEN_KEY);
    setCustomer(null);
    setPastOrders([]);
  }, []);

  const requireCustomerAuth = useCallback((onSuccessCallback?: () => void): boolean => {
    if (customer) {
      if (onSuccessCallback) onSuccessCallback();
      return true;
    }
    if (onSuccessCallback) {
      setPendingAuthCallback(() => onSuccessCallback);
    }
    setAuthModalOpen(true);
    return false;
  }, [customer]);

  const executePendingAuthCallback = useCallback(() => {
    if (pendingAuthCallback) {
      try {
        pendingAuthCallback();
      } catch (err) {
        console.error("Error executing post-auth callback:", err);
      } finally {
        setPendingAuthCallback(null);
      }
    }
  }, [pendingAuthCallback]);

  const addCustomerAddress = useCallback(async (addressData: { label: string; address_line: string; landmark?: string; is_default?: boolean }) => {
    const newAddr = await api.addCustomerAddress(addressData);
    setCustomer((prev) => {
      if (!prev) return null;
      const updatedAddresses = addressData.is_default
        ? prev.addresses.map((a) => ({ ...a, is_default: false })).concat(newAddr)
        : [...prev.addresses, newAddr];
      return {
        ...prev,
        default_address: addressData.is_default ? addressData.address_line : prev.default_address,
        addresses: updatedAddresses,
      };
    });
  }, []);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isCustomerLoggedIn: !!customer,
        isLoading,
        pastOrders,
        authModalOpen,
        setAuthModalOpen,
        loginCustomer,
        logoutCustomer,
        refreshCustomer,
        requireCustomerAuth,
        executePendingAuthCallback,
        addCustomerAddress,
        fetchPastOrders,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}
