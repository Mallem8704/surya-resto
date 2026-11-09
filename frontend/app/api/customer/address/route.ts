import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const phone = String(body.phone || "").trim();
        const address = String(body.address || "").trim();

        if (!phone || !address) {
            return NextResponse.json({ detail: "Both phone and address are required" }, { status: 400 });
        }

        const customer = serverDb.saveCustomerAddress(phone, address);
        return NextResponse.json(
            { message: "Address saved successfully", customer },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/customer/address error:", err);
        return NextResponse.json({ detail: err.message || "Failed to save address" }, { status: 500 });
    }
}
