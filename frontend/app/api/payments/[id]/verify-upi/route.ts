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
        const isApproved = body.is_approved !== false;

        const order = serverDb.verifyUpiPayment(orderId, isApproved);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: isApproved ? "Payment confirmed" : "Payment rejected",
                order,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments/[id]/verify-upi error:", err);
        return NextResponse.json({ detail: err.message || "Failed to verify UPI" }, { status: 500 });
    }
}
