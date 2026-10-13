/**
 * Domain types for the ARAM tracker.
 *
 * `Raw*` types mirror the shape Riot's Match-V5 API returns (only the fields we
 * read). Everything else is our own normalized storage shape, which is what the
 * UI and the Excel export are built on.
 */

/**
 * The ARAM family of queues, with IDs taken from Riot's published queue list
 * (https://static.developer.riotgames.com/docs/lol/queues.json). Everything in
 * the app keys off `queueId` rather than `gameMode`, because Mayhem is ARAM with
 * modifiers and Riot may report the same `gameMode` string for both.
 */
export interface QueueDefinition {
  id: number;
  /** Stable key used for grouping and for Excel sheet rows. */
  key: string;
  /** Short label shown in the UI and the spreadsheet. */
  label: string;
  /** Riot's own description of the queue. */
  description: string;
}

export const ARAM_QUEUES: QueueDefinition[] = [
  {
    id: 2400,
    key: "mayhem",
    label: "ARAM: Mayhem",
    description: "ARAM: Mayhem on Howling Abyss",
  },
  { id: 450, key: "aram", label: "ARAM", description: "5v5 ARAM on Howling Abyss" },
  {
    id: 720,
    key: "aram-clash",
    label: "ARAM Clash",
    description: "ARAM Clash on Howling Abyss",
  },
  {
    id: 100,
    key: "butchers-bridge",
    label: "ARAM (Butcher's Bridge)",
    description: "5v5 ARAM on Butcher's Bridge",
  },
];

/** Mayhem first: it is the mode this tracker is pointed at primarily. */
export const DEFAULT_TRACKED_QUEUE_IDS = [2400, 450];

export function queueById(queueId: number): QueueDefinition | undefined {
  return ARAM_QUEUES.find((queue) => queue.id === queueId);
}

export function queueLabel(queueId: number): string {
  return queueById(queueId)?.label ?? `Queue ${queueId}`;
}

/** Regional routing values used by account-v1 and match-v5. */
export type RegionalRoute = "americas" | "europe" | "asia" | "sea";

export interface RosterMember {
  puuid: string;
  gameName: string;
  tagLine: string;
  /** Short display name used in the UI and as Excel column headers. */
  alias: string;
  addedAt: number;
  /** False when we added them from a Riot ID we could not resolve to a puuid. */
  resolved: boolean;
}

export interface PerksSummary {
  primaryStyle: string;
  secondaryStyle: string;
  keystone: string;
  primarySelections: string[];
  secondarySelections: string[];
  statPerks: string[];
}

export interface ParticipantRecord {
  puuid: string;
  riotId: string;
  /** Roster alias when this player is part of the tracked group. */
  alias: string | null;
  isTracked: boolean;
  teamId: number;
  win: boolean;
  /** ARAM reports "NONE"; kept because the API exposes it. */
  position: string;

  championId: number;
  championName: string;
  champLevel: number;

  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  killParticipation: number | null;

  totalDamageDealtToChampions: number;
  damageDealtToTurrets: number;
  totalDamageTaken: number;
  damageSelfMitigated: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalDamageShieldedOnTeammates: number;
  effectiveHealAndShielding: number | null;

  goldEarned: number;
  goldSpent: number;
  totalMinionsKilled: number;

  visionScore: number;
  timeCCingOthers: number;
  totalTimeSpentDead: number;
  longestTimeSpentLiving: number;

  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  largestMultiKill: number;
  largestKillingSpree: number;
  firstBloodKill: boolean;

  timePlayed: number;
  damagePerMinute: number;
  goldPerMinute: number;
  teamDamagePercentage: number | null;
  damageTakenPercentage: number | null;

  items: string[];
  trinket: string;
  summonerSpells: string[];
  perks: PerksSummary;
  /** Derived from the match timeline when timelines are enabled. */
  abilityOrder: string | null;
}

export interface TeamRecord {
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  towers: number;
  inhibitors: number;
  firstBlood: boolean;
}

export interface MatchRecord {
  matchId: string;
  queueId: number;
  gameMode: string;
  gameVersion: string;
  patch: string;
  gameCreation: number;
  gameStartTimestamp: number;
  gameEndTimestamp: number;
  /** Seconds. */
  gameDuration: number;
  teams: TeamRecord[];
  participants: ParticipantRecord[];
  /** Puuids of roster members found in this match. */
  trackedPuuids: string[];
  /** True when every tracked player in the match was on the same team. */
  groupOnSameTeam: boolean;
  /** Win/loss from the tracked group's point of view; null if they were split. */
  groupWin: boolean | null;
  fetchedAt: number;
  hasTimeline: boolean;
  source: "riot" | "demo";
}

