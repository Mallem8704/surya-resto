/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SURYA DINEOS — BROWSER-NATIVE THERMAL POS RECEIPT & KOT PRINTING ENGINE
 * ═════════════════════════════════════════════════════════════════════════════
 * Supports standard 80mm (3.125" / 72mm printable) and 58mm (2.25" / 48mm printable)
 * Thermal Printers (ESC/POS, TVS-E RP3160, Epson TM-T82, Posiflex, NGX, Xprinter, etc.).
 *
 * Ultra-compact paper-saving formatting:
 * - Zero margin (@page { margin: 0 }), zero trailing feeds for immediate cutter trigger
 * - Micro line-heights (1.12 - 1.16) and responsive font scaling
 * - 58mm optimized column layout with zero clipping
 * - 100% Zero-NaN & Zero-Undefined guarantees
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WINDOWS POS KIOSK SILENT PRINTING CONFIGURATION GUIDE (`--kiosk-printing`)
 * ─────────────────────────────────────────────────────────────────────────────
 * By default, modern desktop browsers (Chrome / Edge) pop up a Print Preview
 * modal for every bill or KOT, requiring cashiers to press Enter or click "Print".
 * On fast-paced restaurant billing desks, this creates bottlenecks.
 *
 * Follow these 4 steps to enable INSTANT, SILENT, 0-CLICK PRINTING on Windows:
 *
 * STEP 1: CONFIGURE WINDOWS DEFAULT PRINTER
 *   1. Open Windows Settings -> "Bluetooth & devices" -> "Printers & scanners".
 *   2. Select your USB or Ethernet Thermal Receipt Printer (e.g. TVS RP3160 / Epson TM-T82).
 *   3. Click "Set as default".
 *   4. Click "Printing preferences":
 *      - Paper Size: Set to "80 x 297 mm" (or "Receipt" / "Continuous") for 80mm,
 *        or "58 x 210 mm" for 58mm rolls.
 *      - Margins: Set to "0mm" or "None".
 *      - Paper Cut: Set to "Cut at end of page" or "Partial Cut".
 *      - Cash Drawer (optional): Select "Open cash drawer before/after print" on PIN 2/5.
 *
 * STEP 2: CREATE WINDOWS DESKTOP SHORTCUT WITH `--kiosk-printing`
 *   1. Right-click the Windows Desktop -> New -> Shortcut.
 *   2. In "Type the location of the item", paste ONE of the following:
 *
 *      FOR GOOGLE CHROME:
 *      "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000/admin/pos
 *
 *      FOR MICROSOFT EDGE:
 *      "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=http://localhost:3000/admin/pos
 *
 *      FOR FULLSCREEN LOCKED KIOSK MODE (Prevents staff from closing or minimizing POS):
 *      "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --app=http://localhost:3000/admin/pos
 *
 *   3. Click Next, name it "Surya POS Terminal", and click Finish.
 *
 * STEP 3: ONE-TIME BROWSER PRESET IN CHROME/EDGE
 *   1. Open the shortcut once and press Ctrl + P on any page to open print preview.
 *   2. Destination: Select your Thermal Receipt Printer.
 *   3. Margins: Select "None".
 *   4. Options: UNCHECK "Headers and Footers" (removes URL, date, and page numbers from receipt).
 *   5. Options: CHECK "Background graphics".
 *   6. Click "Print" once. Chrome will permanently cache these presets for this origin.
 *
 * STEP 4: VERIFY SILENT PRINTING
 *   From now on, clicking "Print Bill", "Send KOT", or pressing F9/F12 will
 *   instantly shoot the raw ESC/POS raster print to the thermal printer
 *   in < 300ms with zero dialogs!
 * ═════════════════════════════════════════════════════════════════════════════
 */

export type ThermalPaperWidth = "80mm" | "58mm";

/**
 * Detailed Kiosk Printing configuration metadata for documentation modals and setup wizards.
 */
export const KIOSK_PRINTING_GUIDE = {
    title: "Windows POS Kiosk Silent Printing Setup Guide",
    flag: "--kiosk-printing",
    chromeCommand: `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=http://localhost:3000/admin/pos`,
    edgeCommand: `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app=http://localhost:3000/admin/pos`,
    fullscreenKioskCommand: `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk --kiosk-printing --app=http://localhost:3000/admin/pos`,
    steps: [
        {
            step: 1,
            title: "Set Default Windows Printer",
            description: "In Windows Settings > Printers & scanners, set your thermal printer (TVS/Epson/Xprinter) as default. Set paper to 80mm or 58mm Continuous and enable auto-cut.",
        },
        {
            step: 2,
            title: "Create Windows Desktop Shortcut",
            description: "Create a desktop shortcut pointing to Chrome or Edge with the --kiosk-printing flag and --app=http://localhost:3000/admin/pos.",
        },
        {
            step: 3,
            title: "One-Time Print Dialog Presets",
            description: "Press Ctrl+P once in Chrome: Set destination to thermal printer, set Margins to 'None', UNCHECK 'Headers and footers', and CHECK 'Background graphics'.",
        },
        {
            step: 4,
            title: "Silent Auto-Print Activated",
            description: "All KOT and customer bill receipts print instantly with 0 confirmation dialogs!",
        },
    ],
};

