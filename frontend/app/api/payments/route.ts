import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("order_id");

        let payments = serverDb.getOutlet() ? (serverDb as any).getPayments?.() : [];
        if (!payments) {
            // Aggregate from orders
            const orders = serverDb.getOrders();
            payments = orders.flatMap((o) => o.payments);
        }

        if (orderId) {
            payments = payments.filter((p: any) => p.order_id === Number(orderId));
        }

        return NextResponse.json(payments, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/payments error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch payments" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { order_id, amount_paise, method } = body;

        if (!order_id) {
            return NextResponse.json({ detail: "order_id is required" }, { status: 400 });
        }

        const order = serverDb.getOrderById(Number(order_id));
        if (!order) {
            return NextResponse.json({ detail: "Order not found" }, { status: 404 });
        }

        const outlet = serverDb.getOutlet();
        const payablePaise = amount_paise || order.total_paise;
        const amountRupees = (payablePaise / 100).toFixed(2);

        // Generate NPCI Compliant Dynamic UPI URI
        // Format: upi://pay?pa={vpa}&pn={name}&am={amount}&tn={note}&cu=INR
        const note = `Bill_${order.order_number}`;
        const upiString = `upi://pay?pa=${encodeURIComponent(outlet.upi_vpa)}&pn=${encodeURIComponent(
            outlet.name
        )}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}`;

        return NextResponse.json(
            {
                order_id: order.id,
                order_number: order.order_number,
                amount_paise: payablePaise,
                amount_rupees: Number(amountRupees),
                upi_vpa: outlet.upi_vpa,
                payee_name: outlet.name,
                upi_string: upiString,
                method: method || "upi",
                status: order.payment_status,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("POST /api/payments error:", err);
        return NextResponse.json({ detail: err.message || "Failed to process payment" }, { status: 500 });
    }
}
