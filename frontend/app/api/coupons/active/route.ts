import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const coupons = serverDb.getActiveCoupons();
        return NextResponse.json(coupons, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/coupons/active error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch coupons" }, { status: 500 });
    }
}
