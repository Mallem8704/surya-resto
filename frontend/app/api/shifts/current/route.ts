import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    try {
        const shift = serverDb.getCurrentShift();
        if (!shift) {
            return NextResponse.json({ status: "none", message: "No active shift open" }, { status: 200 });
        }
        return NextResponse.json(shift, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/shifts/current error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch current shift" }, { status: 500 });
    }
}
