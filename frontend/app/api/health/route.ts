import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json(
        {
            status: "healthy",
            mode: "standalone-nextjs",
            timestamp: new Date().toISOString(),
            restaurant: serverDb.getOutlet().name,
            version: "2.0.0",
            total_dishes: serverDb.getMenuItems().length,
            total_tables: serverDb.getTables().length,
        },
        { status: 200 }
    );
}
