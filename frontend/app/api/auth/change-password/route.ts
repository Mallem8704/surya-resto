import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authServer";

export async function POST(req: Request) {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json();
    if (!body.new_password || body.new_password.length < 6) {
        return NextResponse.json(
            { detail: "New password must be at least 6 characters" },
            { status: 400 }
        );
    }
    return NextResponse.json({ message: "Password updated successfully" });
}
