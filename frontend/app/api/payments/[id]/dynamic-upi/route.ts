import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

        const outlet = serverDb.getOutlet();
        const amountRupees = (order.total_paise / 100).toFixed(2);
        const note = `Bill_${order.order_number}`;
        const upiString = `upi://pay?pa=${encodeURIComponent(outlet.upi_vpa)}&pn=${encodeURIComponent(
            outlet.name
        )}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}`;

        return NextResponse.json(
            {
                order_id: order.id,
                order_number: order.order_number,
                amount_paise: order.total_paise,
                amount_rupees: Number(amountRupees),
                upi_vpa: outlet.upi_vpa,
                payee_name: outlet.name,
                upi_string: upiString,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("GET /api/payments/[id]/dynamic-upi error:", err);
        return NextResponse.json({ detail: err.message || "Failed to generate dynamic UPI" }, { status: 500 });
    }
}
