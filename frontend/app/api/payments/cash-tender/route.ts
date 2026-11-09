import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const orderId = Number(body.order_id);
        const tenderedPaise = Number(body.tendered_paise || body.tendered_amount);

        if (!orderId || isNaN(orderId)) {
            return NextResponse.json({ detail: "Valid order_id is required" }, { status: 400 });
        }

        if (isNaN(tenderedPaise) || tenderedPaise <= 0) {
            return NextResponse.json({ detail: "Valid tendered amount is required" }, { status: 400 });
        }

        const result = serverDb.tenderCash(orderId, tenderedPaise);
        if (!result) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: "Cash tender processed successfully",
                order: result.order,
                payment: result.payment,
                change_paise: result.change_paise,
                change_rupees: (result.change_paise / 100).toFixed(2),
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments/cash-tender error:", err);
        return NextResponse.json({ detail: err.message || "Failed to tender cash" }, { status: 500 });
    }
}
