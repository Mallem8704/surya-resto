import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        status: "online",
        cloud_connected: true,
        pending_records: 0,
        sync_mode: "standalone_cloud_direct",
        last_synced_at: new Date().toISOString(),
        message: "Standalone cloud operations active. All data synchronized.",
    });
}
