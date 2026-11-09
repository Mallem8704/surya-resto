import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const callType = body.call_type || "waiter";

    const call = serverDb.createServiceCall(Number(id), callType);
    return NextResponse.json(call);
}
