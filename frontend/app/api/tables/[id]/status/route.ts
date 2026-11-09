import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const status = body.status;
    const active_order_id = body.active_order_id;

    if (!["free", "occupied", "reserved"].includes(status)) {
        return NextResponse.json({ detail: "Invalid table status" }, { status: 400 });
    }

    const updated = serverDb.updateTableStatus(Number(id), status, active_order_id);
    if (!updated) {
        return NextResponse.json({ detail: "Table not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
}
