"use client";

import {
  CalendarClock,
  Flame,
  Medal,
  Percent,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { ChampionBadge } from "@/components/aram/champion-badge";
import { EmptyState } from "@/components/aram/empty-state";
import { ResultPill } from "@/components/aram/matches-tab";
import { StatCard } from "@/components/aram/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardState } from "@/lib/dashboard";
import {
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatHours,
  formatKda,
  formatPercent,
} from "@/lib/format";

export function OverviewTab({ state }: { state: DashboardState }) {
  const { overview, players, duos, records, matches } = state;

  if (overview.matches === 0) {
    return (
      <EmptyState
        icon={<Swords className="size-8" />}
        title="Nothing tracked yet"
        description="Add your friends to the roster, then hit Sync now. Every ARAM game (queueId 450) with enough of the group in the lobby lands here and in the spreadsheet."
      />
    );
  }

  const streakLabel = overview.currentStreak.type
    ? `${overview.currentStreak.length} ${
        overview.currentStreak.type === "W" ? "win" : "loss"
      }${overview.currentStreak.length === 1 ? "" : "es"}`
    : "—";

  const topPlayers = [...players].sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  const recent = matches.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Games tracked"
          value={overview.matches}
          hint={`${overview.uniqueChampions} champions played`}
          icon={<Swords className="size-4" />}
        />
        <StatCard
          label="Group record"
          value={`${overview.wins}W – ${overview.losses}L`}
          hint={
            overview.splitGames > 0
              ? `${overview.splitGames} game${overview.splitGames === 1 ? "" : "s"} split across teams`
              : "Always queued on the same side"
          }
          icon={<Trophy className="size-4" />}
        />
        <StatCard
          label="Win rate"
          value={formatPercent(overview.winRate)}
          hint={`Best streak: ${overview.longestWinStreak}W · worst: ${overview.longestLossStreak}L`}
          tone={overview.winRate >= 0.5 ? "win" : "loss"}
          icon={<Percent className="size-4" />}
        />
        <StatCard
          label="Current streak"
          value={streakLabel}
          hint={
            overview.lastMatchAt
              ? `Last game ${formatDateTime(overview.lastMatchAt)}`
              : undefined
          }
          tone={overview.currentStreak.type === "W" ? "win" : "loss"}
          icon={<Flame className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Friend leaderboard</CardTitle>
            <CardDescription>
              Ranked by win rate across every tracked ARAM game.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPlayers.map((player) => (
              <div key={player.puuid} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{player.alias}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {player.wins}W–{player.losses}L ·{" "}
                    <span className="text-foreground font-medium">
                      {formatPercent(player.winRate)}
                    </span>{" "}
                    · {formatDecimal(player.kda)} KDA
                  </span>
                </div>
                <Progress value={player.winRate * 100} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time spent</CardTitle>
            <CardDescription>Across the whole tracked history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Row
              icon={<CalendarClock className="size-4" />}
              label="Total playtime"
              value={formatHours(overview.totalMinutes)}
            />
            <Row
              icon={<Swords className="size-4" />}
              label="Average game"
              value={formatDuration(overview.avgDurationSeconds)}
            />
            <Row
              icon={<Users className="size-4" />}
              label="Friends tracked"
              value={String(state.roster.length)}
            />
            <Row
              icon={<Medal className="size-4" />}
              label="Pentakills"
              value={String(overview.pentaKills)}
            />
            <Row
              icon={<Flame className="size-4" />}
              label="Kills / deaths"
              value={`${overview.totalKills} / ${overview.totalDeaths}`}
            />
            <div className="border-border/60 border-t pt-3">
              <p className="text-muted-foreground text-xs">
                Patches covered: {overview.patches.join(", ") || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Last games</CardTitle>
            <CardDescription>Newest ARAM results for the group.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((match) => {
              const tracked = match.participants.filter(
                (participant) => participant.isTracked,
              );
              return (
                <div
                  key={match.matchId}
                  className="border-border/60 bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <ResultPill win={match.groupWin} />
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {tracked.map((participant) => (
                      <ChampionBadge
                        key={participant.puuid}
                        champion={participant.championName}
                        ddragonVersion={state.ddragonVersion}
                        size="sm"
                      />
                    ))}
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatKda(
                      tracked.reduce((total, p) => total + p.kills, 0),
                      tracked.reduce((total, p) => total + p.deaths, 0),
                      tracked.reduce((total, p) => total + p.assists, 0),
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDuration(match.gameDuration)}
                  </span>
                  <span className="text-muted-foreground/80 w-full text-xs sm:w-auto">
                    {formatDateTime(match.gameStartTimestamp)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hall of fame</CardTitle>
            <CardDescription>
              Single-game records, also exported to its own sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="slim-scroll max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Award</TableHead>
                    <TableHead>Holder</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.award}>
                      <TableCell className="text-sm">{record.award}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{record.player}</span>
                        <span className="text-muted-foreground block text-xs">
                          {record.champion}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {record.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {duos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Duo win rates</CardTitle>
            <CardDescription>
              How each pair of friends performs when they queue together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {duos.map((duo) => (
                <Badge
                  key={`${duo.playerA}-${duo.playerB}`}
                  variant="outline"
                  className="h-auto gap-1.5 py-1.5 text-xs"
                >
                  <span className="font-medium">
                    {duo.playerA} + {duo.playerB}
                  </span>
                  <span
                    className={duo.winRate >= 0.5 ? "text-win" : "text-loss"}
                  >
                    {formatPercent(duo.winRate, 0)}
                  </span>
                  <span className="text-muted-foreground">({duo.games}g)</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
