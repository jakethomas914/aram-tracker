import { NextResponse } from "next/server";
import { z } from "zod";

import { getDashboardState } from "@/lib/dashboard";
import { saveSettings } from "@/lib/store/db";
import { ARAM_QUEUES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const knownQueueIds = new Set(ARAM_QUEUES.map((queue) => queue.id));

const settingsSchema = z.object({
  region: z.enum(["americas", "europe", "asia", "sea"]).optional(),
  trackedQueueIds: z
    .array(
      z
        .number()
        .int()
        .refine((id) => knownQueueIds.has(id), "Unsupported queue ID."),
    )
    .min(1, "Track at least one queue.")
    .optional(),
  minGroupSize: z.number().int().min(1).max(5).optional(),
  lookbackDays: z.number().int().min(1).max(3650).optional(),
  matchesPerPlayer: z.number().int().min(1).max(100).optional(),
  maxMatchesPerSync: z.number().int().min(1).max(500).optional(),
  fetchTimelines: z.boolean().optional(),
  watchIntervalSeconds: z.number().int().min(30).max(86_400).optional(),
  autoWriteWorkbook: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings." },
      { status: 400 },
    );
  }

  await saveSettings(parsed.data);
  return NextResponse.json({ state: await getDashboardState() });
}
