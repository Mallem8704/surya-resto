import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const shiftId = Number(body.shift_id);
        const type = body.type; // "in" | "out"
        const amountPaise = Number(body.amount_paise || body.amount);
        const reason = String(body.reason || "Petty cash transaction");

        if (!shiftId || isNaN(shiftId)) {
            return NextResponse.json({ detail: "Valid shift_id is required" }, { status: 400 });
        }

        if (type !== "in" && type !== "out") {
            return NextResponse.json({ detail: "Type must be 'in' or 'out'" }, { status: 400 });
        }

        if (isNaN(amountPaise) || amountPaise <= 0) {
            return NextResponse.json({ detail: "Valid amount_paise is required" }, { status: 400 });
        }

        const result = serverDb.recordPettyCash(shiftId, type, amountPaise, reason);
        if (!result) {
            return NextResponse.json({ detail: "Active open shift not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: `Recorded ₹${(amountPaise / 100).toFixed(2)} petty cash ${type}`,
                ...result,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/shifts/petty-cash error:", err);
        return NextResponse.json({ detail: err.message || "Failed to record petty cash" }, { status: 500 });
    }
}
