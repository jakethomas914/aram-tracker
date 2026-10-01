import {
  CHAMPION_CLASSES,
  CHAMPION_CLASS_KEYS,
  type ChampionClassKey,
  getPrimaryChampionClass,
} from "@/lib/riot/champion-data";
import { ARAM_QUEUES, type MatchRecord, type ParticipantRecord, queueLabel } from "@/lib/types";

export interface PlayerSummary {
  puuid: string;
  alias: string;
  riotId: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  avgDamage: number;
  avgDamageTaken: number;
  avgHealing: number;
  avgShielding: number;
  avgGold: number;
  avgDpm: number;
  avgGpm: number;
  avgKillParticipation: number;
  avgTeamDamageShare: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  firstBloods: number;
  championsPlayed: number;
  favoriteChampion: string;
  favoriteChampionGames: number;
  minutesPlayed: number;
  longestWinStreak: number;
  currentStreak: number;
}

export interface ChampionSummary {
  alias: string;
  champion: string;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDamage: number;
  avgDpm: number;
}

export interface DuoSummary {
  playerA: string;
  playerB: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface RecordEntry {
  award: string;
  player: string;
  value: string;
  champion: string;
  matchId: string;
  playedAt: number;
}

export interface GroupOverview {
  matches: number;
  wins: number;
  losses: number;
  splitGames: number;
  winRate: number;
  firstMatchAt: number | null;
  lastMatchAt: number | null;
  avgDurationSeconds: number;
  totalMinutes: number;
  currentStreak: { type: "W" | "L" | null; length: number };
  longestWinStreak: number;
  longestLossStreak: number;
  totalKills: number;
  totalDeaths: number;
  pentaKills: number;
  uniqueChampions: number;
  patches: string[];
}

/** Per-queue split, so ARAM: Mayhem and standard ARAM can be read separately. */
export interface QueueSummary {
  queueId: number;
  label: string;
  games: number;
  wins: number;
  losses: number;
  splitGames: number;
  winRate: number;
  avgDurationSeconds: number;
  totalMinutes: number;
  uniqueChampions: number;
  pentaKills: number;
  firstMatchAt: number | null;
  lastMatchAt: number | null;
  /** Share of all tracked group games, 0–1. */
  shareOfGames: number;
}

/** Matches where the tracked friends were all on one team, oldest first. */
function chronological(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => a.gameStartTimestamp - b.gameStartTimestamp);
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function trackedParticipants(match: MatchRecord): ParticipantRecord[] {
  return match.participants.filter((participant) => participant.isTracked);
}

function streaks(results: boolean[]): {
  longestWin: number;
  longestLoss: number;
  current: { type: "W" | "L" | null; length: number };
} {
  let longestWin = 0;
  let longestLoss = 0;
  let run = 0;
  let runIsWin: boolean | null = null;

  for (const win of results) {
    if (win === runIsWin) {
      run += 1;
    } else {
      run = 1;
      runIsWin = win;
    }
    if (win) longestWin = Math.max(longestWin, run);
    else longestLoss = Math.max(longestLoss, run);
  }

  return {
    longestWin,
    longestLoss,
    current:
      runIsWin === null
        ? { type: null, length: 0 }
        : { type: runIsWin ? "W" : "L", length: run },
  };
}

export function buildGroupOverview(matches: MatchRecord[]): GroupOverview {
  const ordered = chronological(matches);
  const decided = ordered.filter((match) => match.groupWin !== null);
  const results = decided.map((match) => match.groupWin === true);
  const { longestWin, longestLoss, current } = streaks(results);

  const totalSeconds = ordered.reduce((total, match) => total + match.gameDuration, 0);
  const champions = new Set<string>();
  let totalKills = 0;
  let totalDeaths = 0;
  let pentaKills = 0;

  for (const match of ordered) {
    for (const participant of trackedParticipants(match)) {
      champions.add(participant.championName);
      totalKills += participant.kills;
      totalDeaths += participant.deaths;
      pentaKills += participant.pentaKills;
    }
  }

  const wins = results.filter(Boolean).length;

  return {
    matches: ordered.length,
    wins,
    losses: decided.length - wins,
    splitGames: ordered.length - decided.length,
    winRate: round(safeDivide(wins, decided.length), 4),
    firstMatchAt: ordered[0]?.gameStartTimestamp ?? null,
    lastMatchAt: ordered[ordered.length - 1]?.gameStartTimestamp ?? null,
    avgDurationSeconds: Math.round(safeDivide(totalSeconds, ordered.length)),
    totalMinutes: Math.round(totalSeconds / 60),
    currentStreak: current,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    totalKills,
    totalDeaths,
    pentaKills,
    uniqueChampions: champions.size,
    patches: [...new Set(ordered.map((match) => match.patch))].sort(),
  };
}

/**
 * Queues are ordered the way `ARAM_QUEUES` lists them (Mayhem first) rather than
 * by volume, so the primary mode keeps a stable position as games accumulate.
 */
export function buildQueueSummaries(matches: MatchRecord[]): QueueSummary[] {
  const buckets = new Map<number, MatchRecord[]>();
  for (const match of matches) {
    const bucket = buckets.get(match.queueId) ?? [];
    bucket.push(match);
    buckets.set(match.queueId, bucket);
  }

  const priority = (queueId: number) => {
    const index = ARAM_QUEUES.findIndex((queue) => queue.id === queueId);
    return index === -1 ? ARAM_QUEUES.length : index;
  };

  return [...buckets.entries()]
    .map(([queueId, bucket]) => {
      const ordered = chronological(bucket);
      const decided = ordered.filter((match) => match.groupWin !== null);
      const wins = decided.filter((match) => match.groupWin === true).length;
      const totalSeconds = ordered.reduce((total, match) => total + match.gameDuration, 0);

      const champions = new Set<string>();
      let pentaKills = 0;
      for (const match of ordered) {
        for (const participant of trackedParticipants(match)) {
          champions.add(participant.championName);
          pentaKills += participant.pentaKills;
        }
      }

      return {
        queueId,
        label: queueLabel(queueId),
        games: ordered.length,
        wins,
        losses: decided.length - wins,
        splitGames: ordered.length - decided.length,
        winRate: round(safeDivide(wins, decided.length), 4),
        avgDurationSeconds: Math.round(safeDivide(totalSeconds, ordered.length)),
        totalMinutes: Math.round(totalSeconds / 60),
        uniqueChampions: champions.size,
        pentaKills,
        firstMatchAt: ordered[0]?.gameStartTimestamp ?? null,
        lastMatchAt: ordered[ordered.length - 1]?.gameStartTimestamp ?? null,
        shareOfGames: round(safeDivide(ordered.length, matches.length), 4),
      };
    })
    .sort((a, b) => priority(a.queueId) - priority(b.queueId) || b.games - a.games);
}

/** Share of tracked picks by champion class (ADC, tank, assassin, and so on). */
export interface ChampionClassSummary {
  classKey: ChampionClassKey;
  label: string;
  shortLabel: string;
  picks: number;
  /** 0–1 share of every tracked pick. */
  share: number;
  wins: number;
  winRate: number;
  avgDamage: number;
}

/**
 * Each tracked pick counts once, under the champion's primary Data Dragon tag.
 * Classes with no picks stay in the list so the set of roles stays stable.
 */
export function buildChampionClassSummaries(matches: MatchRecord[]): ChampionClassSummary[] {
  const buckets = new Map<ChampionClassKey, { picks: number; wins: number; damage: number }>();
  for (const key of CHAMPION_CLASS_KEYS) {
    buckets.set(key, { picks: 0, wins: 0, damage: 0 });
  }

  let total = 0;
  for (const match of matches) {
    for (const participant of trackedParticipants(match)) {
      const key = getPrimaryChampionClass(participant.championName || participant.championId);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.picks += 1;
      if (participant.win) bucket.wins += 1;
      bucket.damage += participant.totalDamageDealtToChampions;
      total += 1;
    }
  }

  return CHAMPION_CLASS_KEYS.map((key) => {
    const bucket = buckets.get(key) ?? { picks: 0, wins: 0, damage: 0 };
    const meta = CHAMPION_CLASSES[key];
    return {
      classKey: key,
      label: meta.label,
      shortLabel: meta.shortLabel,
      picks: bucket.picks,
      share: round(safeDivide(bucket.picks, total), 4),
      wins: bucket.wins,
      winRate: round(safeDivide(bucket.wins, bucket.picks), 4),
      avgDamage: Math.round(safeDivide(bucket.damage, bucket.picks)),
    };
  }).sort((a, b) => b.share - a.share || a.label.localeCompare(b.label));
}

export function buildPlayerSummaries(matches: MatchRecord[]): PlayerSummary[] {
  const ordered = chronological(matches);
  const byPlayer = new Map<string, { rows: ParticipantRecord[]; results: boolean[] }>();

  for (const match of ordered) {
    for (const participant of trackedParticipants(match)) {
      const entry = byPlayer.get(participant.puuid) ?? { rows: [], results: [] };
      entry.rows.push(participant);
      entry.results.push(participant.win);
      byPlayer.set(participant.puuid, entry);
    }
  }

  const summaries: PlayerSummary[] = [];

  for (const [puuid, { rows, results }] of byPlayer) {
    const games = rows.length;
    const sum = (pick: (row: ParticipantRecord) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);

    const kills = sum((row) => row.kills);
    const deaths = sum((row) => row.deaths);
    const assists = sum((row) => row.assists);

    const championCounts = new Map<string, number>();
    for (const row of rows) {
      championCounts.set(row.championName, (championCounts.get(row.championName) ?? 0) + 1);
    }
    const [favoriteChampion, favoriteChampionGames] = [...championCounts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] ?? ["—", 0];

    const kpRows = rows.filter((row) => row.killParticipation !== null);
    const shareRows = rows.filter((row) => row.teamDamagePercentage !== null);
    const { longestWin, current } = streaks(results);
    const wins = results.filter(Boolean).length;

    summaries.push({
      puuid,
      alias: rows[rows.length - 1].alias ?? rows[rows.length - 1].riotId,
      riotId: rows[rows.length - 1].riotId,
      games,
      wins,
      losses: games - wins,
      winRate: round(safeDivide(wins, games), 4),
      kills,
      deaths,
      assists,
      avgKills: round(safeDivide(kills, games)),
      avgDeaths: round(safeDivide(deaths, games)),
      avgAssists: round(safeDivide(assists, games)),
      kda: round(deaths === 0 ? kills + assists : safeDivide(kills + assists, deaths)),
      avgDamage: Math.round(safeDivide(sum((row) => row.totalDamageDealtToChampions), games)),
      avgDamageTaken: Math.round(safeDivide(sum((row) => row.totalDamageTaken), games)),
      avgHealing: Math.round(safeDivide(sum((row) => row.totalHeal), games)),
      avgShielding: Math.round(
        safeDivide(sum((row) => row.totalDamageShieldedOnTeammates), games),
      ),
      avgGold: Math.round(safeDivide(sum((row) => row.goldEarned), games)),
      avgDpm: round(safeDivide(sum((row) => row.damagePerMinute), games), 1),
      avgGpm: round(safeDivide(sum((row) => row.goldPerMinute), games), 1),
      avgKillParticipation: round(
        safeDivide(
          kpRows.reduce((total, row) => total + (row.killParticipation ?? 0), 0),
          kpRows.length,
        ),
        4,
      ),
      avgTeamDamageShare: round(
        safeDivide(
          shareRows.reduce((total, row) => total + (row.teamDamagePercentage ?? 0), 0),
          shareRows.length,
        ),
        4,
      ),
      doubleKills: sum((row) => row.doubleKills),
      tripleKills: sum((row) => row.tripleKills),
      quadraKills: sum((row) => row.quadraKills),
      pentaKills: sum((row) => row.pentaKills),
      firstBloods: rows.filter((row) => row.firstBloodKill).length,
      championsPlayed: championCounts.size,
      favoriteChampion,
      favoriteChampionGames,
      minutesPlayed: Math.round(sum((row) => row.timePlayed) / 60),
      longestWinStreak: longestWin,
      currentStreak: current.type === "W" ? current.length : -current.length,
    });
  }

  return summaries.sort((a, b) => b.games - a.games || a.alias.localeCompare(b.alias));
}

export function buildChampionSummaries(matches: MatchRecord[]): ChampionSummary[] {
  const buckets = new Map<string, ParticipantRecord[]>();

  for (const match of matches) {
    for (const participant of trackedParticipants(match)) {
      const alias = participant.alias ?? participant.riotId;
      const key = `${alias}\u0000${participant.championName}`;
      const rows = buckets.get(key) ?? [];
      rows.push(participant);
      buckets.set(key, rows);
    }
  }

  return [...buckets.entries()]
    .map(([key, rows]) => {
      const [alias, champion] = key.split("\u0000");
      const games = rows.length;
      const sum = (pick: (row: ParticipantRecord) => number) =>
        rows.reduce((total, row) => total + pick(row), 0);
      const kills = sum((row) => row.kills);
      const deaths = sum((row) => row.deaths);
      const assists = sum((row) => row.assists);
      const wins = rows.filter((row) => row.win).length;

      return {
        alias,
        champion,
        games,
        wins,
        winRate: round(safeDivide(wins, games), 4),
        kda: round(deaths === 0 ? kills + assists : safeDivide(kills + assists, deaths)),
        avgKills: round(safeDivide(kills, games)),
        avgDeaths: round(safeDivide(deaths, games)),
        avgAssists: round(safeDivide(assists, games)),
        avgDamage: Math.round(safeDivide(sum((row) => row.totalDamageDealtToChampions), games)),
        avgDpm: round(safeDivide(sum((row) => row.damagePerMinute), games), 1),
      };
    })
    .sort(
      (a, b) =>
        b.games - a.games ||
        a.alias.localeCompare(b.alias) ||
        a.champion.localeCompare(b.champion),
    );
}

/** Win rate for every pair of friends that has queued together. */
export function buildDuoSummaries(matches: MatchRecord[]): DuoSummary[] {
  const pairs = new Map<string, { games: number; wins: number }>();

  for (const match of matches) {
    const tracked = trackedParticipants(match);
    // Only count a pair when they were actually on the same side.
    const sameTeam = tracked.filter(
      (participant) => participant.teamId === tracked[0]?.teamId,
    );
    const teammates = sameTeam
      .map((participant) => participant.alias ?? participant.riotId)
      .sort((a, b) => a.localeCompare(b));
    const won = sameTeam[0]?.win ?? false;

    for (let i = 0; i < teammates.length; i += 1) {
      for (let j = i + 1; j < teammates.length; j += 1) {
        const key = `${teammates[i]}\u0000${teammates[j]}`;
        const entry = pairs.get(key) ?? { games: 0, wins: 0 };
        entry.games += 1;
        if (won) entry.wins += 1;
        pairs.set(key, entry);
      }
    }
  }

  return [...pairs.entries()]
    .map(([key, { games, wins }]) => {
      const [playerA, playerB] = key.split("\u0000");
      return {
        playerA,
        playerB,
        games,
        wins,
        winRate: round(safeDivide(wins, games), 4),
      };
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

interface AwardDefinition {
  award: string;
  pick: (row: ParticipantRecord) => number;
  format: (value: number) => string;
  /** Lowest value wins instead of highest. */
  lowest?: boolean;
}

const AWARDS: AwardDefinition[] = [
  {
    award: "Most kills in a game",
    pick: (row) => row.kills,
    format: (value) => `${value} kills`,
  },
  {
    award: "Most deaths in a game",
    pick: (row) => row.deaths,
    format: (value) => `${value} deaths`,
  },
  {
    award: "Most assists in a game",
    pick: (row) => row.assists,
    format: (value) => `${value} assists`,
  },
  {
    award: "Highest damage to champions",
    pick: (row) => row.totalDamageDealtToChampions,
    format: (value) => `${value.toLocaleString("en-US")} damage`,
  },
  {
    award: "Highest damage per minute",
    pick: (row) => row.damagePerMinute,
    format: (value) => `${Math.round(value).toLocaleString("en-US")} DPM`,
  },
  {
    award: "Most damage taken",
    pick: (row) => row.totalDamageTaken,
    format: (value) => `${value.toLocaleString("en-US")} taken`,
  },
  {
    award: "Most healing",
    pick: (row) => row.totalHeal,
    format: (value) => `${value.toLocaleString("en-US")} healed`,
  },
  {
    award: "Most shielding on teammates",
    pick: (row) => row.totalDamageShieldedOnTeammates,
    format: (value) => `${value.toLocaleString("en-US")} shielded`,
  },
  {
    award: "Most gold earned",
    pick: (row) => row.goldEarned,
    format: (value) => `${value.toLocaleString("en-US")} gold`,
  },
  {
    award: "Highest kill participation",
    pick: (row) => row.killParticipation ?? 0,
    format: (value) => `${Math.round(value * 100)}% KP`,
  },
  {
    award: "Longest killing spree",
    pick: (row) => row.largestKillingSpree,
    format: (value) => `${value} in a row`,
  },
  {
    award: "Most time spent dead",
    pick: (row) => row.totalTimeSpentDead,
    format: (value) => `${Math.round(value / 60)} min dead`,
  },
  {
    award: "Best KDA in a game",
    pick: (row) => row.kda,
    format: (value) => `${value.toFixed(2)} KDA`,
  },
  {
    award: "Fewest deaths (min 10 kills)",
    pick: (row) => (row.kills >= 10 ? row.deaths : Number.POSITIVE_INFINITY),
    format: (value) => `${value} deaths`,
    lowest: true,
  },
];

export function buildRecords(matches: MatchRecord[]): RecordEntry[] {
  const rows: Array<{ match: MatchRecord; participant: ParticipantRecord }> = [];
  for (const match of matches) {
    for (const participant of trackedParticipants(match)) rows.push({ match, participant });
  }
  if (rows.length === 0) return [];

  const records: RecordEntry[] = [];

  for (const definition of AWARDS) {
    let best: { match: MatchRecord; participant: ParticipantRecord } | null = null;
    let bestValue = definition.lowest ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    for (const row of rows) {
      const value = definition.pick(row.participant);
      if (!Number.isFinite(value)) continue;
      const better = definition.lowest ? value < bestValue : value > bestValue;
      if (better) {
        bestValue = value;
        best = row;
      }
    }

    if (!best) continue;
    records.push({
      award: definition.award,
      player: best.participant.alias ?? best.participant.riotId,
      value: definition.format(bestValue),
      champion: best.participant.championName,
      matchId: best.match.matchId,
      playedAt: best.match.gameStartTimestamp,
    });
  }

  return records;
}
