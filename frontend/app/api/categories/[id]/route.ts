import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const cat = serverDb.getCategoryById(Number(id));
    if (!cat) {
        return NextResponse.json({ detail: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(cat);
}
