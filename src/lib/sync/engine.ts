import { EXPORT_DIR, WORKBOOK_FILENAME, isDemoMode } from "@/lib/config";
import { writeWorkbookToDisk } from "@/lib/excel/workbook";
import { MissingApiKeyError, RiotClient } from "@/lib/riot/client";
import { createNameResolver, loadRuneTrees } from "@/lib/riot/ddragon";
import { readDb, updateDb } from "@/lib/store/db";
import {
  ARAM_QUEUE_ID,
  type MatchRecord,
  type RawMatch,
  type RawTimeline,
  type RosterMember,
  type SyncSummary,
} from "@/lib/types";

import {
  buildDemoMatch,
  demoMatchHistory,
  demoRosterMembers,
  nextDemoMatchIndex,
} from "./demo";
import { normalizeMatch } from "./normalize";

/** Riot rejects startTime values before ARAM match history begins. */
const MATCH_HISTORY_EPOCH_SECONDS = 1_623_628_800;

/** How many demo games exist in the simulated back catalogue. */
const DEMO_HISTORY_SIZE = 26;

export class SyncBusyError extends Error {
  constructor() {
    super("A sync is already running.");
    this.name = "SyncBusyError";
  }
}

export interface SyncOptions {
  /** Ignore the running flag (used to recover from a crashed sync). */
  force?: boolean;
  /** Append one freshly finished demo game before syncing. */
  simulateNewDemoMatch?: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Look up puuids for roster entries added by Riot ID but never resolved. */
async function resolveRoster(
  client: RiotClient,
  roster: RosterMember[],
  errors: string[],
): Promise<RosterMember[]> {
  const unresolved = roster.filter((member) => !member.resolved || !member.puuid);
  if (unresolved.length === 0) return roster;

  // Keyed by Riot ID rather than puuid, which may be blank on several entries.
  const riotIdKey = (member: RosterMember) =>
    `${member.gameName.toLowerCase()}#${member.tagLine.toLowerCase()}`;

  const resolved = new Map<string, RosterMember>();
  for (const member of unresolved) {
    try {
      const account = await client.getAccountByRiotId(member.gameName, member.tagLine);
      resolved.set(riotIdKey(member), {
        ...member,
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        resolved: true,
      });
    } catch (error) {
      errors.push(
        `Could not resolve ${member.gameName}#${member.tagLine}: ${errorMessage(error)}`,
      );
    }
  }

  if (resolved.size === 0) return roster;

  return updateDb((db) => {
    db.roster = db.roster.map((member) => resolved.get(riotIdKey(member)) ?? member);
    return db.roster;
  });
}

export async function runSync(options: SyncOptions = {}): Promise<SyncSummary> {
  const startedAt = Date.now();
  const existing = await readDb();

  if (existing.syncState.running && !options.force) throw new SyncBusyError();

  await updateDb((db) => {
    db.syncState.running = true;
    db.syncState.lastError = null;
  });

  const summary: SyncSummary = {
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    source: isDemoMode() ? "demo" : "riot",
    candidateMatches: 0,
    newMatchesFetched: 0,
    groupMatchesAdded: 0,
    skippedNonGroup: 0,
    skippedNonAram: 0,
    pendingMatches: 0,
    addedMatchIds: [],
    errors: [],
    workbookPath: null,
  };

  try {
    const db = await readDb();
    const settings = db.settings;
    let roster = db.roster;

    // In demo mode an empty roster is seeded with the sample friend group so the
    // app has something to show on first run.
    if (roster.length === 0 && summary.source === "demo") {
      roster = await updateDb((current) => {
        current.roster = demoRosterMembers();
        return current.roster;
      });
    }

    if (roster.length === 0) {
      summary.errors.push("Add at least one friend to the roster before syncing.");
      return await finish(summary);
    }

    const known = new Set([...Object.keys(db.matches), ...db.skippedMatchIds]);
    const names = await createNameResolver();

    const fetched: Array<{ match: RawMatch; timeline: RawTimeline | null }> = [];

    if (summary.source === "demo") {
      // Generating pages from the live trees keeps demo runes valid as patches
      // add and retire them.
      const runeTrees = await loadRuneTrees();
      const history = demoMatchHistory({
        roster,
        count: DEMO_HISTORY_SIZE,
        runeTrees,
      });

      // A simulated game ends a minute ago, so it lands at the top of the list
      // exactly like a real match the watcher just picked up.
      if (options.simulateNewDemoMatch) {
        history.unshift(
          buildDemoMatch({
            roster,
            index: nextDemoMatchIndex([...known]),
            endedAt: Date.now() - 60_000,
            runeTrees,
          }),
        );
      }

      summary.candidateMatches = history.length;

      const unseen = history.filter((entry) => !known.has(entry.match.metadata.matchId));
      summary.pendingMatches = Math.max(0, unseen.length - settings.maxMatchesPerSync);

      for (const entry of unseen.slice(0, settings.maxMatchesPerSync)) {
        fetched.push({
          match: entry.match,
          timeline: settings.fetchTimelines ? entry.timeline : null,
        });
      }
    } else {
      const client = new RiotClient(settings.region);
      roster = await resolveRoster(client, roster, summary.errors);

      const startTime = Math.max(
        MATCH_HISTORY_EPOCH_SECONDS,
        Math.floor((Date.now() - settings.lookbackDays * 86_400_000) / 1000),
      );

      const candidateIds = new Set<string>();
      for (const member of roster) {
        if (!member.resolved || !member.puuid) continue;
        try {
          const ids = await client.getMatchIds(member.puuid, {
            queue: ARAM_QUEUE_ID,
            count: settings.matchesPerPlayer,
            startTime,
          });
          ids.forEach((id) => candidateIds.add(id));
        } catch (error) {
          summary.errors.push(
            `Match history for ${member.gameName}#${member.tagLine}: ${errorMessage(error)}`,
          );
        }
      }
      summary.candidateMatches = candidateIds.size;

      // Match IDs sort lexicographically in chronological order within a
      // platform, so newest-first means recent games land before the backfill.
      const unseen = [...candidateIds]
        .filter((matchId) => !known.has(matchId))
        .sort((a, b) => b.localeCompare(a));
      summary.pendingMatches = Math.max(0, unseen.length - settings.maxMatchesPerSync);

      for (const matchId of unseen.slice(0, settings.maxMatchesPerSync)) {
        try {
          const match = await client.getMatch(matchId);
          let timeline: RawTimeline | null = null;
          if (settings.fetchTimelines && match.info.queueId === ARAM_QUEUE_ID) {
            try {
              timeline = await client.getTimeline(matchId);
            } catch (error) {
              // Ability order is a nice-to-have; never fail a match over it.
              summary.errors.push(`Timeline for ${matchId}: ${errorMessage(error)}`);
            }
          }
          fetched.push({ match, timeline });
        } catch (error) {
          summary.errors.push(`Match ${matchId}: ${errorMessage(error)}`);
        }
      }
    }

    summary.newMatchesFetched = fetched.length;

    const accepted: MatchRecord[] = [];
    const rejected: string[] = [];

    for (const { match, timeline } of fetched) {
      // The queue filter is applied server-side too, but ARAM is defined by
      // queueId 450 so we verify it on the match itself before storing.
      if (match.info.queueId !== ARAM_QUEUE_ID) {
        summary.skippedNonAram += 1;
        rejected.push(match.metadata.matchId);
        continue;
      }

      const record = normalizeMatch(match, {
        names,
        roster,
        timeline,
        source: summary.source,
      });

      if (record.trackedPuuids.length < settings.minGroupSize) {
        summary.skippedNonGroup += 1;
        rejected.push(record.matchId);
        continue;
      }

      accepted.push(record);
    }

    if (accepted.length > 0 || rejected.length > 0) {
      await updateDb((current) => {
        for (const record of accepted) current.matches[record.matchId] = record;
        current.skippedMatchIds = [...new Set([...current.skippedMatchIds, ...rejected])];
      });
    }

    summary.groupMatchesAdded = accepted.length;
    summary.addedMatchIds = accepted.map((record) => record.matchId);

    if (accepted.length > 0 && settings.autoWriteWorkbook) {
      try {
        summary.workbookPath = await writeWorkbookToDisk(EXPORT_DIR, WORKBOOK_FILENAME);
      } catch (error) {
        summary.errors.push(`Workbook export: ${errorMessage(error)}`);
      }
    }

    return await finish(summary);
  } catch (error) {
    const message =
      error instanceof MissingApiKeyError
        ? error.message
        : `Sync failed: ${errorMessage(error)}`;
    summary.errors.push(message);
    return await finish(summary, message);
  }
}

async function finish(summary: SyncSummary, error: string | null = null): Promise<SyncSummary> {
  summary.finishedAt = Date.now();
  summary.durationMs = summary.finishedAt - summary.startedAt;

  await updateDb((db) => {
    db.syncState.running = false;
    db.syncState.lastSyncAt = summary.finishedAt;
    db.syncState.lastSummary = summary;
    db.syncState.lastError = error ?? summary.errors[0] ?? null;
    if (!error && summary.errors.length === 0) db.syncState.lastSuccessAt = summary.finishedAt;
  });

  return summary;
}