/**
 * Get active paper size preference from localStorage (defaults to 80mm)
 */
export function getThermalPaperSize(): ThermalPaperWidth {
    if (typeof window === "undefined") return "80mm";
    try {
        const saved = localStorage.getItem("pos_thermal_paper_width");
        if (saved === "58mm" || saved === "80mm") return saved;
    } catch {
        // Fallback on storage errors
    }
    return "80mm";
}

/**
 * Set active paper size preference in localStorage
 */
export function setThermalPaperSize(size: ThermalPaperWidth): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem("pos_thermal_paper_width", size);
    } catch {
        // Fallback on storage errors
    }
}

export interface PrintOrderItem {
    id?: number;
    item_name: string;
    variant_name?: string | null;
    selected_addons_json?: string | null;
    qty: number;
    unit_price_paise?: number;
    total_price_paise?: number;
    notes?: string | null;
}

export interface PrintOrderData {
    id: number | string;
    order_number: string;
    order_type?: string;
    table_id?: number | null;
    table_label?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    delivery_address?: string | null;
    payment_method?: string;
    payment_status?: string;
    subtotal_paise?: number;
    discount_paise?: number;
    coupon_code?: string | null;
    tax_paise?: number;
    delivery_fee_paise?: number;
    parcel_charge_paise?: number;
    total_paise?: number;
    token_number?: string | number;
    daily_token?: string | number;
    customer_notes?: string | null;
    created_at?: string;
    items: PrintOrderItem[];
}

export interface PrintOutletData {
    id?: number;
    name?: string;
    address?: string | null;
    phone?: string | null;
    tax_rate_percent?: number;
    tagline?: string | null;
    upi_vpa?: string | null;
    gstin?: string | null;
    fssai_license_number?: string | null;
}

function parseAddons(jsonStr?: string | null): string[] {
    if (!jsonStr) return [];
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            return parsed.map((a: any) => (typeof a === "string" ? a : a.name || ""));
        }
    } catch {
        // Ignore JSON parse error
    }
    return [];
}

/**
 * 1. Print Kitchen Order Ticket (KOT) for Chefs (80mm & 58mm Paper-Saving Layout)
 */
