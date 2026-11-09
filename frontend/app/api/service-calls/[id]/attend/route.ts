import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const callId = Number(id);
        if (isNaN(callId)) {
            return NextResponse.json({ detail: "Invalid call ID" }, { status: 400 });
        }

        const call = serverDb.attendServiceCall(callId);
        if (!call) {
            return NextResponse.json({ detail: "Service call not found" }, { status: 404 });
        }

        return NextResponse.json(call, { status: 200 });
    } catch (err: any) {
        console.error("PATCH /api/service-calls/[id]/attend error:", err);
        return NextResponse.json({ detail: err.message || "Failed to attend service call" }, { status: 500 });
    }
}
