import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const is_available = Boolean(body.is_available);

    const updated = serverDb.toggleItemAvailability(Number(id), is_available);
    if (!updated) {
        return NextResponse.json({ detail: "Menu item not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
}
