import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const shiftId = Number(id);
        if (isNaN(shiftId)) {
            return NextResponse.json({ detail: "Invalid shift ID" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const actualCashPaise = Number(body.actual_cash_paise || body.actual_cash);
        const denominationsJson = body.denominations_json
            ? typeof body.denominations_json === "string"
                ? body.denominations_json
                : JSON.stringify(body.denominations_json)
            : undefined;
        const closingNotes = body.closing_notes || undefined;

        if (isNaN(actualCashPaise)) {
            return NextResponse.json({ detail: "actual_cash_paise is required" }, { status: 400 });
        }

        const shift = serverDb.closeShift(shiftId, actualCashPaise, denominationsJson, closingNotes);
        if (!shift) {
            return NextResponse.json({ detail: "Shift not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: "Shift closed successfully",
                shift,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/shifts/[id]/close error:", err);
        return NextResponse.json({ detail: err.message || "Failed to close shift" }, { status: 500 });
    }
}
