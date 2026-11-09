import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const orderId = Number(body.order_id);
        const utrNumber = String(body.utr_number || body.txn_id || "").trim();

        if (!orderId || isNaN(orderId)) {
            return NextResponse.json({ detail: "Valid order_id is required" }, { status: 400 });
        }

        if (!utrNumber || utrNumber.length < 6) {
            return NextResponse.json(
                { detail: "Valid Bank UTR / Transaction ID (minimum 6 characters) is required" },
                { status: 400 }
            );
        }

        const payment = serverDb.submitUpiRef(orderId, utrNumber);
        if (!payment) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: "UPI Reference submitted successfully. Awaiting cashier approval / Soundbox confirmation.",
                payment,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments/submit-upi-ref error:", err);
        return NextResponse.json({ detail: err.message || "Failed to submit UPI reference" }, { status: 500 });
    }
}
