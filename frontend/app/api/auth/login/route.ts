import { NextResponse } from "next/server";
import { CREDENTIALS_FALLBACK, signStaffToken } from "@/lib/authServer";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { detail: "Email and password are required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cred = CREDENTIALS_FALLBACK[normalizedEmail];

        if (!cred || cred.password !== password) {
            return NextResponse.json(
                { detail: "Invalid email or password" },
                { status: 401 }
            );
        }

        const userPayload = {
            id: cred.id,
            name: cred.name,
            email: normalizedEmail,
            role: cred.role,
            outlet_id: 1,
        };

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
