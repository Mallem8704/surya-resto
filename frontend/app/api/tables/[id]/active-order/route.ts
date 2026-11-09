import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const tableId = Number(id);
        if (isNaN(tableId)) {
            return NextResponse.json({ detail: "Invalid table ID" }, { status: 400 });
        }

        const table = serverDb.getTableById(tableId);
        if (!table) {
            return NextResponse.json({ detail: "Table not found" }, { status: 404 });
        }

        if (!table.active_order_id) {
            return NextResponse.json(null, { status: 200 });
        }

        const order = serverDb.getOrderById(table.active_order_id);
        return NextResponse.json(order || null, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/tables/[id]/active-order error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch active order" }, { status: 500 });
    }
}
