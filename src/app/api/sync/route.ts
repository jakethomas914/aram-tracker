import { NextResponse } from "next/server";

import { getDashboardState } from "@/lib/dashboard";
import { SyncBusyError, runSync } from "@/lib/sync/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A full history pull can take a while on a cold database. */
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { force?: boolean; simulateNewDemoMatch?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // An empty body is a plain sync request.
  }

  try {
    const summary = await runSync({
      force: body.force,
      simulateNewDemoMatch: body.simulateNewDemoMatch,
    });
    return NextResponse.json({ summary, state: await getDashboardState() });
  } catch (error) {
    if (error instanceof SyncBusyError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed." },
      { status: 500 },
    );
  }
}
