import fs from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import { getMatches, readDb } from "@/lib/store/db";
import {
  buildChampionSummaries,
  buildPlayerChampionClassSummaries,
  buildDuoSummaries,
  buildGroupOverview,
  buildPlayerSummaries,
  buildQueueSummaries,
  buildRecords,
  type PlayerSummary,
} from "@/lib/stats/aggregate";
import { CHAMPION_CLASSES, CHAMPION_CLASS_KEYS } from "@/lib/riot/champion-data";
import type { MatchRecord, ParticipantRecord, RosterMember } from "@/lib/types";
import { queueLabel } from "@/lib/types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E2A44" },
};
const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2C14E" },
};
const WIN_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF15803D" }, bold: true };
const LOSS_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFB91C1C" }, bold: true };

const FMT_INT = "#,##0";
const FMT_DEC = "0.00";
const FMT_PCT = "0.0%";
const FMT_DATE = "yyyy-mm-dd hh:mm";

interface ColumnSpec<T> {
  header: string;
  width: number;
  numFmt?: string;
  value: (row: T) => string | number | Date | null;
}

function addSheet<T>(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Array<ColumnSpec<T>>,
  rows: T[],
  options: { freezeColumns?: number } = {},
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", xSplit: options.freezeColumns ?? 0, ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width,
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 28;

  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.value(row)));
  }

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  return sheet;
}

/** Colour every cell in a column green for Win and red for Loss. */
function paintResultColumn(sheet: ExcelJS.Worksheet, header: string): void {
  const index = (sheet.columns ?? []).findIndex((column) => column.header === header);
  if (index === -1) return;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = row.getCell(index + 1);
    if (cell.value === "Win") cell.font = WIN_FONT;
    else if (cell.value === "Loss") cell.font = LOSS_FONT;
  });
}

function toDate(timestamp: number): Date {
  return new Date(timestamp);
}

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function resultLabel(win: boolean | null): string {
  if (win === null) return "Split";
  return win ? "Win" : "Loss";
}

function joinList(values: string[]): string {
  return values.filter(Boolean).join(", ");
}

/* ------------------------------------------------------------------ */
/* Sheets                                                              */
/* ------------------------------------------------------------------ */

