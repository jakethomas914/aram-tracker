import fs from "node:fs/promises";
import path from "node:path";

import { API_KEY_PATH, DATA_DIR } from "@/lib/config";

import { updateDb } from "./db";

/** Riot keys look like RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. */
export function looksLikeRiotKey(value: string): boolean {
  return /^RGAPI-[0-9a-zA-Z-]{20,}$/.test(value);
}

/** Enough to recognise which key is active without exposing it to the browser. */
export function previewKey(key: string): string {
  return `RGAPI-••••${key.slice(-4)}`;
}

/**
 * Demo matches and the sample roster carry fake puuids. Left behind once a real
 * key arrives, they would be averaged into real stats and never resolve on Riot.
 */
async function purgeDemoData(): Promise<void> {
  await updateDb((db) => {
    db.matches = Object.fromEntries(
      Object.entries(db.matches).filter(([, match]) => match.source !== "demo"),
    );
    db.roster = db.roster.filter((member) => !member.puuid.startsWith("demo-"));
    db.skippedMatchIds = [];
  });
}

export async function saveApiKey(key: string, options: { wasDemo: boolean }): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpPath = path.join(DATA_DIR, `.riot-key.${process.pid}.tmp`);
  await fs.writeFile(tmpPath, JSON.stringify({ key, savedAt: Date.now() }), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(tmpPath, API_KEY_PATH);

  if (options.wasDemo) await purgeDemoData();
  await updateDb((db) => {
    db.syncState.keyRejected = false;
    db.syncState.lastError = null;
  });
}

export async function clearApiKey(): Promise<void> {
  await fs.rm(API_KEY_PATH, { force: true });
}
