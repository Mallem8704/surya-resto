import { NextRequest, NextResponse } from "next/server";
import { serverDb, broadcastRealtime } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
        }

        const order = serverDb.getOrderById(orderId);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const newItems: Array<{ item_id: number; variant_id?: number; qty: number; notes?: string }> = body.items || [];

        let addedSubtotal = 0;
        newItems.forEach((it, idx) => {
            const dish = serverDb.getMenuItemById(it.item_id);
            let unitPrice = dish ? dish.price_paise : 20000;
            let variantName = null;

            if (it.variant_id && dish?.variants) {
                const v = dish.variants.find((vr) => vr.id === it.variant_id);
                if (v) {
                    unitPrice = v.price_paise;
                    variantName = v.name;
                }
            }

            const itemTotal = unitPrice * it.qty;
            addedSubtotal += itemTotal;

            order.items.push({
                id: Date.now() + idx,
                order_id: order.id,
                item_id: it.item_id,
                variant_id: it.variant_id || null,
                variant_name: variantName,
                item_name: dish ? dish.name : `Item #${it.item_id}`,
                qty: it.qty,
                unit_price_paise: unitPrice,
                total_price_paise: itemTotal,
                notes: it.notes || null,
            });
        });

        order.subtotal_paise += addedSubtotal;
        order.tax_paise = Math.round(order.subtotal_paise * 0.05);
        order.total_paise = order.subtotal_paise + order.tax_paise + (order.delivery_fee_paise || 0) - (order.discount_paise || 0);
        order.updated_at = new Date().toISOString();

        broadcastRealtime("RUNNING_KOT_ADDED", order);

        return NextResponse.json(order, { status: 200 });
    } catch (err: any) {
        console.error("POST /api/orders/[id]/append-items error:", err);
        return NextResponse.json({ detail: err.message || "Failed to append items" }, { status: 500 });
    }
}
