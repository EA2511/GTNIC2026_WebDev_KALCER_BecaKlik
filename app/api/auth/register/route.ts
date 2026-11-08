import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const noHp = typeof body?.noHp === "string" ? body.noHp.trim() : "081200000000";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!nama || nama.length < 2) {
      return NextResponse.json(
        { message: "Nama lengkap penumpang wajib diisi (minimal 2 karakter)." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { message: "Format alamat email tidak valid." },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { message: "Kata sandi wajib diisi (minimal 4 karakter)." },
        { status: 400 }
      );
    }

    // Simpan ke sharedStore agar selalu tersedia instan baik mode DB maupun mode mandiri
    const sharedUser = sharedStore.registerUser({
      nama,
      email,
      noHp,
      password,
      role: "PENUMPANG",
    });

    let finalUserId = sharedUser.id;

    // Coba simpan juga ke database MySQL jika aktif
    try {
      const existingDb = await prisma.user.findUnique({ where: { email } });
      if (!existingDb) {
        const passwordHash = await bcrypt.hash(password, 10);
        const created = await prisma.user.create({
          data: {
            nama,
            email,
            noHp,
            passwordHash,
            role: "PENUMPANG",
          },
        });
        finalUserId = created.id;
      } else {
        finalUserId = existingDb.id;
      }
    } catch {
      // Fallback ke sharedStore tanpa error jika MySQL lokal tidak aktif
    }

    await setSession({
      userId: finalUserId,
      nama,
      role: "PENUMPANG",
      email,
    });

    return NextResponse.json({
      message: "Pendaftaran akun penumpang baru berhasil!",
      user: {
        id: finalUserId,
        nama,
        email,
        noHp,
        role: "PENUMPANG",
      },
      redirectTo: "/pelanggan",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mendaftarkan akun baru." },
      { status: 500 }
    );
  }
}

