import { NextResponse } from "next/server";
import { serverDb } from "@/lib/serverDb";

export async function GET() {
    return NextResponse.json(serverDb.getTables());
}