function buildOverviewSheet(
  workbook: ExcelJS.Workbook,
  matches: MatchRecord[],
  roster: RosterMember[],
  trackedQueueIds: number[],
): void {
  const overview = buildGroupOverview(matches);
  const queues = buildQueueSummaries(matches);
  const sheet = workbook.addWorksheet("Overview");
  sheet.columns = [
    { width: 34 },
    { width: 26 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  const lastColumn = 6;

  const title = sheet.addRow(["ARAM & ARAM: Mayhem Group Tracker"]);
  title.font = { bold: true, size: 16 };
  title.height = 24;
  sheet.mergeCells(title.number, 1, title.number, lastColumn);
  sheet.getCell(title.number, 1).fill = TITLE_FILL;
  sheet.getCell(title.number, 1).alignment = { vertical: "middle", horizontal: "center" };

  const trackedLabel = trackedQueueIds
    .map((queueId) => `${queueLabel(queueId)} (${queueId})`)
    .join(" · ");
  const subtitle = sheet.addRow([
    `Generated ${new Date().toLocaleString("en-US")} · tracked queues: ${trackedLabel || "none"}`,
  ]);
  subtitle.font = { italic: true, color: { argb: "FF64748B" } };
  sheet.mergeCells(subtitle.number, 1, subtitle.number, lastColumn);
  sheet.addRow([]);

  const section = (label: string) => {
    const row = sheet.addRow([label]);
    row.font = { bold: true, size: 12 };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    sheet.mergeCells(row.number, 1, row.number, lastColumn);
  };

  const stat = (label: string, value: string | number, numFmt?: string) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (numFmt) row.getCell(2).numFmt = numFmt;
  };

  section("Group record");
  stat("Games tracked", overview.matches, FMT_INT);
  stat("Wins", overview.wins, FMT_INT);
  stat("Losses", overview.losses, FMT_INT);
  stat("Win rate", overview.winRate, FMT_PCT);
  stat("Games with the group split across teams", overview.splitGames, FMT_INT);
  stat(
    "Current streak",
    overview.currentStreak.type
      ? `${overview.currentStreak.length} ${overview.currentStreak.type === "W" ? "win" : "loss"}${overview.currentStreak.length === 1 ? "" : "es"}`
      : "—",
  );
  stat("Longest win streak", overview.longestWinStreak, FMT_INT);
  stat("Longest loss streak", overview.longestLossStreak, FMT_INT);
  sheet.addRow([]);

  section("Record by queue");
  const queueHeader = sheet.addRow([
    "Queue",
    "Queue ID",
    "Games",
    "Wins",
    "Losses",
    "Win rate",
  ]);
  queueHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  queueHeader.fill = HEADER_FILL;
  if (queues.length === 0) {
    sheet.addRow(["No games tracked yet", "", 0, 0, 0, 0]);
  }
  for (const queue of queues) {
    const row = sheet.addRow([
      queue.label,
      queue.queueId,
      queue.games,
      queue.wins,
      queue.losses,
      queue.winRate,
    ]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = FMT_INT;
    for (const index of [3, 4, 5]) row.getCell(index).numFmt = FMT_INT;
    row.getCell(6).numFmt = FMT_PCT;
  }
  sheet.addRow([]);

  section("Totals");
  stat("Total time played (minutes)", overview.totalMinutes, FMT_INT);
  stat("Average game length", durationLabel(overview.avgDurationSeconds));
  stat("Total kills by the group", overview.totalKills, FMT_INT);
  stat("Total deaths by the group", overview.totalDeaths, FMT_INT);
  stat("Pentakills", overview.pentaKills, FMT_INT);
  stat("Unique champions played", overview.uniqueChampions, FMT_INT);
  stat("Patches covered", overview.patches.join(", ") || "—");
  stat(
    "First tracked game",
    overview.firstMatchAt ? toDate(overview.firstMatchAt).toLocaleString("en-US") : "—",
  );
  stat(
    "Most recent game",
    overview.lastMatchAt ? toDate(overview.lastMatchAt).toLocaleString("en-US") : "—",
  );
  sheet.addRow([]);

  section("Tracked roster");
  const rosterHeader = sheet.addRow(["Alias", "Riot ID", "Games", "Win rate"]);
  rosterHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  rosterHeader.fill = HEADER_FILL;

  const summaries = new Map(
    buildPlayerSummaries(matches).map((summary) => [summary.puuid, summary]),
  );
  for (const member of roster) {
    const summary = summaries.get(member.puuid);
    const row = sheet.addRow([
      member.alias,
      `${member.gameName}#${member.tagLine}`,
      summary?.games ?? 0,
      summary?.winRate ?? 0,
    ]);
    row.getCell(3).numFmt = FMT_INT;
    row.getCell(4).numFmt = FMT_PCT;
  }
}

function buildMatchesSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  const columns: Array<ColumnSpec<MatchRecord>> = [
    { header: "Match ID", width: 20, value: (m) => m.matchId },
    { header: "Played at", width: 20, numFmt: FMT_DATE, value: (m) => toDate(m.gameStartTimestamp) },
    { header: "Queue", width: 16, value: (m) => queueLabel(m.queueId) },
    { header: "Result", width: 9, value: (m) => resultLabel(m.groupWin) },
    { header: "Duration", width: 10, value: (m) => durationLabel(m.gameDuration) },
    { header: "Minutes", width: 9, numFmt: FMT_DEC, value: (m) => m.gameDuration / 60 },
    { header: "Friends in lobby", width: 15, numFmt: FMT_INT, value: (m) => m.trackedPuuids.length },
    {
      header: "Friends",
      width: 34,
      value: (m) =>
        joinList(
          m.participants
            .filter((p) => p.isTracked)
            .map((p) => `${p.alias ?? p.riotId} (${p.championName})`),
        ),
    },
    {
      header: "Group champions",
      width: 32,
      value: (m) => joinList(m.participants.filter((p) => p.isTracked).map((p) => p.championName)),
    },
    {
      header: "Group kills",
      width: 12,
      numFmt: FMT_INT,
      value: (m) => sumTracked(m, (p) => p.kills),
    },
    {
      header: "Group deaths",
      width: 12,
      numFmt: FMT_INT,
      value: (m) => sumTracked(m, (p) => p.deaths),
    },
    {
      header: "Group assists",
      width: 12,
      numFmt: FMT_INT,
      value: (m) => sumTracked(m, (p) => p.assists),
    },
    {
      header: "Group damage",
      width: 14,
      numFmt: FMT_INT,
      value: (m) => sumTracked(m, (p) => p.totalDamageDealtToChampions),
    },
    {
      header: "Group gold",
      width: 13,
      numFmt: FMT_INT,
      value: (m) => sumTracked(m, (p) => p.goldEarned),
    },
    { header: "Blue kills", width: 11, numFmt: FMT_INT, value: (m) => teamKills(m, 100) },
    { header: "Red kills", width: 11, numFmt: FMT_INT, value: (m) => teamKills(m, 200) },
    { header: "Group side", width: 11, value: (m) => groupSide(m) },
    { header: "Patch", width: 9, value: (m) => m.patch },
    { header: "Queue ID", width: 10, numFmt: FMT_INT, value: (m) => m.queueId },
    { header: "Game mode", width: 12, value: (m) => m.gameMode },
    { header: "Data source", width: 12, value: (m) => m.source },
  ];

  const sheet = addSheet(workbook, "Matches", columns, matches, { freezeColumns: 3 });
  paintResultColumn(sheet, "Result");
}

function sumTracked(match: MatchRecord, pick: (p: ParticipantRecord) => number): number {
  return match.participants
    .filter((participant) => participant.isTracked)
    .reduce((total, participant) => total + pick(participant), 0);
}

function teamKills(match: MatchRecord, teamId: number): number {
  return match.teams.find((team) => team.teamId === teamId)?.kills ?? 0;
}

function groupSide(match: MatchRecord): string {
  const tracked = match.participants.filter((participant) => participant.isTracked);
  if (tracked.length === 0) return "—";
  const sides = new Set(tracked.map((participant) => participant.teamId));
  if (sides.size > 1) return "Split";
  return tracked[0].teamId === 100 ? "Blue" : "Red";
}

interface PerformanceRow {
  match: MatchRecord;
  participant: ParticipantRecord;
}

function performanceColumns(): Array<ColumnSpec<PerformanceRow>> {
  return [
    { header: "Played at", width: 20, numFmt: FMT_DATE, value: ({ match }) => toDate(match.gameStartTimestamp) },
    { header: "Queue", width: 16, value: ({ match }) => queueLabel(match.queueId) },
    { header: "Player", width: 16, value: ({ participant }) => participant.alias ?? participant.riotId },
    { header: "Riot ID", width: 22, value: ({ participant }) => participant.riotId },
    { header: "Champion", width: 15, value: ({ participant }) => participant.championName },
    { header: "Result", width: 9, value: ({ participant }) => (participant.win ? "Win" : "Loss") },
    { header: "K", width: 6, numFmt: FMT_INT, value: ({ participant }) => participant.kills },
    { header: "D", width: 6, numFmt: FMT_INT, value: ({ participant }) => participant.deaths },
    { header: "A", width: 6, numFmt: FMT_INT, value: ({ participant }) => participant.assists },
    { header: "KDA", width: 8, numFmt: FMT_DEC, value: ({ participant }) => participant.kda },
    { header: "Kill participation", width: 15, numFmt: FMT_PCT, value: ({ participant }) => participant.killParticipation },
    { header: "Damage to champions", width: 18, numFmt: FMT_INT, value: ({ participant }) => participant.totalDamageDealtToChampions },
    { header: "Damage per minute", width: 16, numFmt: FMT_INT, value: ({ participant }) => participant.damagePerMinute },
    { header: "Team damage share", width: 16, numFmt: FMT_PCT, value: ({ participant }) => participant.teamDamagePercentage },
    { header: "Damage to turrets", width: 16, numFmt: FMT_INT, value: ({ participant }) => participant.damageDealtToTurrets },
    { header: "Damage taken", width: 14, numFmt: FMT_INT, value: ({ participant }) => participant.totalDamageTaken },
    { header: "Damage mitigated", width: 16, numFmt: FMT_INT, value: ({ participant }) => participant.damageSelfMitigated },
    { header: "Damage taken share", width: 16, numFmt: FMT_PCT, value: ({ participant }) => participant.damageTakenPercentage },
    { header: "Healing", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.totalHeal },
    { header: "Healing on teammates", width: 18, numFmt: FMT_INT, value: ({ participant }) => participant.totalHealsOnTeammates },
    { header: "Shielding on teammates", width: 19, numFmt: FMT_INT, value: ({ participant }) => participant.totalDamageShieldedOnTeammates },
    { header: "Effective heal + shield", width: 19, numFmt: FMT_INT, value: ({ participant }) => participant.effectiveHealAndShielding },
    { header: "Gold earned", width: 13, numFmt: FMT_INT, value: ({ participant }) => participant.goldEarned },
    { header: "Gold spent", width: 13, numFmt: FMT_INT, value: ({ participant }) => participant.goldSpent },
    { header: "Gold per minute", width: 14, numFmt: FMT_INT, value: ({ participant }) => participant.goldPerMinute },
    { header: "Minions killed", width: 14, numFmt: FMT_INT, value: ({ participant }) => participant.totalMinionsKilled },
    { header: "Champion level", width: 14, numFmt: FMT_INT, value: ({ participant }) => participant.champLevel },
    { header: "Double kills", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.doubleKills },
    { header: "Triple kills", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.tripleKills },
    { header: "Quadra kills", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.quadraKills },
    { header: "Penta kills", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.pentaKills },
    { header: "Largest multikill", width: 15, numFmt: FMT_INT, value: ({ participant }) => participant.largestMultiKill },
    { header: "Largest killing spree", width: 17, numFmt: FMT_INT, value: ({ participant }) => participant.largestKillingSpree },
    { header: "First blood", width: 11, value: ({ participant }) => (participant.firstBloodKill ? "Yes" : "No") },
    { header: "Crowd control time (s)", width: 18, numFmt: FMT_INT, value: ({ participant }) => participant.timeCCingOthers },
    { header: "Time spent dead (s)", width: 17, numFmt: FMT_INT, value: ({ participant }) => participant.totalTimeSpentDead },
    { header: "Longest time alive (s)", width: 18, numFmt: FMT_INT, value: ({ participant }) => participant.longestTimeSpentLiving },
    { header: "Vision score", width: 12, numFmt: FMT_INT, value: ({ participant }) => participant.visionScore },
    { header: "Time played (s)", width: 13, numFmt: FMT_INT, value: ({ participant }) => participant.timePlayed },
    { header: "Items", width: 60, value: ({ participant }) => joinList(participant.items) },
    { header: "Trinket", width: 18, value: ({ participant }) => participant.trinket },
    { header: "Summoner spells", width: 20, value: ({ participant }) => joinList(participant.summonerSpells) },
    { header: "Keystone", width: 20, value: ({ participant }) => participant.perks.keystone },
    { header: "Primary tree", width: 15, value: ({ participant }) => participant.perks.primaryStyle },
    { header: "Primary runes", width: 46, value: ({ participant }) => joinList(participant.perks.primarySelections) },
    { header: "Secondary tree", width: 15, value: ({ participant }) => participant.perks.secondaryStyle },
    { header: "Secondary runes", width: 34, value: ({ participant }) => joinList(participant.perks.secondarySelections) },
    { header: "Stat shards", width: 34, value: ({ participant }) => joinList(participant.perks.statPerks) },
    { header: "Ability order", width: 46, value: ({ participant }) => participant.abilityOrder ?? "" },
    { header: "Position", width: 10, value: ({ participant }) => participant.position },
    { header: "Team", width: 8, value: ({ participant }) => (participant.teamId === 100 ? "Blue" : "Red") },
    { header: "Team ID", width: 9, numFmt: FMT_INT, value: ({ participant }) => participant.teamId },
    { header: "Match ID", width: 20, value: ({ match }) => match.matchId },
    { header: "Patch", width: 9, value: ({ match }) => match.patch },
  ];
}

function buildPerformanceSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  matches: MatchRecord[],
  filter: (participant: ParticipantRecord) => boolean,
): void {
  const rows: PerformanceRow[] = [];
  for (const match of matches) {
    for (const participant of match.participants) {
      if (filter(participant)) rows.push({ match, participant });
    }
  }

  const sheet = addSheet(workbook, name, performanceColumns(), rows, { freezeColumns: 5 });
  paintResultColumn(sheet, "Result");
}

