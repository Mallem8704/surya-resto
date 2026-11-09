import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function PATCH(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const call = serverDb.attendServiceCall(Number(id));
    if (!call) {
        return NextResponse.json({ detail: "Service call not found" }, { status: 404 });
    }
    return NextResponse.json(call);
}
