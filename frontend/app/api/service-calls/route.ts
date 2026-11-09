import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const calls = (serverDb as any).getServiceCalls
            ? (serverDb as any).getServiceCalls(status)
            : [];
        return NextResponse.json(calls, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/service-calls error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch service calls" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const tableId = Number(body.table_id);
        const callType = body.call_type || "waiter";

        if (!tableId || isNaN(tableId)) {
            return NextResponse.json({ detail: "Valid table_id is required" }, { status: 400 });
        }

        const call = serverDb.createServiceCall(tableId, callType);
        return NextResponse.json(call, { status: 201 });
    } catch (err: any) {
        console.error("POST /api/service-calls error:", err);
        return NextResponse.json({ detail: err.message || "Failed to create service call" }, { status: 500 });
    }
}
