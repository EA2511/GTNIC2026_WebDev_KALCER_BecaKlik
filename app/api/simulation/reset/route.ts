import { NextResponse } from "next/server";
import { resetDemoScenario } from "@/lib/simulation";

export async function POST() {
  try {
    const success = await resetDemoScenario();
    return NextResponse.json({
      success,
      message:
        "Skenario demonstrasi berhasil di-reset dengan aman. Database dan akun tetap terlindungi.",
    });
  } catch (error) {
    console.error("Error in /api/simulation/reset:", error);
    return NextResponse.json(
      { message: "Gagal me-reset skenario demonstrasi." },
      { status: 500 }
    );
  }
}
