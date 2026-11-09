import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active_only") !== "false";
    const categories = serverDb.getCategories(activeOnly);
    return NextResponse.json(categories);
}
