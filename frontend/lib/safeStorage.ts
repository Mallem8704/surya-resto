/**
 * Safe wrapper for localStorage and sessionStorage for iOS Safari Private Mode
 * and restricted WebViews where window.localStorage / sessionStorage throws SecurityError.
 */

export const safeStorage = {
    getItem(key: string, type: "local" | "session" = "local"): string | null {
        if (typeof window === "undefined") return null;
        try {
            const storage = type === "local" ? window.localStorage : window.sessionStorage;
            return storage ? storage.getItem(key) : null;
        } catch (e) {
            console.warn(`[safeStorage] Error reading ${key} from ${type}Storage`, e);
            return null;
        }
    },

    setItem(key: string, value: string, type: "local" | "session" = "local"): void {
        if (typeof window === "undefined") return;
        try {
            const storage = type === "local" ? window.localStorage : window.sessionStorage;
            if (storage) {
                storage.setItem(key, value);
            }
        } catch (e) {
            console.warn(`[safeStorage] Error writing ${key} to ${type}Storage`, e);
        }
    },

    removeItem(key: string, type: "local" | "session" = "local"): void {
        if (typeof window === "undefined") return;
        try {
            const storage = type === "local" ? window.localStorage : window.sessionStorage;
            if (storage) {
                storage.removeItem(key);
            }
        } catch (e) {
            console.warn(`[safeStorage] Error removing ${key} from ${type}Storage`, e);
        }
    },
};