function playerTotalsColumns<T extends PlayerSummary>(): Array<ColumnSpec<T>> {
  return [
      { header: "Player", width: 16, value: (s) => s.alias },
      { header: "Riot ID", width: 22, value: (s) => s.riotId },
      { header: "Games", width: 8, numFmt: FMT_INT, value: (s) => s.games },
      { header: "Wins", width: 8, numFmt: FMT_INT, value: (s) => s.wins },
      { header: "Losses", width: 8, numFmt: FMT_INT, value: (s) => s.losses },
      { header: "Win rate", width: 10, numFmt: FMT_PCT, value: (s) => s.winRate },
      { header: "KDA", width: 8, numFmt: FMT_DEC, value: (s) => s.kda },
      { header: "Avg kills", width: 10, numFmt: FMT_DEC, value: (s) => s.avgKills },
      { header: "Avg deaths", width: 11, numFmt: FMT_DEC, value: (s) => s.avgDeaths },
      { header: "Avg assists", width: 11, numFmt: FMT_DEC, value: (s) => s.avgAssists },
      { header: "Total kills", width: 11, numFmt: FMT_INT, value: (s) => s.kills },
      { header: "Total deaths", width: 12, numFmt: FMT_INT, value: (s) => s.deaths },
      { header: "Total assists", width: 12, numFmt: FMT_INT, value: (s) => s.assists },
      { header: "Avg damage", width: 12, numFmt: FMT_INT, value: (s) => s.avgDamage },
      { header: "Avg DPM", width: 10, numFmt: FMT_INT, value: (s) => s.avgDpm },
      { header: "Avg damage taken", width: 16, numFmt: FMT_INT, value: (s) => s.avgDamageTaken },
      { header: "Avg healing", width: 12, numFmt: FMT_INT, value: (s) => s.avgHealing },
      { header: "Avg shielding", width: 13, numFmt: FMT_INT, value: (s) => s.avgShielding },
      { header: "Avg gold", width: 11, numFmt: FMT_INT, value: (s) => s.avgGold },
      { header: "Avg GPM", width: 10, numFmt: FMT_INT, value: (s) => s.avgGpm },
      { header: "Avg kill participation", width: 18, numFmt: FMT_PCT, value: (s) => s.avgKillParticipation },
      { header: "Avg team damage share", width: 18, numFmt: FMT_PCT, value: (s) => s.avgTeamDamageShare },
      { header: "Doubles", width: 9, numFmt: FMT_INT, value: (s) => s.doubleKills },
      { header: "Triples", width: 9, numFmt: FMT_INT, value: (s) => s.tripleKills },
      { header: "Quadras", width: 9, numFmt: FMT_INT, value: (s) => s.quadraKills },
      { header: "Pentas", width: 9, numFmt: FMT_INT, value: (s) => s.pentaKills },
      { header: "First bloods", width: 12, numFmt: FMT_INT, value: (s) => s.firstBloods },
      { header: "Champions played", width: 16, numFmt: FMT_INT, value: (s) => s.championsPlayed },
      { header: "Most played", width: 16, value: (s) => `${s.favoriteChampion} (${s.favoriteChampionGames})` },
      { header: "Minutes played", width: 14, numFmt: FMT_INT, value: (s) => s.minutesPlayed },
      { header: "Longest win streak", width: 16, numFmt: FMT_INT, value: (s) => s.longestWinStreak },
  ];
}

function buildPlayerTotalsSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  addSheet(
    workbook,
    "Player Totals",
    playerTotalsColumns<PlayerSummary>(),
    buildPlayerSummaries(matches),
    { freezeColumns: 1 },
  );
}

/**
 * The same per-player totals recomputed inside each queue, so Mayhem form can be
 * read without standard ARAM games averaged into it.
 */
function buildPlayerTotalsByQueueSheet(
  workbook: ExcelJS.Workbook,
  matches: MatchRecord[],
): void {
  type Row = PlayerSummary & { queue: string; queueId: number };
  const rows: Row[] = [];

  for (const queue of buildQueueSummaries(matches)) {
    const scoped = matches.filter((match) => match.queueId === queue.queueId);
    for (const summary of buildPlayerSummaries(scoped)) {
      rows.push({ ...summary, queue: queue.label, queueId: queue.queueId });
    }
  }

  addSheet(
    workbook,
    "Player Totals by Queue",
    [
      { header: "Queue", width: 16, value: (r: Row) => r.queue },
      { header: "Queue ID", width: 10, numFmt: FMT_INT, value: (r: Row) => r.queueId },
      ...playerTotalsColumns<Row>(),
    ],
    rows,
    { freezeColumns: 3 },
  );
}

/** Group record per queue, mirroring the Overview section as a filterable sheet. */
function buildQueueSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  addSheet(
    workbook,
    "Queue Breakdown",
    [
      { header: "Queue", width: 22, value: (q) => q.label },
      { header: "Queue ID", width: 10, numFmt: FMT_INT, value: (q) => q.queueId },
      { header: "Games", width: 9, numFmt: FMT_INT, value: (q) => q.games },
      { header: "Wins", width: 9, numFmt: FMT_INT, value: (q) => q.wins },
      { header: "Losses", width: 9, numFmt: FMT_INT, value: (q) => q.losses },
      { header: "Win rate", width: 10, numFmt: FMT_PCT, value: (q) => q.winRate },
      { header: "Share of games", width: 14, numFmt: FMT_PCT, value: (q) => q.shareOfGames },
      { header: "Split lobbies", width: 13, numFmt: FMT_INT, value: (q) => q.splitGames },
      { header: "Avg game length", width: 15, value: (q) => durationLabel(q.avgDurationSeconds) },
      { header: "Minutes played", width: 14, numFmt: FMT_INT, value: (q) => q.totalMinutes },
      { header: "Unique champions", width: 16, numFmt: FMT_INT, value: (q) => q.uniqueChampions },
      { header: "Pentakills", width: 11, numFmt: FMT_INT, value: (q) => q.pentaKills },
      {
        header: "First game",
        width: 20,
        numFmt: FMT_DATE,
        value: (q) => (q.firstMatchAt ? toDate(q.firstMatchAt) : null),
      },
      {
        header: "Most recent game",
        width: 20,
        numFmt: FMT_DATE,
        value: (q) => (q.lastMatchAt ? toDate(q.lastMatchAt) : null),
      },
    ],
    buildQueueSummaries(matches),
    { freezeColumns: 1 },
  );
}

function buildChampionSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  addSheet(
    workbook,
    "Champion Pool",
    [
      { header: "Player", width: 16, value: (c) => c.alias },
      { header: "Champion", width: 16, value: (c) => c.champion },
      { header: "Games", width: 8, numFmt: FMT_INT, value: (c) => c.games },
      { header: "Wins", width: 8, numFmt: FMT_INT, value: (c) => c.wins },
      { header: "Win rate", width: 10, numFmt: FMT_PCT, value: (c) => c.winRate },
      { header: "KDA", width: 8, numFmt: FMT_DEC, value: (c) => c.kda },
      { header: "Avg kills", width: 10, numFmt: FMT_DEC, value: (c) => c.avgKills },
      { header: "Avg deaths", width: 11, numFmt: FMT_DEC, value: (c) => c.avgDeaths },
      { header: "Avg assists", width: 11, numFmt: FMT_DEC, value: (c) => c.avgAssists },
      { header: "Avg damage", width: 12, numFmt: FMT_INT, value: (c) => c.avgDamage },
      { header: "Avg DPM", width: 10, numFmt: FMT_INT, value: (c) => c.avgDpm },
    ],
    buildChampionSummaries(matches),
    { freezeColumns: 2 },
  );
}

function buildChampionClassSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  const rows = buildPlayerChampionClassSummaries(matches).map((player) => ({
    ...player,
    shareOf: (classKey: (typeof CHAMPION_CLASS_KEYS)[number]) =>
      player.classes.find((entry) => entry.classKey === classKey)?.share ?? 0,
    picksOf: (classKey: (typeof CHAMPION_CLASS_KEYS)[number]) =>
      player.classes.find((entry) => entry.classKey === classKey)?.picks ?? 0,
  }));

  addSheet(
    workbook,
    "Champion Classes",
    [
      { header: "Player", width: 16, value: (row) => row.alias },
      { header: "Games", width: 9, numFmt: FMT_INT, value: (row) => row.games },
      ...CHAMPION_CLASS_KEYS.flatMap((classKey) => {
        const label = CHAMPION_CLASSES[classKey].shortLabel;
        return [
          {
            header: `${label} share`,
            width: 14,
            numFmt: FMT_PCT,
            value: (row: (typeof rows)[number]) => row.shareOf(classKey),
          },
          {
            header: `${label} picks`,
            width: 12,
            numFmt: FMT_INT,
            value: (row: (typeof rows)[number]) => row.picksOf(classKey),
          },
        ];
      }),
    ],
    rows,
    { freezeColumns: 1 },
  );
}

function buildDuoSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  addSheet(
    workbook,
    "Duo Win Rates",
    [
      { header: "Player A", width: 18, value: (d) => d.playerA },
      { header: "Player B", width: 18, value: (d) => d.playerB },
      { header: "Games together", width: 15, numFmt: FMT_INT, value: (d) => d.games },
      { header: "Wins", width: 9, numFmt: FMT_INT, value: (d) => d.wins },
      { header: "Win rate", width: 10, numFmt: FMT_PCT, value: (d) => d.winRate },
    ],
    buildDuoSummaries(matches),
  );
}

function buildRecordsSheet(workbook: ExcelJS.Workbook, matches: MatchRecord[]): void {
  addSheet(
    workbook,
    "Hall of Fame",
    [
      { header: "Award", width: 30, value: (r) => r.award },
      { header: "Player", width: 16, value: (r) => r.player },
      { header: "Value", width: 20, value: (r) => r.value },
      { header: "Champion", width: 16, value: (r) => r.champion },
      { header: "Played at", width: 20, numFmt: FMT_DATE, value: (r) => toDate(r.playedAt) },
      { header: "Match ID", width: 20, value: (r) => r.matchId },
    ],
    buildRecords(matches),
  );
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

export async function buildWorkbook(): Promise<ExcelJS.Workbook> {
  const [matches, db] = await Promise.all([getMatches(), readDb()]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ARAM Group Tracker";
  workbook.created = new Date();

  buildOverviewSheet(workbook, matches, db.roster, db.settings.trackedQueueIds ?? []);
  buildQueueSheet(workbook, matches);
  buildMatchesSheet(workbook, matches);
  buildPerformanceSheet(workbook, "Friend Performances", matches, (p) => p.isTracked);
  buildPlayerTotalsSheet(workbook, matches);
  buildPlayerTotalsByQueueSheet(workbook, matches);
  buildChampionSheet(workbook, matches);
  buildChampionClassSheet(workbook, matches);
  buildDuoSheet(workbook, matches);
  buildRecordsSheet(workbook, matches);
  // Everyone in the lobby, so nothing the API returned is thrown away.
  buildPerformanceSheet(workbook, "All Participants", matches, () => true);

  return workbook;
}

export async function buildWorkbookBuffer(): Promise<Buffer> {
  const workbook = await buildWorkbook();
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}

export async function writeWorkbookToDisk(
  directory: string,
  filename: string,
): Promise<string> {
  const buffer = await buildWorkbookBuffer();
  await fs.mkdir(directory, { recursive: true });
  const target = path.join(directory, filename);
  await fs.writeFile(target, buffer);
  return target;
}

export function workbookFilename(prefix = "aram-stats"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.xlsx`;
}
