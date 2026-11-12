import { NextResponse } from "next/server";
import { authenticateStaff, signStaffToken } from "@/lib/authServer";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const identifier = body.email || body.username || body.user || body.phone;
        const password = body.password;

        if (!identifier || !password) {
            return NextResponse.json(
                { detail: "Email or username, and password are required" },
                { status: 400 }
            );
        }

        const userPayload = authenticateStaff(identifier, password);

        if (!userPayload) {
            return NextResponse.json(
                {
                    detail:
                        "Invalid credentials. Please use owner@suryarestaurant.com / admin123 or staff@suryarestaurant.com / staff123",
                },
                { status: 401 }
            );
        }

        const token = await signStaffToken(userPayload);

        return NextResponse.json({
            access_token: token,
            token_type: "bearer",
            user: userPayload,
        });
    } catch (err: any) {
        return NextResponse.json(
            { detail: err?.message || "Internal authentication error" },
            { status: 500 }
        );
    }
}
