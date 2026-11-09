import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const code = String(body.code || "").trim();
        const subtotalPaise = Number(body.subtotal_paise || body.subtotal);

        if (!code) {
            return NextResponse.json({ detail: "Coupon code is required" }, { status: 400 });
        }

        if (isNaN(subtotalPaise) || subtotalPaise < 0) {
            return NextResponse.json({ detail: "Valid subtotal_paise is required" }, { status: 400 });
        }

        const result = serverDb.validateCoupon(code, subtotalPaise);
        if (!result.valid) {
            return NextResponse.json({ detail: result.message }, { status: 400 });
        }

        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        console.error("POST /api/coupons/validate error:", err);
        return NextResponse.json({ detail: err.message || "Failed to validate coupon" }, { status: 500 });
    }
}