export function printKOT(
    order: PrintOrderData,
    outlet?: PrintOutletData | null,
    rollWidth?: ThermalPaperWidth
) {
    const paperWidth = rollWidth || getThermalPaperSize();
    const is58 = paperWidth === "58mm";
    const bodyWidth = is58 ? "48mm" : "72mm";
    const baseFontSize = is58 ? "9.5px" : "11px";
    const titleFontSize = is58 ? "12.5px" : "14px";
    const badgeFontSize = is58 ? "13px" : "15px";
    const itemFontSize = is58 ? "12px" : "13.5px";
    const qtyBadgeSize = is58 ? "12.5px" : "14px";

    const isDelivery = order.order_type === "delivery";
    const isTakeaway = order.order_type === "takeaway";
    const titleTag = isDelivery ? "[DELIVERY]" : isTakeaway ? "[TAKEAWAY]" : `[TABLE: ${order.table_label || "1"}]`;
    
    const formattedTime = order.created_at
        ? new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const formattedDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const rawItems = order.items || (order as any).order_items || [];
    let itemsHtml = "";
    rawItems.forEach((item: any, idx: number) => {
        const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
        const itemName = item.item_name || item.menu_item?.name || `Item #${item.item_id || idx + 1}`;
        const addons = parseAddons(item.selected_addons_json);

        itemsHtml += `
            <div style="margin-bottom: 2.5px; padding-bottom: 2.5px; border-bottom: 1px dashed #777;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
                    <span style="font-size: ${itemFontSize}; font-weight: 800; line-height: 1.15; flex: 1;">
                        ${idx + 1}. ${itemName}
                    </span>
                    <span style="font-size: ${qtyBadgeSize}; font-weight: 900; background: #000; color: #fff; padding: 1px 5px; border-radius: 2px; font-variant-numeric: tabular-nums; white-space: nowrap;">
                        x${qty}
                    </span>
                </div>
                ${item.variant_name ? `<div style="font-size: ${is58 ? "9px" : "10px"}; font-weight: 700; color: #222; margin-left: ${is58 ? "6px" : "10px"}; margin-top: 1px;">> ${item.variant_name}</div>` : ""}
                ${addons.length > 0 ? `<div style="font-size: ${is58 ? "8.5px" : "9.5px"}; color: #444; margin-left: ${is58 ? "6px" : "10px"};">+ ${addons.join(", ")}</div>` : ""}
                ${item.notes ? `<div style="font-size: ${is58 ? "9px" : "10.5px"}; font-weight: 800; color: #000; background: #eee; padding: 1px 3px; margin-top: 1.5px; border-left: 2px solid #000;">NOTE: ${item.notes.toUpperCase()}</div>` : ""}
            </div>
        `;
    });

    const kotHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>KOT - #${order.order_number}</title>
            <style>
                @page { margin: 0; size: ${is58 ? "58mm" : "80mm"} auto; }
                body {
                    font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
                    width: ${bodyWidth};
                    margin: 0 auto;
                    padding: 0;
                    color: #000;
                    background: #fff;
                    line-height: 1.18;
                    font-size: ${baseFontSize};
                    -webkit-font-smoothing: antialiased;
                }
                .text-center { text-align: center; }
                .bold { font-weight: 800; }
                .divider { border-top: 1.5px solid #000; margin: 2.5px 0; }
                .dashed-divider { border-top: 1px dashed #666; margin: 2px 0; }
                .badge {
                    font-size: ${badgeFontSize};
                    font-weight: 900;
                    text-align: center;
                    border: 1.5px solid #000;
                    padding: 2.5px 0;
                    margin: 2.5px 0;
                    text-transform: uppercase;
                    background: #000;
                    color: #fff;
                    letter-spacing: 0.5px;
                    border-radius: 2px;
                }
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="text-center bold" style="font-size: ${titleFontSize}; letter-spacing: 0.5px; text-transform: uppercase;">
                KITCHEN ORDER TICKET (KOT)
            </div>
            <div class="text-center" style="font-size: ${is58 ? "9px" : "10.5px"}; font-weight: 600; color: #444;">
                ${outlet?.name || "SURYA FAMILY RESTAURANT"}
            </div>
            
            <div class="badge">${titleTag}</div>

            <div style="font-size: ${baseFontSize}; display: flex; justify-content: space-between; margin-top: 1px;">
                <span>KOT No: <strong>#${order.order_number}</strong></span>
                <span>${formattedTime}</span>
            </div>
            <div style="font-size: ${is58 ? "8.5px" : "9.5px"}; color: #444;">Date: ${formattedDate}</div>
            ${order.customer_name ? `<div style="font-size: ${is58 ? "8.5px" : "9.5px"};">Guest: <strong>${order.customer_name}</strong> ${order.customer_phone ? `(${order.customer_phone})` : ""}</div>` : ""}

            <div class="divider"></div>
            <div style="font-size: ${is58 ? "9.5px" : "10.5px"}; font-weight: 800; text-transform: uppercase;">ORDERED ITEMS</div>
            <div class="dashed-divider"></div>

            ${itemsHtml}

            <div class="divider"></div>
            <div class="text-center" style="font-size: ${is58 ? "8.5px" : "9.5px"}; font-weight: 700; margin-top: 2px;">
                *** DISPATCH TO CHEF IMMEDIATELY ***
            </div>
        </body>
        </html>
    `;

    triggerBrowserPrint(kotHtml);
}

/**
 * 2. Print Running KOT (Extra Items Added to Table Round 2+)
 */
export function printRunningKOT(
    order: PrintOrderData,
    newItems: Array<{ item_name: string; variant_name?: string; qty?: number; quantity?: number; notes?: string }>,
    outlet?: PrintOutletData | null,
    captainName: string = "Captain",
    rollWidth?: ThermalPaperWidth
) {
    const paperWidth = rollWidth || getThermalPaperSize();
    const is58 = paperWidth === "58mm";
    const bodyWidth = is58 ? "48mm" : "72mm";
    const baseFontSize = is58 ? "9.5px" : "11px";
    const titleFontSize = is58 ? "12px" : "13.5px";
    const badgeFontSize = is58 ? "13px" : "15px";
    const itemFontSize = is58 ? "12px" : "13.5px";
    const qtyBadgeSize = is58 ? "12.5px" : "14px";

    const formattedTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const formattedDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    let itemsHtml = "";
    newItems.forEach((item: any, idx: number) => {
        const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
        itemsHtml += `
            <div style="margin-bottom: 2.5px; padding-bottom: 2.5px; border-bottom: 1px dashed #777;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
                    <span style="font-size: ${itemFontSize}; font-weight: 800; line-height: 1.15; flex: 1;">
                        ${idx + 1}. ${item.item_name}
                    </span>
                    <span style="font-size: ${qtyBadgeSize}; font-weight: 900; background: #000; color: #fff; padding: 1px 5px; border-radius: 2px; font-variant-numeric: tabular-nums;">
                        +${qty}
                    </span>
                </div>
                ${item.variant_name ? `<div style="font-size: ${is58 ? "9px" : "10px"}; font-weight: 700; margin-left: ${is58 ? "6px" : "10px"}; margin-top: 1px;">> ${item.variant_name}</div>` : ""}
                ${item.notes ? `<div style="font-size: ${is58 ? "9px" : "10.5px"}; font-weight: 800; background: #eee; padding: 1px 3px; margin-top: 1.5px; border-left: 2px solid #000;">NOTE: ${item.notes.toUpperCase()}</div>` : ""}
            </div>
        `;
    });

    const runningKotHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Running KOT - #${order.order_number}</title>
            <style>
                @page { margin: 0; size: ${is58 ? "58mm" : "80mm"} auto; }
                body {
                    font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
                    width: ${bodyWidth};
                    margin: 0 auto;
                    padding: 0;
                    color: #000;
                    background: #fff;
                    line-height: 1.18;
                    font-size: ${baseFontSize};
                    -webkit-font-smoothing: antialiased;
                }
                .text-center { text-align: center; }
                .bold { font-weight: 800; }
                .divider { border-top: 1.5px solid #000; margin: 2.5px 0; }
                .dashed-divider { border-top: 1px dashed #666; margin: 2px 0; }
                .badge {
                    font-size: ${badgeFontSize};
                    font-weight: 900;
                    text-align: center;
                    border: 1.5px solid #000;
                    padding: 2.5px 0;
                    margin: 2.5px 0;
                    background: #000;
                    color: #fff;
                    border-radius: 2px;
                }
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="text-center bold" style="font-size: ${titleFontSize}; letter-spacing: 0.5px;">RUNNING KOT (ADD-ON ROUND)</div>
            <div class="text-center" style="font-size: ${is58 ? "9px" : "10px"}; font-weight: 600; color: #444;">${outlet?.name || "SURYA FAMILY RESTAURANT"}</div>
            
            <div class="badge">TABLE ${order.table_label || "1"}</div>

            <div style="font-size: ${baseFontSize}; display: flex; justify-content: space-between;">
                <span>Order No: <strong>#${order.order_number}</strong></span>
                <span>${formattedTime}</span>
            </div>
            <div style="font-size: ${is58 ? "8.5px" : "9.5px"}; color: #444;">Captain: <strong>${captainName}</strong> • Date: ${formattedDate}</div>

            <div class="divider"></div>
            <div style="font-size: ${is58 ? "9.5px" : "10.5px"}; font-weight: 800; text-transform: uppercase;">NEW ITEMS ADDED</div>
            <div class="dashed-divider"></div>

            ${itemsHtml}

            <div class="divider"></div>
            <div class="text-center" style="font-size: ${is58 ? "8.5px" : "9.5px"}; font-weight: 700; margin-top: 2px;">
                *** DISPATCH TO CHEF IMMEDIATELY ***
            </div>
        </body>
        </html>
    `;

    triggerBrowserPrint(runningKotHtml);
}

/**
 * Format date exactly as physical restaurant billing machine: "02 Oct 2026 06:16 PM"
 */
function formatThermalInvoiceDate(dateInput?: string | Date): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, "0");
    return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * 3. Print Official Tax Invoice & Cashier POS Receipt (Exact match to Surya physical thermal invoice)
 */
export function printPOSReceipt(
    order: PrintOrderData,
    outlet?: PrintOutletData | null,
    rollWidth?: ThermalPaperWidth
) {
    const paperWidth = rollWidth || getThermalPaperSize();
    const is58 = paperWidth === "58mm";
    const bodyWidth = is58 ? "48mm" : "72mm";
    const baseFontSize = is58 ? "10px" : "12px";
    const headerFontSize = is58 ? "13px" : "15px";

    const formattedDate = formatThermalInvoiceDate(order.created_at);

    // Clean Bill Number (e.g. "4026")
    const rawOrderNo = String(order.order_number || order.id || "4026");
    const billNo = rawOrderNo.replace(/^SURYA-/, "").replace(/^ORD-/, "").replace(/^DEL-/, "").replace(/^DINE-/, "");

    // Large Center Call / Token Number (e.g. "43")
    const tokenNumber =
        (order as any).token_number ||
        (order as any).daily_token ||
        (order as any).kot_token ||
        (rawOrderNo.match(/\d+$/) ? rawOrderNo.match(/\d+$/)![0].slice(-2) : "") ||
        String(order.id || "43").slice(-2);

    // Order type label
    let orderTypeLabel = "Take Away";
    if (order.order_type === "delivery") {
        orderTypeLabel = "Home Delivery";
    } else if (order.order_type === "dine_in" || order.table_label) {
        orderTypeLabel = order.table_label ? `Dine In (Table ${order.table_label})` : "Dine In";
    }

    const rawItems = order.items || (order as any).order_items || [];
    let calculatedSubtotal = 0;

    let itemsRows = "";
    rawItems.forEach((it: any) => {
        const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
        const unitPricePaise = Number(it.unit_price_paise ?? it.price_paise ?? 0) || 0;
        const lineTotalPaise = Number(it.total_price_paise) || (unitPricePaise * qty);
        calculatedSubtotal += lineTotalPaise;

        const itemName = it.item_name || it.menu_item?.name || "Dish";
        const addons = parseAddons(it.selected_addons_json);
        const itemTotalPriceRs = (lineTotalPaise / 100).toFixed(2);

        // Sub details line: e.g. "(Bone) (Juice)(6 P" or "Dum Biryani Full"
        let subDetails: string[] = [];
        if (it.variant_name) subDetails.push(it.variant_name);
        if (addons.length > 0) subDetails.push(...addons);
        if (it.notes) subDetails.push(it.notes);
        const subText = subDetails.join(" ");

        itemsRows += `
            <tr>
                <td style="vertical-align: top; width: 14%; text-align: left; padding: 2px 0;">
                    ${qty}
                </td>
                <td style="vertical-align: top; text-align: left; padding: 2px 0; word-break: break-word;">
                    <div>${itemName}</div>
                    ${subText ? `<div style="font-size: ${is58 ? "8.5px" : "10px"}; padding-left: 2px; color: #111;">${subText}</div>` : ""}
                </td>
                <td style="vertical-align: top; width: 28%; text-align: right; padding: 2px 0; font-variant-numeric: tabular-nums;">
                    ${itemTotalPriceRs}
                </td>
            </tr>
        `;
    });

    const subtotalPaise = Number(order.subtotal_paise ?? (order as any).total_price_paise ?? calculatedSubtotal) || calculatedSubtotal;
    const discountPaise = Number(order.discount_paise ?? 0) || 0;
    const netAfterDiscountPaise = Math.max(0, subtotalPaise - discountPaise);
    const taxRate = Number(outlet?.tax_rate_percent ?? 5) || 5;
    const taxPaise = Number(order.tax_paise ?? Math.round(netAfterDiscountPaise * (taxRate / 100))) || 0;
    const parcelChargePaise = Number(order.parcel_charge_paise ?? (order as any).packaging_charge_paise ?? 0) || 0;
    const deliveryFeePaise = Number(order.delivery_fee_paise ?? 0) || 0;
    const totalPaise = Number(order.total_paise ?? (order as any).total_price_paise ?? (netAfterDiscountPaise + taxPaise + parcelChargePaise + deliveryFeePaise)) || (netAfterDiscountPaise + taxPaise + parcelChargePaise + deliveryFeePaise);

    const subtotalRs = (subtotalPaise / 100).toFixed(2);
    const discountRs = (discountPaise / 100).toFixed(2);
    const taxRs = (taxPaise / 100).toFixed(2);
    const parcelChargeRs = (parcelChargePaise / 100).toFixed(2);
    const totalRs = (totalPaise / 100).toFixed(2);

    const paymentMethodName = order.payment_method === "upi" ? "UPI" : order.payment_method === "card" ? "Card" : "Cash";

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Invoice #${billNo}</title>
            <style>
                @page { margin: 0; size: ${is58 ? "58mm" : "80mm"} auto; }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
                    width: ${bodyWidth};
                    margin: 0 auto;
                    padding: 4px 2px 20px 2px;
                    color: #000;
                    background: #fff;
                    font-size: ${baseFontSize};
                    line-height: 1.25;
                    font-weight: 600;
                    -webkit-font-smoothing: none;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: 700; }
                .dashed-divider {
                    border-top: 1px dashed #000;
                    margin: 4px 0;
                    width: 100%;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-family: inherit;
                    font-size: inherit;
                }
                th {
                    font-weight: 700;
                    padding: 2px 0;
                    font-size: inherit;
                }
                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 2px !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <!-- Store Header -->
            <div class="text-center" style="font-size: ${headerFontSize}; font-weight: 700; line-height: 1.2;">
                Surya Family Restaurent
            </div>
            <div class="text-center" style="font-size: ${is58 ? "9px" : "11px"}; margin-top: 1px;">
                Opp RTC Bus stand,Kadiri
            </div>
            <div class="text-center" style="font-size: ${is58 ? "9.5px" : "11.5px"}; margin-top: 2px;">
                Tell No:890
            </div>

            <div class="dashed-divider"></div>

            <!-- INVOICE TITLE -->
            <div class="text-center bold" style="letter-spacing: 2px; font-size: ${is58 ? "11px" : "13px"}; padding: 1px 0;">
                INVOICE
            </div>

            <div class="dashed-divider"></div>

            <!-- Bill Details -->
            <div style="font-size: inherit; line-height: 1.3;">
                <div>Bill No: ${billNo}</div>
                <div>Date:${formattedDate}</div>
                <div>Crew:Surya Family Restaurant</div>
                <div>${orderTypeLabel}</div>
            </div>

            <!-- BIG CENTERED TOKEN NUMBER -->
            <div class="text-center bold" style="font-size: ${is58 ? "20px" : "24px"}; margin: 4px 0; letter-spacing: 1px;">
                ${tokenNumber}
            </div>

            <div class="dashed-divider"></div>

            <!-- Table Header -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 14%; text-align: left;">QTY</th>
                        <th style="text-align: left;">ITEM NAME</th>
                        <th style="width: 28%; text-align: right;">Amount</th>
                    </tr>
                </thead>
            </table>

            <div class="dashed-divider"></div>

            <!-- Items Rows -->
            <table>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="dashed-divider"></div>

            <!-- Totals & Tender -->
            <table style="width: 100%;">
                <tr>
                    <td style="text-align: right; padding: 1px 0;">SubTotal:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">${subtotalRs}</td>
                </tr>
                ${discountPaise > 0 ? `
                <tr>
                    <td style="text-align: right; padding: 1px 0;">Discount:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">-${discountRs}</td>
                </tr>
                ` : ""}
                ${parcelChargePaise > 0 ? `
                <tr>
                    <td style="text-align: right; padding: 1px 0;">Packaging:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">${parcelChargeRs}</td>
                </tr>
                ` : ""}
                ${taxPaise > 0 ? `
                <tr>
                    <td style="text-align: right; padding: 1px 0;">Tax/GST:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">${taxRs}</td>
                </tr>
                ` : ""}
                <tr>
                    <td style="text-align: right; padding: 1px 0;">Net Amt:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">${totalRs}</td>
                </tr>
                <tr>
                    <td colspan="2" style="height: 6px;"></td>
                </tr>
                <tr>
                    <td style="text-align: right; padding: 1px 0;">${paymentMethodName}:</td>
                    <td style="text-align: right; width: 30%; padding: 1px 0; font-variant-numeric: tabular-nums;">${totalRs}</td>
                </tr>
            </table>

            <div class="dashed-divider"></div>

            <!-- Footer -->
            <div class="text-center bold" style="margin-top: 6px; font-size: inherit;">
                Thank You! Visit Again
            </div>
            <div style="height: 14px;"></div>
        </body>
        </html>
    `;

    triggerBrowserPrint(receiptHtml);
}

/**
 * 4. Test Print Sample (80mm & 58mm)
 */
export function printTestReceipt(outlet?: PrintOutletData | null, rollWidth?: ThermalPaperWidth) {
    const paperWidth = rollWidth || getThermalPaperSize();
    const sampleOrder: PrintOrderData = {
        id: 4026,
        order_number: "4026",
        order_type: "takeaway",
        token_number: "43",
        customer_name: "Walk-in Guest",
        customer_phone: "9880358634",
        subtotal_paise: 49000,
        discount_paise: 0,
        tax_paise: 0,
        total_paise: 49000,
        payment_method: "cash",
        payment_status: "paid",
        created_at: new Date().toISOString(),
        items: [
            { item_name: "Chicken Lollipop", variant_name: "(Bone) (Juice)(6 P", qty: 1, unit_price_paise: 27000, total_price_paise: 27000 },
            { item_name: "Hyderabadi Chicken", variant_name: "Dum Biryani Full", qty: 1, unit_price_paise: 22000, total_price_paise: 22000 },
        ],
    };

    printPOSReceipt(sampleOrder, outlet, paperWidth);
}

/**
 * 5. Print End-of-Day (EOD) Z-Report for Cashier & Store Manager Reconciliation (80mm & 58mm).
 */
export function printEODZReport(report: any, outlet?: PrintOutletData | null, rollWidth?: ThermalPaperWidth) {
    if (typeof window === "undefined" || !report) return;

    const paperWidth = rollWidth || getThermalPaperSize();
    const is58 = paperWidth === "58mm";
    const bodyWidth = is58 ? "48mm" : "72mm";
    const baseFontSize = is58 ? "9.5px" : "11px";

    const outletName = (report.outlet?.name || outlet?.name || "SURYA FAMILY RESTAURANT").toUpperCase();
    const outletAddress = report.outlet?.address || outlet?.address || "Kadiri, Andhra Pradesh";
    const outletPhone = report.outlet?.phone || outlet?.phone || "+91 98803 58634";

    const s = report.sales_summary || {};
    const pm = report.payment_methods || {};
    const topItems = report.top_selling_items || [];

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>EOD Z-Report - ${report.report_date}</title>
    <style>
        @page {
            size: ${is58 ? "58mm" : "80mm"} auto;
            margin: 0;
        }
        body {
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 1px 0;
            font-size: ${baseFontSize};
            color: #000;
            line-height: 1.18;
            -webkit-font-smoothing: antialiased;
        }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .double-line { border-bottom: 1.5px dashed #000; margin: 3px 0; }
        .single-line { border-bottom: 1px dashed #666; margin: 2px 0; }
        .row { display: flex; justify-content: space-between; margin: 1px 0; }
        .section-header { font-weight: 700; margin: 3px 0 1px 0; font-size: ${is58 ? "9px" : "10px"}; text-transform: uppercase; }
        @media print {
            html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="center bold" style="font-size: ${is58 ? "12px" : "13.5px"}; text-transform: uppercase;">${outletName}</div>
    <div class="center" style="font-size: ${is58 ? "8px" : "9px"}; color: #444;">${outletAddress}</div>
    <div class="center" style="font-size: ${is58 ? "8px" : "9px"}; color: #444;">Ph: ${outletPhone}</div>

    <div class="double-line"></div>
    <div class="center bold" style="font-size: ${is58 ? "10.5px" : "11.5px"}; text-transform: uppercase;">DAILY Z-REPORT / REGISTER CLOSE</div>
    <div class="center" style="font-size: ${is58 ? "8.5px" : "9.5px"}; color: #333;">Date: ${report.report_date}</div>
    <div class="center" style="font-size: ${is58 ? "8px" : "8.5px"}; color: #666;">Printed: ${new Date().toLocaleString('en-IN')}</div>
    <div class="double-line"></div>

    <div class="section-header">1. FINANCIAL SUMMARY</div>
    <div class="row"><span>Total Orders:</span><span><strong>${s.total_orders || 0}</strong></span></div>
    <div class="row"><span>Gross Sales:</span><span>₹${(s.gross_sales_rupees || 0).toFixed(2)}</span></div>
    ${(s.total_discount_rupees || 0) > 0 ? `<div class="row"><span>Discounts:</span><span>-₹${(s.total_discount_rupees || 0).toFixed(2)}</span></div>` : ''}
    <div class="row"><span>Tax (GST):</span><span>₹${(s.tax_collected_rupees || s.total_tax_rupees || 0).toFixed(2)}</span></div>
    <div class="single-line"></div>
    <div class="row bold" style="font-size: ${is58 ? "11px" : "12.5px"};"><span>NET REVENUE:</span><span>₹${(s.net_sales_rupees || s.total_revenue_rupees || 0).toFixed(2)}</span></div>

    <div class="double-line"></div>
    <div class="section-header">2. PAYMENT TENDER BREAKDOWN</div>
    <div class="row"><span>Cash:</span><span><strong>₹${(pm.cash?.total_rupees || 0).toFixed(2)}</strong> (${pm.cash?.count || 0})</span></div>
    <div class="row"><span>UPI / QR:</span><span><strong>₹${(pm.upi?.total_rupees || 0).toFixed(2)}</strong> (${pm.upi?.count || 0})</span></div>
    <div class="row"><span>Card / Other:</span><span><strong>₹${(pm.card?.total_rupees || 0).toFixed(2)}</strong> (${pm.card?.count || 0})</span></div>

    ${topItems.length > 0 ? `
    <div class="double-line"></div>
    <div class="section-header">3. TOP SELLING DISHES</div>
    ${topItems.map((it: any, i: number) => `
        <div class="row" style="font-size: ${is58 ? "8.5px" : "9.5px"};">
            <span>${i + 1}. ${it.item_name} (x${it.qty_sold})</span>
            <span>₹${(it.revenue_rupees || 0).toFixed(2)}</span>
        </div>
    `).join('')}
    ` : ''}

    <div class="double-line"></div>
    <div style="margin-top: 8px;">
        <div class="row" style="font-size: ${is58 ? "8.5px" : "9px"};">
            <span>Cashier: ________________</span>
        </div>
        <div class="row" style="margin-top: 6px; font-size: ${is58 ? "8.5px" : "9px"};">
            <span>Manager: ________________</span>
        </div>
    </div>
    <div class="center" style="font-size: 8px; margin-top: 4px; color: #666;">
        End of Z-Report • Surya DineOS
    </div>
</body>
</html>
    `;

    triggerBrowserPrint(htmlContent);
}

