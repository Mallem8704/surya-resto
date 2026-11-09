import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const openingFloatPaise = Number(body.opening_float_paise || body.opening_float || 200000);
        const cashierName = String(body.cashier_name || "Surya Cashier");
        const cashierId = Number(body.cashier_id || 1);

        const current = serverDb.getCurrentShift();
        if (current) {
            return NextResponse.json(
                { detail: "A shift is already open. Close it before opening a new one.", current_shift: current },
                { status: 400 }
            );
        }

        const shift = serverDb.openShift(openingFloatPaise, cashierName, cashierId);
        return NextResponse.json(shift, { status: 201 });
    } catch (err: any) {
        console.error("POST /api/shifts/open error:", err);
        return NextResponse.json({ detail: err.message || "Failed to open shift" }, { status: 500 });
    }
}
