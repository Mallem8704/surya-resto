import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get("limit") || 10);
        const topItems = serverDb.getTopItems(limit);
        return NextResponse.json(topItems, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/analytics/top-items error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch top items" }, { status: 500 });
    }
}
