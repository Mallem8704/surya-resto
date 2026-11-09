import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const outlet = serverDb.getOutlet();
        return NextResponse.json([outlet], { status: 200 });
    } catch (err: any) {
        console.error("GET /api/outlets/list error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch outlets" }, { status: 500 });
    }
}
