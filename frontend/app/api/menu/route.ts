import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id") ? Number(searchParams.get("category_id")) : undefined;
    const is_veg = searchParams.has("is_veg") ? searchParams.get("is_veg") === "true" : undefined;
    const search = searchParams.get("search") || undefined;

    const items = serverDb.getMenuItems({ category_id, is_veg, search });
    return NextResponse.json(items);
}
