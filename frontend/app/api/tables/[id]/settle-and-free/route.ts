import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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

        if (table.active_order_id) {
            const order = serverDb.getOrderById(table.active_order_id);
            if (order) {
                order.status = "served";
                order.payment_status = "paid";
            }
        }

        serverDb.updateTableStatus(tableId, "free", null);

        return NextResponse.json(
            { message: `Table ${table.label} settled and freed successfully`, table },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/tables/[id]/settle-and-free error:", err);
        return NextResponse.json({ detail: err.message || "Failed to settle table" }, { status: 500 });
    }
}
