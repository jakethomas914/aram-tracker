import type { NameResolver } from "@/lib/riot/ddragon";
import type {
  MatchRecord,
  ParticipantRecord,
  PerksSummary,
  RawMatch,
  RawParticipant,
  RawTimeline,
  RosterMember,
  TeamRecord,
} from "@/lib/types";

const SKILL_SLOT_LABELS = ["Q", "W", "E", "R"];

/**
 * Ability order is not part of the match summary — it comes from
 * SKILL_LEVEL_UP events in the match timeline, keyed by participantId (the
 * 1-based index into info.participants).
 */
export function deriveAbilityOrders(timeline: RawTimeline): Map<number, string> {
  const orders = new Map<number, string[]>();
  for (const frame of timeline.info.frames ?? []) {
    for (const event of frame.events ?? []) {
      if (event.type !== "SKILL_LEVEL_UP") continue;
      if (!event.participantId || !event.skillSlot) continue;
      const label = SKILL_SLOT_LABELS[event.skillSlot - 1];
      if (!label) continue;
      const list = orders.get(event.participantId) ?? [];
      list.push(label);
      orders.set(event.participantId, list);
    }
  }
  return new Map([...orders].map(([id, labels]) => [id, labels.join(" > ")]));
}

function summarizePerks(participant: RawParticipant, names: NameResolver): PerksSummary {
  const styles = participant.perks?.styles ?? [];
  const primary = styles.find((style) => style.description === "primaryStyle") ?? styles[0];
  const secondary = styles.find((style) => style.description === "subStyle") ?? styles[1];
  const stats = participant.perks?.statPerks;

  const primarySelections = (primary?.selections ?? []).map((selection) =>
    names.rune(selection.perk),
  );

  return {
    primaryStyle: primary ? names.runeStyle(primary.style) : "",
    secondaryStyle: secondary ? names.runeStyle(secondary.style) : "",
    keystone: primarySelections[0] ?? "",
    primarySelections,
    secondarySelections: (secondary?.selections ?? []).map((selection) =>
      names.rune(selection.perk),
    ),
    statPerks: stats
      ? [stats.offense, stats.flex, stats.defense].map((id) => names.statPerk(id))
      : [],
  };
}

