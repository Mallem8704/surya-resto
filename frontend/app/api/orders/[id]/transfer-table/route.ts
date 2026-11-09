import { NextRequest, NextResponse } from "next/server";
import { serverDb, broadcastRealtime } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
        }

        const order = serverDb.getOrderById(orderId);
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const targetTableId = Number(body.target_table_id);
        const targetTable = serverDb.getTableById(targetTableId);

        if (!targetTable) {
            return NextResponse.json({ detail: "Target table not found" }, { status: 404 });
        }

        const oldTableId = order.table_id;
        if (oldTableId) {
            serverDb.updateTableStatus(oldTableId, "free", null);
        }

        order.table_id = targetTableId;
        order.table_label = targetTable.label;
        order.updated_at = new Date().toISOString();

        serverDb.updateTableStatus(targetTableId, "occupied", order.id);

        broadcastRealtime("TABLE_TRANSFERRED", {
            order_id: order.id,
            old_table_id: oldTableId,
            new_table_id: targetTableId,
            order,
        });

        return NextResponse.json(order, { status: 200 });
    } catch (err: any) {
        console.error("POST /api/orders/[id]/transfer-table error:", err);
        return NextResponse.json({ detail: err.message || "Failed to transfer table" }, { status: 500 });
    }
}
