import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date") || undefined;

        const reservations = serverDb.getReservations(date);
        return NextResponse.json(reservations, { status: 200 });
    } catch (err: any) {
        console.error("GET /api/reservations error:", err);
        return NextResponse.json({ detail: err.message || "Failed to fetch reservations" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            customer_name,
            customer_phone,
            party_size,
            reservation_date,
            reservation_time,
            seating_preference,
            occasion,
            special_requests,
        } = body;

        if (!customer_name || !customer_phone || !reservation_date || !reservation_time) {
            return NextResponse.json(
                { detail: "Name, phone, reservation_date, and reservation_time are required" },
                { status: 400 }
            );
        }

        const reservation = serverDb.createReservation({
            customer_name,
            customer_phone,
            party_size: Number(party_size) || 2,
            reservation_date,
            reservation_time,
            seating_preference: seating_preference || "standard",
            occasion,
            special_requests,
        });

        return NextResponse.json(reservation, { status: 201 });
    } catch (err: any) {
        console.error("POST /api/reservations error:", err);
        return NextResponse.json({ detail: err.message || "Failed to create reservation" }, { status: 500 });
    }
}
