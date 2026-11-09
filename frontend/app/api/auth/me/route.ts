import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authServer";

export async function GET(req: Request) {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(user);
}
