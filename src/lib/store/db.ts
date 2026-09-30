import fs from "node:fs/promises";
import path from "node:path";

import { DATA_DIR, DB_PATH, defaultSettings } from "@/lib/config";
import type { Database, MatchRecord, RosterMember, Settings, SyncState } from "@/lib/types";

const DB_VERSION = 1;

function emptyDatabase(): Database {
  return {
    version: DB_VERSION,
    settings: defaultSettings(),
    roster: [],
    matches: {},
    skippedMatchIds: [],
    syncState: {
      lastSyncAt: null,
      lastSuccessAt: null,
      lastSummary: null,
      lastError: null,
      running: false,
    },
  };
}

/**
 * Writes are serialized through this promise chain and land via a temp-file
 * rename, so a crash mid-write cannot truncate the database.
 */
let writeChain: Promise<unknown> = Promise.resolve();
let cache: Database | null = null;

async function readFromDisk(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    return {
      ...emptyDatabase(),
      ...parsed,
      // Settings gain new keys over time; env defaults fill the gaps.
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      matches: parsed.matches ?? {},
      roster: parsed.roster ?? [],
      skippedMatchIds: parsed.skippedMatchIds ?? [],
      syncState: { ...emptyDatabase().syncState, ...(parsed.syncState ?? {}) },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDatabase();
    throw new Error(
      `Could not read ${DB_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function readDb(): Promise<Database> {
  if (!cache) cache = await readFromDisk();
  return cache;
}

async function persist(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpPath = path.join(DATA_DIR, `.db.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmpPath, DB_PATH);
}

/**
 * Read-modify-write under the shared lock. The mutator receives the live
 * database and may mutate it in place or return a replacement.
 */
export function updateDb<T>(
  mutator: (db: Database) => T | Promise<T>,
): Promise<T> {
  const run = writeChain.then(async () => {
    // Re-read so a watcher process writing concurrently is not clobbered.
    const db = await readFromDisk();
    const result = await mutator(db);
    cache = db;
    await persist(db);
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Drop the in-memory copy so the next read hits disk. */
export function invalidateCache(): void {
  cache = null;
}

export async function getSettings(): Promise<Settings> {
  return (await readDb()).settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return updateDb((db) => {
    db.settings = { ...db.settings, ...patch };
    return db.settings;
  });
}

export async function getRoster(): Promise<RosterMember[]> {
  return (await readDb()).roster;
}

export async function upsertRosterMember(member: RosterMember): Promise<RosterMember[]> {
  return updateDb((db) => {
    const index = db.roster.findIndex(
      (existing) =>
        existing.puuid === member.puuid ||
        (existing.gameName.toLowerCase() === member.gameName.toLowerCase() &&
          existing.tagLine.toLowerCase() === member.tagLine.toLowerCase()),
    );
    if (index >= 0) {
      db.roster[index] = { ...db.roster[index], ...member };
    } else {
      db.roster.push(member);
    }
    return db.roster;
  });
}

export async function removeRosterMember(puuid: string): Promise<RosterMember[]> {
  return updateDb((db) => {
    db.roster = db.roster.filter((member) => member.puuid !== puuid);
    return db.roster;
  });
}

export async function getMatches(): Promise<MatchRecord[]> {
  const db = await readDb();
  return Object.values(db.matches).sort(
    (a, b) => b.gameStartTimestamp - a.gameStartTimestamp,
  );
}

export async function setSyncState(patch: Partial<SyncState>): Promise<SyncState> {
  return updateDb((db) => {
    db.syncState = { ...db.syncState, ...patch };
    return db.syncState;
  });
}

/** Replace all stored matches and sync bookkeeping, keeping roster and settings. */
export async function clearMatches(): Promise<void> {
  await updateDb((db) => {
    db.matches = {};
    db.skippedMatchIds = [];
    db.syncState = { ...db.syncState, lastSummary: null };
  });
}
