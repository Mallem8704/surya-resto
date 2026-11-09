import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const data = serverDb.getRevenueOverTime();
        return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/analytics/revenue-over-time error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch revenue over time" }, { status: 500 });
    }
}
