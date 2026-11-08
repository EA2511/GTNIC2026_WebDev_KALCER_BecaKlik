import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ hasCompletedOnboarding: false, isGuest: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, nama: true, role: true, hasCompletedOnboarding: true },
    });

    return NextResponse.json({
      hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
      user,
    });
  } catch (error) {
    console.warn("DB offline di GET /api/user/onboarding:", error);
    return NextResponse.json({
      hasCompletedOnboarding: true,
      user: null,
      isGuest: false,
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => ({}));
    const email = body.email;

    if (session && session.userId) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { hasCompletedOnboarding: true },
      });
      return NextResponse.json({ success: true, message: "Onboarding selesai." });
    }

    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { hasCompletedOnboarding: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Status onboarding tersimpan." });
  } catch (error) {
    console.error("Error in POST /api/user/onboarding:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui status onboarding." },
      { status: 500 }
    );
  }
}
