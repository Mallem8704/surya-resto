import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const breakdown = serverDb.getPaymentMethodsBreakdown();
        return NextResponse.json(breakdown, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/analytics/payment-methods error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch payment methods breakdown" }, { status: 500 });
    }
}
