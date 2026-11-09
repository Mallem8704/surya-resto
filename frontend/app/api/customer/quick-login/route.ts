import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";
import { signJwtToken } from "@/lib/authServer";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const phone = String(body.phone || "").trim();
        const name = body.name ? String(body.name).trim() : undefined;

        if (!phone || phone.length < 10) {
            return NextResponse.json({ detail: "Valid 10-digit phone number is required" }, { status: 400 });
        }

        const customer = serverDb.quickLoginCustomer(phone, name);

        const token = await signJwtToken({
            id: customer.id,
            email: `${customer.phone}@customer.surya`,
            role: "customer",
            outlet_id: 1,
        });

        return NextResponse.json(
            {
                customer,
                access_token: token,
                token_type: "bearer",
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/customer/quick-login error:", err);
        return NextResponse.json({ detail: err.message || "Failed to log in" }, { status: 500 });
    }
}