function riotIdOf(participant: RawParticipant): string {
  const name = participant.riotIdGameName ?? participant.summonerName ?? "Unknown";
  const tag = participant.riotIdTagline;
  return tag ? `${name}#${tag}` : name;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeParticipant(
  participant: RawParticipant,
  options: {
    index: number;
    names: NameResolver;
    rosterByPuuid: Map<string, RosterMember>;
    abilityOrders: Map<number, string> | null;
    gameDurationSeconds: number;
  },
): ParticipantRecord {
  const { names, rosterByPuuid, abilityOrders, gameDurationSeconds } = options;
  const member = rosterByPuuid.get(participant.puuid);
  const challenges = participant.challenges ?? {};
  const minutes = Math.max(1 / 60, (participant.timePlayed || gameDurationSeconds) / 60);

  const kda =
    challenges.kda ??
    (participant.deaths === 0
      ? participant.kills + participant.assists
      : (participant.kills + participant.assists) / participant.deaths);

  const items = [
    participant.item0,
    participant.item1,
    participant.item2,
    participant.item3,
    participant.item4,
    participant.item5,
  ]
    .map((id) => names.item(id))
    .filter(Boolean);

  return {
    puuid: participant.puuid,
    riotId: member ? `${member.gameName}#${member.tagLine}` : riotIdOf(participant),
    alias: member?.alias ?? null,
    isTracked: Boolean(member),
    teamId: participant.teamId,
    win: participant.win,
    position: participant.teamPosition || participant.individualPosition || "NONE",

    championId: participant.championId,
    championName: participant.championName,
    champLevel: participant.champLevel,

    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    kda: round(kda),
    killParticipation:
      challenges.killParticipation !== undefined
        ? round(challenges.killParticipation, 4)
        : null,

    totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
    damageDealtToTurrets: participant.damageDealtToTurrets,
    totalDamageTaken: participant.totalDamageTaken,
    damageSelfMitigated: participant.damageSelfMitigated,
    totalHeal: participant.totalHeal,
    totalHealsOnTeammates: participant.totalHealsOnTeammates,
    totalDamageShieldedOnTeammates: participant.totalDamageShieldedOnTeammates,
    effectiveHealAndShielding:
      challenges.effectiveHealAndShielding !== undefined
        ? Math.round(challenges.effectiveHealAndShielding)
        : null,

    goldEarned: participant.goldEarned,
    goldSpent: participant.goldSpent,
    totalMinionsKilled:
      participant.totalMinionsKilled + (participant.neutralMinionsKilled ?? 0),

    visionScore: participant.visionScore,
    timeCCingOthers: participant.timeCCingOthers,
    totalTimeSpentDead: participant.totalTimeSpentDead,
    longestTimeSpentLiving: participant.longestTimeSpentLiving,

    doubleKills: participant.doubleKills,
    tripleKills: participant.tripleKills,
    quadraKills: participant.quadraKills,
    pentaKills: participant.pentaKills,
    largestMultiKill: participant.largestMultiKill,
    largestKillingSpree: participant.largestKillingSpree,
    firstBloodKill: participant.firstBloodKill,

    timePlayed: participant.timePlayed,
    damagePerMinute: round(
      challenges.damagePerMinute ?? participant.totalDamageDealtToChampions / minutes,
    ),
    goldPerMinute: round(challenges.goldPerMinute ?? participant.goldEarned / minutes),
    teamDamagePercentage:
      challenges.teamDamagePercentage !== undefined
        ? round(challenges.teamDamagePercentage, 4)
        : null,
    damageTakenPercentage:
      challenges.damageTakenOnTeamPercentage !== undefined
        ? round(challenges.damageTakenOnTeamPercentage, 4)
        : null,

    items,
    trinket: names.item(participant.item6),
    summonerSpells: [
      names.summonerSpell(participant.summoner1Id),
      names.summonerSpell(participant.summoner2Id),
    ].filter(Boolean),
    perks: summarizePerks(participant, names),
    abilityOrder: abilityOrders?.get(options.index + 1) ?? null,
  };
}

function normalizeTeams(raw: RawMatch): TeamRecord[] {
  return raw.info.teams.map((team) => {
    const members = raw.info.participants.filter(
      (participant) => participant.teamId === team.teamId,
    );
    const sum = (pick: (p: RawParticipant) => number) =>
      members.reduce((total, participant) => total + pick(participant), 0);

    return {
      teamId: team.teamId,
      win: team.win,
      kills: team.objectives?.champion?.kills ?? sum((p) => p.kills),
      deaths: sum((p) => p.deaths),
      assists: sum((p) => p.assists),
      towers: team.objectives?.tower?.kills ?? 0,
      inhibitors: team.objectives?.inhibitor?.kills ?? 0,
      firstBlood: Boolean(team.objectives?.champion?.first),
    };
  });
}

export function patchFromGameVersion(gameVersion: string): string {
  const parts = gameVersion.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : gameVersion;
}

export function normalizeMatch(
  raw: RawMatch,
  options: {
    names: NameResolver;
    roster: RosterMember[];
    timeline?: RawTimeline | null;
    source?: "riot" | "demo";
  },
): MatchRecord {
  const rosterByPuuid = new Map(options.roster.map((member) => [member.puuid, member]));
  const abilityOrders = options.timeline ? deriveAbilityOrders(options.timeline) : null;

  const participants = raw.info.participants.map((participant, index) =>
    normalizeParticipant(participant, {
      index,
      names: options.names,
      rosterByPuuid,
      abilityOrders,
      gameDurationSeconds: raw.info.gameDuration,
    }),
  );

  const tracked = participants.filter((participant) => participant.isTracked);
  const teamIds = new Set(tracked.map((participant) => participant.teamId));
  const groupOnSameTeam = tracked.length > 0 && teamIds.size === 1;

  return {
    matchId: raw.metadata.matchId,
    queueId: raw.info.queueId,
    gameMode: raw.info.gameMode,
    gameVersion: raw.info.gameVersion,
    patch: patchFromGameVersion(raw.info.gameVersion),
    gameCreation: raw.info.gameCreation,
    gameStartTimestamp: raw.info.gameStartTimestamp,
    gameEndTimestamp:
      raw.info.gameEndTimestamp ?? raw.info.gameStartTimestamp + raw.info.gameDuration * 1000,
    gameDuration: raw.info.gameDuration,
    teams: normalizeTeams(raw),
    participants,
    trackedPuuids: tracked.map((participant) => participant.puuid),
    groupOnSameTeam,
    groupWin: groupOnSameTeam ? tracked[0].win : null,
    fetchedAt: Date.now(),
    hasTimeline: Boolean(abilityOrders && abilityOrders.size > 0),
    source: options.source ?? "riot",
  };
}
