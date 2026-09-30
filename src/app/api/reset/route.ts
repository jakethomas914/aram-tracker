import { NextResponse } from "next/server";

import { getDashboardState } from "@/lib/dashboard";
import { clearMatches } from "@/lib/store/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Forget every stored match so the next sync rebuilds history from scratch. */
export async function POST() {
  await clearMatches();
  return NextResponse.json({ state: await getDashboardState() });
}
