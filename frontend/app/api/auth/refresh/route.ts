import { NextResponse } from "next/server";
import { getAuthenticatedUser, signStaffToken } from "@/lib/authServer";

export async function POST(req: Request) {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const token = await signStaffToken(user);
    return NextResponse.json({ access_token: token, token_type: "bearer" });
}
