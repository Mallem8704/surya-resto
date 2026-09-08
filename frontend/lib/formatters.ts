/**
 * Format currency and date utilities for Tea Time Cafe.
 */

export function formatRupees(paise: number, includeDecimals = true): string {
    if (paise === undefined || paise === null || isNaN(paise)) return "₹0";
    const isNegative = paise < 0;
    const absRupees = Math.abs(paise) / 100;
    const prefix = isNegative ? "-₹" : "₹";
    if (!includeDecimals && Number.isInteger(absRupees)) {
        return `${prefix}${absRupees}`;
    }
    return `${prefix}${absRupees.toFixed(2)}`;
}

export function normalizeDate(dateInput: string | Date): Date {
    if (!dateInput) return new Date();
    if (typeof dateInput === "object") return dateInput;
    const normalized = dateInput.includes("Z") || dateInput.includes("+") ? dateInput : `${dateInput}Z`;
    return new Date(normalized);
}

export function formatDateTime(dateStr: string | Date): string {
    if (!dateStr) return "";
    const date = normalizeDate(dateStr);
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatTimeOnly(dateStr: string | Date): string {
    if (!dateStr) return "";
    const date = normalizeDate(dateStr);
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatRelativeTime(dateStr: string | Date): string {
    if (!dateStr) return "";
    const date = normalizeDate(dateStr);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}