/**
 * 6. Print Cashier Shift Handover & Drawer Closing Slip (80mm & 58mm).
 */
export function printShiftHandoverReport(handover: any, outlet?: PrintOutletData | null, rollWidth?: ThermalPaperWidth) {
    if (typeof window === "undefined" || !handover) return;

    const paperWidth = rollWidth || getThermalPaperSize();
    const is58 = paperWidth === "58mm";
    const bodyWidth = is58 ? "48mm" : "72mm";
    const baseFontSize = is58 ? "9.5px" : "11px";

    const outletName = (handover.outlet_name || outlet?.name || "SURYA FAMILY RESTAURANT").toUpperCase();
    const openTime = handover.opened_at ? new Date(handover.opened_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";
    const closeTime = handover.closed_at ? new Date(handover.closed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";
    const shiftDate = handover.opened_at ? new Date(handover.opened_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN");

    const diff = Number(handover.difference_rupees || 0);
    const diffColor = diff === 0 ? "#000" : diff > 0 ? "green" : "red";
    const diffLabel = diff === 0 ? "EXACT MATCH (₹0.00)" : diff > 0 ? `+₹${diff.toFixed(2)} (OVERAGE)` : `-₹${Math.abs(diff).toFixed(2)} (SHORTAGE)`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Shift Handover - #${handover.shift_id}</title>
    <style>
        @page { size: ${is58 ? "58mm" : "80mm"} auto; margin: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 1px 0;
            font-size: ${baseFontSize};
            color: #000;
            line-height: 1.18;
            -webkit-font-smoothing: antialiased;
        }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .double-line { border-bottom: 1.5px dashed #000; margin: 3px 0; }
        .single-line { border-bottom: 1px dashed #666; margin: 2px 0; }
        .row { display: flex; justify-content: space-between; margin: 1.5px 0; }
        .section-header { font-weight: 700; margin: 3px 0 1px 0; font-size: ${is58 ? "9px" : "10px"}; text-transform: uppercase; }
        @media print {
            html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="center bold" style="font-size: ${is58 ? "12px" : "13.5px"}; text-transform: uppercase;">${outletName}</div>
    <div class="double-line"></div>
    <div class="center bold" style="font-size: ${is58 ? "10.5px" : "11.5px"}; text-transform: uppercase;">SHIFT HANDOVER / X-REPORT</div>
    <div class="center" style="font-size: ${is58 ? "8.5px" : "9.5px"}; color: #333;">Shift #${handover.shift_id}: ${handover.shift_name || "Counter Shift"}</div>
    <div class="center" style="font-size: ${is58 ? "8.5px" : "9.5px"};">Cashier: <strong>${handover.cashier_name || "Staff"}</strong></div>
    <div class="center" style="font-size: ${is58 ? "8px" : "8.5px"}; color: #555;">Date: ${shiftDate} (${openTime} - ${closeTime})</div>
    <div class="double-line"></div>

    <div class="section-header">1. DRAWER RECONCILIATION</div>
    <div class="row"><span>(+) Opening Float:</span><span>₹${(handover.opening_float_rupees || 0).toFixed(2)}</span></div>
    <div class="row"><span>(+) Cash Sales:</span><span>₹${(handover.cash_sales_rupees || 0).toFixed(2)}</span></div>
    ${handover.petty_cash_in_rupees ? `<div class="row"><span>(+) Petty Cash In:</span><span>₹${Number(handover.petty_cash_in_rupees).toFixed(2)}</span></div>` : ''}
    ${handover.petty_cash_out_rupees ? `<div class="row"><span>(-) Petty Cash Out:</span><span>-₹${Number(handover.petty_cash_out_rupees).toFixed(2)}</span></div>` : ''}
    <div class="single-line"></div>
    <div class="row bold"><span>(=) Expected Cash:</span><span>₹${(handover.expected_cash_rupees || 0).toFixed(2)}</span></div>
    <div class="row bold" style="font-size: ${is58 ? "10.5px" : "11.5px"};"><span>(✓) Counted Cash:</span><span>₹${(handover.actual_cash_rupees || 0).toFixed(2)}</span></div>
    <div class="single-line"></div>
    <div class="row bold" style="font-size: ${is58 ? "10.5px" : "11.5px"}; color: ${diffColor};">
        <span>Difference:</span>
        <span>${diffLabel}</span>
    </div>

    <div class="double-line"></div>
    <div class="section-header">2. NON-CASH SALES</div>
    <div class="row"><span>UPI / Online QR:</span><span>₹${(handover.upi_sales_rupees || 0).toFixed(2)}</span></div>
    <div class="row"><span>Card / POS Swipe:</span><span>₹${(handover.card_sales_rupees || 0).toFixed(2)}</span></div>
    <div class="row bold"><span>Total Business:</span><span>₹${(handover.total_sales_rupees || 0).toFixed(2)} (${handover.total_orders_count || 0} orders)</span></div>

    ${handover.notes ? `
    <div class="double-line"></div>
    <div style="font-size: ${is58 ? "8.5px" : "9px"}; color: #333;"><strong>Notes:</strong> ${handover.notes}</div>
    ` : ''}

    <div class="double-line"></div>
    <div style="margin-top: 10px;">
        <div class="row" style="font-size: ${is58 ? "8.5px" : "9px"};"><span>Outgoing Cashier: ________________</span></div>
        <div class="row" style="margin-top: 8px; font-size: ${is58 ? "8.5px" : "9px"};"><span>Incoming / Manager: ________________</span></div>
    </div>
    <div class="center" style="font-size: 8px; margin-top: 4px; color: #666;">
        Shift Closed • Surya DineOS
    </div>
</body>
</html>
    `;

    triggerBrowserPrint(htmlContent);
}

/**
 * Robust Browser Print Trigger with Kiosk Silent Printing Compatibility
 */
function triggerBrowserPrint(htmlContent: string) {
    if (typeof window === "undefined") return;

    try {
        const printFrame = document.createElement("iframe");
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(htmlContent);
            doc.close();

            // Short timeout to allow CSS styles and fonts to render before firing print spooler
            setTimeout(() => {
                try {
                    printFrame.contentWindow?.focus();
                    printFrame.contentWindow?.print();
                } catch (printErr) {
                    console.warn("Iframe print failed, falling back to popup:", printErr);
                    fallbackWindowPrint(htmlContent);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(printFrame)) {
                            document.body.removeChild(printFrame);
                        }
                    }, 2000);
                }
            }, 300);
        } else {
            fallbackWindowPrint(htmlContent);
        }
    } catch (e) {
        console.error("Print trigger failed:", e);
        fallbackWindowPrint(htmlContent);
    }
}

function fallbackWindowPrint(htmlContent: string) {
    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 500);
    }
}
