import { NextResponse } from "next/server";
import { z } from "zod";

import { isDemoMode } from "@/lib/config";
import { getDashboardState } from "@/lib/dashboard";
import { RiotClient, parseRiotId } from "@/lib/riot/client";
import { getSettings, removeRosterMember, upsertRosterMember } from "@/lib/store/db";
import { demoPuuid } from "@/lib/sync/demo";
import type { RosterMember } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addSchema = z.object({
  riotId: z.string().min(1, "Enter a Riot ID such as Poro#NA1"),
  alias: z.string().trim().max(24).optional(),
});

export async function POST(request: Request) {
  const parsed = addSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const identity = parseRiotId(parsed.data.riotId);
  if (!identity) {
    return NextResponse.json(
      { error: "Riot IDs look like GameName#TAG — for example Poro#NA1." },
      { status: 400 },
    );
  }

  const alias = parsed.data.alias?.trim() || identity.gameName;
  let member: RosterMember;

  if (isDemoMode()) {
    member = {
      puuid: demoPuuid(identity.gameName, identity.tagLine),
      gameName: identity.gameName,
      tagLine: identity.tagLine,
      alias,
      addedAt: Date.now(),
      resolved: true,
    };
  } else {
    const settings = await getSettings();
    try {
      const account = await new RiotClient(settings.region).getAccountByRiotId(
        identity.gameName,
        identity.tagLine,
      );
      member = {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        alias,
        addedAt: Date.now(),
        resolved: true,
      };
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : `Riot could not find ${identity.gameName}#${identity.tagLine}.`,
        },
        { status: 400 },
      );
    }
  }

  await upsertRosterMember(member);
  return NextResponse.json({ state: await getDashboardState() });
}

export async function DELETE(request: Request) {
  const puuid = new URL(request.url).searchParams.get("puuid");
  if (!puuid) {
    return NextResponse.json({ error: "Missing puuid." }, { status: 400 });
  }
  await removeRosterMember(puuid);
  return NextResponse.json({ state: await getDashboardState() });
}
