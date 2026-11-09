import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const status = body.status;
        if (!status) {
            return NextResponse.json({ detail: "Status field is required" }, { status: 400 });
        }

        const validStatuses = [
            "placed",
            "accepted",
            "preparing",
            "ready",
            "out_for_delivery",
            "delivered",
            "served",
            "cancelled",
        ];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { detail: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
                { status: 400 }
            );
        }

        const order = serverDb.updateOrderStatus(orderId, status);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order, { status: 200 });
    } catch (err: any) {
        console.error("PATCH /api/orders/[id]/status error:", err);
        return NextResponse.json({ detail: err.message || "Failed to update status" }, { status: 500 });
    }
}
