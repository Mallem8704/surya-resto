import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
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

        const { searchParams } = new URL(request.url);
        const frontendUrl = searchParams.get("frontend_url") || "";
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "suryafamilyrestaurant.com";
        const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
        const origin = frontendUrl.startsWith("http") ? frontendUrl : `${protocol}://${host}`;

        const targetUrl = `${origin}/order?branch=${table.outlet_id}&table=${encodeURIComponent(table.label)}`;

        const pngBuffer = await QRCode.toBuffer(targetUrl, {
            type: "png",
            width: 320,
            margin: 2,
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            },
        });

        return new Response(new Uint8Array(pngBuffer), {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                "Content-Disposition": `inline; filename="qr_table_${table.label}.png"`,
            },
        });
    } catch (err: any) {
        console.error("GET /api/tables/[id]/qr error:", err);
        return NextResponse.json({ detail: err.message || "Failed to generate QR" }, { status: 500 });
    }
}
