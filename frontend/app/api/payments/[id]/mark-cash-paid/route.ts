import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

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

        const body = await request.json().catch(() => ({}));
        const order = serverDb.getOrderById(orderId);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        const result = serverDb.tenderCash(orderId, order.total_paise);
        return NextResponse.json(
            {
                message: "Marked as cash paid",
                order: result?.order,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments/[id]/mark-cash-paid error:", err);
        return NextResponse.json({ detail: err.message || "Failed to mark cash paid" }, { status: 500 });
    }
}
