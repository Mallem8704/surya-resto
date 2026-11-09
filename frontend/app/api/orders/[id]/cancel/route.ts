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
        const reason = body.reason || "Customer/Cashier cancellation";

        const order = serverDb.cancelOrder(orderId, reason);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(
            { message: "Order cancelled successfully", order },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/orders/[id]/cancel error:", err);
        return NextResponse.json({ detail: err.message || "Failed to cancel order" }, { status: 500 });
    }
}
