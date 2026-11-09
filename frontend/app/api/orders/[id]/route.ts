import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

        return NextResponse.json(order, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/orders/[id] error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch order" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        if (!body.status) {
            return NextResponse.json({ detail: "Status is required" }, { status: 400 });
        }

        const order = serverDb.updateOrderStatus(orderId, body.status);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order, { status: 200 });
    } catch (err: any) {
        console.error("PATCH /api/orders/[id] error:", err);
        return NextResponse.json({ detail: err.message || "Failed to update order" }, { status: 500 });
    }
}
