import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const summary = serverDb.getAnalyticsSummary();
        return NextResponse.json(summary, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/analytics/summary error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch analytics summary" }, { status: 500 });
    }
}