export interface Settings {
  region: RegionalRoute;
  /**
   * Queues pulled from match history and kept. Defaults to ARAM: Mayhem (2400)
   * and ARAM (450); every match is checked against this list by `queueId`.
   */
  trackedQueueIds: number[];
  /** A match only counts as a "group game" with at least this many roster members in it. */
  minGroupSize: number;
  /** How far back to look when pulling match history, in days. */
  lookbackDays: number;
  /** Match IDs pulled per roster member per sync. */
  matchesPerPlayer: number;
  /**
   * Cap on match details fetched in one sync pass. Rate limits make a large
   * first backfill slow, so each pass stays short and the next one continues.
   */
  maxMatchesPerSync: number;
  /** Fetch the timeline for ability order (one extra request per match). */
  fetchTimelines: boolean;
  /** Watcher poll interval, in seconds. */
  watchIntervalSeconds: number;
  /** Write exports/aram-stats.xlsx automatically whenever new matches land. */
  autoWriteWorkbook: boolean;
}

export interface SyncSummary {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  source: "riot" | "demo";
  /** Match IDs returned by Riot across all roster members, deduped. */
  candidateMatches: number;
  newMatchesFetched: number;
  groupMatchesAdded: number;
  skippedNonGroup: number;
  /** Matches dropped because their queueId is not in `settings.trackedQueueIds`. */
  skippedWrongQueue: number;
  /** Matches added in this pass, split by queue ID. */
  addedByQueue: Record<string, number>;
  /** Known-but-unfetched matches left over because of maxMatchesPerSync. */
  pendingMatches: number;
  addedMatchIds: string[];
  errors: string[];
  workbookPath: string | null;
}

export interface SyncState {
  lastSyncAt: number | null;
  lastSuccessAt: number | null;
  lastSummary: SyncSummary | null;
  lastError: string | null;
  /** Riot answered 401/403 on the last sync: the key is invalid or has expired. */
  keyRejected: boolean;
  running: boolean;
}

export interface Database {
  version: number;
  settings: Settings;
  roster: RosterMember[];
  matches: Record<string, MatchRecord>;
  /** Seen match IDs that are not tracked group games, so we never refetch them. */
  skippedMatchIds: string[];
  syncState: SyncState;
}

/* ------------------------------------------------------------------ */
/* Raw Riot API shapes (subset)                                        */
/* ------------------------------------------------------------------ */

export interface RawAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RawChallenges {
  kda?: number;
  killParticipation?: number;
  damagePerMinute?: number;
  goldPerMinute?: number;
  teamDamagePercentage?: number;
  damageTakenOnTeamPercentage?: number;
  effectiveHealAndShielding?: number;
  [key: string]: number | number[] | undefined;
}

export interface RawPerkSelection {
  perk: number;
  var1?: number;
  var2?: number;
  var3?: number;
}

export interface RawPerkStyle {
  description: string;
  style: number;
  selections: RawPerkSelection[];
}

export interface RawParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  teamId: number;
  win: boolean;
  teamPosition?: string;
  individualPosition?: string;
  championId: number;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  damageDealtToTurrets: number;
  totalDamageTaken: number;
  damageSelfMitigated: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalDamageShieldedOnTeammates: number;
  goldEarned: number;
  goldSpent: number;
  totalMinionsKilled: number;
  neutralMinionsKilled?: number;
  visionScore: number;
  timeCCingOthers: number;
  totalTimeSpentDead: number;
  longestTimeSpentLiving: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  largestMultiKill: number;
  largestKillingSpree: number;
  firstBloodKill: boolean;
  timePlayed: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: {
    statPerks?: { defense: number; flex: number; offense: number };
    styles?: RawPerkStyle[];
  };
  challenges?: RawChallenges;
}

export interface RawTeam {
  teamId: number;
  win: boolean;
  objectives?: Record<string, { first?: boolean; kills?: number } | undefined>;
}

export interface RawMatch {
  metadata: { matchId: string; participants: string[] };
  info: {
    queueId: number;
    gameMode: string;
    gameVersion: string;
    gameCreation: number;
    gameStartTimestamp: number;
    gameEndTimestamp?: number;
    gameDuration: number;
    participants: RawParticipant[];
    teams: RawTeam[];
  };
}

export interface RawTimeline {
  metadata: { matchId: string; participants: string[] };
  info: {
    frames: Array<{
      events: Array<{
        type: string;
        participantId?: number;
        skillSlot?: number;
        timestamp?: number;
      }>;
    }>;
  };
}
