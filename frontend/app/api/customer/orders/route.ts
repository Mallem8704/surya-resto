import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone =
            searchParams.get("phone") ||
            request.headers.get("x-customer-phone") ||
            request.headers.get("x-phone") ||
            "";

        if (!phone) {
            return NextResponse.json({ detail: "Customer phone is required to retrieve orders" }, { status: 400 });
        }

        const orders = serverDb.getCustomerOrders(phone);
        return NextResponse.json(orders, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/customer/orders error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch customer orders" }, { status: 500 });
    }
}
