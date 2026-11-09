import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const order_type = searchParams.get("order_type") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const orders = serverDb.getOrders({ status, order_type, limit });
    return NextResponse.json(orders);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json(
                { detail: "Order must contain at least one item" },
                { status: 400 }
            );
        }

        const newOrder = serverDb.createOrder({
            order_type: body.order_type,
            table_id: body.table_id ? Number(body.table_id) : null,
            customer_name: body.customer_name,
            customer_phone: body.customer_phone,
            delivery_address: body.delivery_address,
            delivery_fee_paise: body.delivery_fee_paise,
            items: body.items,
            customer_notes: body.customer_notes,
            payment_method: body.payment_method,
            idempotency_key: body.idempotency_key,
            coupon_code: body.coupon_code,
        });

        return NextResponse.json(newOrder, { status: 201 });
    } catch (err: any) {
        return NextResponse.json(
            { detail: err?.message || "Failed to place order" },
            { status: 500 }
        );
    }
}
