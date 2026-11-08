import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: session.userId,
        nama: session.nama,
        email: session.email || null,
        role: session.role,
      },
    });
  } catch (err) {
    console.error("Error in GET /api/auth/me:", err);
    return NextResponse.json({ user: null });
  }
}

