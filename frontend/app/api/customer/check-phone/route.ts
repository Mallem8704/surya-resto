import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const phone = String(body.phone || "").trim();

        if (!phone) {
            return NextResponse.json({ detail: "Phone number is required" }, { status: 400 });
        }

        const result = serverDb.checkCustomer(phone);
        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        console.error("POST /api/customer/check-phone error:", err);
        return NextResponse.json({ detail: err.message || "Failed to check customer" }, { status: 500 });
    }
}
