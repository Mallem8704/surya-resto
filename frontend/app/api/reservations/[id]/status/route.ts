import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const resId = Number(id);
        if (isNaN(resId)) {
            return NextResponse.json({ detail: "Invalid reservation ID" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const status = body.status;
        if (!status) {
            return NextResponse.json({ detail: "Status is required" }, { status: 400 });
        }

        const validStatuses = ["confirmed", "seated", "cancelled", "completed"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { detail: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
                { status: 400 }
            );
        }

        const updated = serverDb.updateReservationStatus(resId, status);
        if (!updated) {
            return NextResponse.json({ detail: "Reservation not found" }, { status: 404 });
        }

        return NextResponse.json(updated, { status: 200 });
    } catch (err: any) {
        console.error("PATCH /api/reservations/[id]/status error:", err);
        return NextResponse.json({ detail: err.message || "Failed to update reservation" }, { status: 500 });
    }
}
