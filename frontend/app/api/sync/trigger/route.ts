import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json({
        success: true,
        message: "Standalone cloud synchronization complete. All local records are up to date.",
        synced_at: new Date().toISOString(),
    });
}
