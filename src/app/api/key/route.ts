import { NextResponse } from "next/server";
import { z } from "zod";

import { isDemoMode } from "@/lib/config";
import { getDashboardState } from "@/lib/dashboard";
import { RiotApiError, checkApiKey } from "@/lib/riot/client";
import { clearApiKey, looksLikeRiotKey, saveApiKey } from "@/lib/store/api-key";
import { getSettings } from "@/lib/store/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ key: z.string().trim().min(1, "Paste your Riot API key.") });

/** Check a pasted key against Riot, and keep it only if Riot accepts it. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Paste your Riot API key." },
      { status: 400 },
    );
  }

  const { key } = parsed.data;
  if (!looksLikeRiotKey(key)) {
    return NextResponse.json(
      { error: "That doesn't look like a Riot key. It should start with RGAPI-." },
      { status: 400 },
    );
  }

  try {
    const { region } = await getSettings();
    if ((await checkApiKey(key, region)) === "rejected") {
      return NextResponse.json(
        {
          error:
            "Riot rejected that key. Development keys expire after 24 hours, so generate a fresh one on the Riot Developer Portal.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    const detail = error instanceof RiotApiError ? error.message : "Could not reach Riot.";
    return NextResponse.json(
      { error: `Couldn't check the key with Riot, so it was not saved. ${detail}` },
      { status: 502 },
    );
  }

  await saveApiKey(key, { wasDemo: isDemoMode() });
  return NextResponse.json({ state: await getDashboardState() });
}

/** Forget the key pasted into the app; a key in RIOT_API_KEY is left alone. */
export async function DELETE() {
  await clearApiKey();
  return NextResponse.json({ state: await getDashboardState() });
}
