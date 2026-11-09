import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const table = serverDb.getTableById(Number(id));
    if (!table) {
        return NextResponse.json({ detail: "Table not found" }, { status: 404 });
    }
    return NextResponse.json(table);
}
