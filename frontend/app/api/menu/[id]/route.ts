import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const item = serverDb.getMenuItemById(Number(id));
    if (!item) {
        return NextResponse.json({ detail: "Menu item not found" }, { status: 404 });
    }
    return NextResponse.json(item);
}
