import { NextResponse } from "next/server";
import { sharedStore } from "@/lib/sharedStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const liveStats = sharedStore.getAdminLiveStats();
  return NextResponse.json(liveStats);
}
