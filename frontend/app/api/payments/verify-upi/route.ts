import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const orderId = Number(body.order_id);
        const isApproved = body.is_approved !== false;

        if (!orderId || isNaN(orderId)) {
            return NextResponse.json({ detail: "Valid order_id is required" }, { status: 400 });
        }

        const order = serverDb.verifyUpiPayment(orderId, isApproved);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: isApproved ? "UPI Payment verified and approved" : "UPI Payment rejected",
                order,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments/verify-upi error:", err);
        return NextResponse.json({ detail: err.message || "Failed to verify UPI payment" }, { status: 500 });
    }
}
