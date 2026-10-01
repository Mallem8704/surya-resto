/**
 * Surya Family Restaurant Kadiri - System Feature Flags
 * 
 * Controls customer-facing ordering modes.
 * Current Owner Policy: EXCLUSIVELY ONLINE ORDERING (Delivery & Takeaway).
 * Table booking and QR dine-in table ordering are disabled by default.
 * Whenever required in future, toggle the booleans below, set environment variables,
 * or toggle them in the Admin Settings panel (/admin/settings).
 */

export const FEATURES = {
    /**
     * Table Pre-Booking (/book-table)
     * Set NEXT_PUBLIC_ENABLE_TABLE_BOOKING="true" in environment or set to true here to re-enable.
     */
    ENABLE_TABLE_BOOKING: process.env.NEXT_PUBLIC_ENABLE_TABLE_BOOKING === "true" ? true : false,

    /**
     * Dine-in Table QR Ordering (/order)
     * Set NEXT_PUBLIC_ENABLE_TABLE_ORDERING="true" in environment or set to true here to re-enable.
     */
    ENABLE_TABLE_ORDERING: process.env.NEXT_PUBLIC_ENABLE_TABLE_ORDERING === "true" ? true : false,

    /**
     * Online Home Delivery & Takeaway (/delivery)
     * Active primary customer ordering flow.
     */
    ENABLE_ONLINE_ORDERING: true,
};

/**
 * Check if Table Pre-Booking is enabled.
 * Prioritizes dynamic outlet configuration from database/admin settings if available,
 * otherwise falls back to the static feature flag.
 */
export function isTableBookingEnabled(outlet?: { allow_table_booking?: boolean } | null): boolean {
    if (outlet && typeof outlet.allow_table_booking === "boolean") {
        return outlet.allow_table_booking;
    }
    return FEATURES.ENABLE_TABLE_BOOKING;
}

/**
 * Check if Table QR Ordering is enabled.
 * Prioritizes dynamic outlet configuration from database/admin settings if available,
 * otherwise falls back to the static feature flag.
 */
export function isTableOrderingEnabled(outlet?: { allow_table_ordering?: boolean } | null): boolean {
    if (outlet && typeof outlet.allow_table_ordering === "boolean") {
        return outlet.allow_table_ordering;
    }
    return FEATURES.ENABLE_TABLE_ORDERING;
}

/**
 * Check if Online Home Delivery & Takeaway is enabled.
 */
export function isDeliveryEnabled(outlet?: { allow_delivery?: boolean } | null): boolean {
    if (outlet && typeof outlet.allow_delivery === "boolean") {
        return outlet.allow_delivery;
    }
    return FEATURES.ENABLE_ONLINE_ORDERING;
}

export default FEATURES;
