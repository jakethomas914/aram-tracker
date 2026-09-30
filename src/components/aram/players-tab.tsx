"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { ChampionBadge } from "@/components/aram/champion-badge";
import { EmptyState } from "@/components/aram/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChampionSummary, PlayerSummary } from "@/lib/stats/aggregate";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = keyof Pick<
  PlayerSummary,
  | "games"
  | "winRate"
  | "kda"
  | "avgKills"
  | "avgDeaths"
  | "avgAssists"
  | "avgDamage"
  | "avgDpm"
  | "avgGold"
  | "avgKillParticipation"
  | "avgHealing"
  | "avgShielding"
  | "minutesPlayed"
>;

const COLUMNS: Array<{
  key: SortKey;
  label: string;
  format: (player: PlayerSummary) => string;
}> = [
  { key: "games", label: "Games", format: (p) => String(p.games) },
  { key: "winRate", label: "Win rate", format: (p) => formatPercent(p.winRate) },
  { key: "kda", label: "KDA", format: (p) => formatDecimal(p.kda) },
  { key: "avgKills", label: "Avg K", format: (p) => formatDecimal(p.avgKills) },
  { key: "avgDeaths", label: "Avg D", format: (p) => formatDecimal(p.avgDeaths) },
  { key: "avgAssists", label: "Avg A", format: (p) => formatDecimal(p.avgAssists) },
  {
    key: "avgKillParticipation",
    label: "KP",
    format: (p) => formatPercent(p.avgKillParticipation, 0),
  },
  { key: "avgDamage", label: "Avg dmg", format: (p) => formatNumber(p.avgDamage) },
  { key: "avgDpm", label: "DPM", format: (p) => formatNumber(p.avgDpm) },
  { key: "avgHealing", label: "Avg heal", format: (p) => formatNumber(p.avgHealing) },
  { key: "avgShielding", label: "Avg shield", format: (p) => formatNumber(p.avgShielding) },
  { key: "avgGold", label: "Avg gold", format: (p) => formatNumber(p.avgGold) },
  { key: "minutesPlayed", label: "Minutes", format: (p) => formatNumber(p.minutesPlayed) },
];

export function PlayersTab({
  players,
  playersByQueue,
  champions,
  ddragonVersion,
}: {
  players: PlayerSummary[];
  playersByQueue: Array<{ queueId: number; label: string; players: PlayerSummary[] }>;
  champions: ChampionSummary[];
  ddragonVersion: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [championPlayer, setChampionPlayer] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  if (players.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-8" />}
        title="No player stats yet"
        description="Player totals appear once at least one game with your group has been synced."
      />
    );
  }

  const scope =
    modeFilter === "all"
      ? players
      : (playersByQueue.find((entry) => String(entry.queueId) === modeFilter)?.players ??
        []);

  const sorted = [...scope].sort((a, b) => {
    // Deaths are the one stat where lower is better.
    const direction = sortKey === "avgDeaths" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * direction;
  });

  const championRows =
    championPlayer === "all"
      ? champions
      : champions.filter((row) => row.alias === championPlayer);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Player totals</CardTitle>
            <CardDescription>
              Click any column header to re-sort. Switch modes to read Mayhem form on
              its own — the same split the Player Totals by Queue sheet holds.
            </CardDescription>
          </div>
          <Select value={modeFilter} onValueChange={(value) => setModeFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              {playersByQueue.map((entry) => (
                <SelectItem key={entry.queueId} value={String(entry.queueId)}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="slim-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[180px]">Friend</TableHead>
                  {COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      onClick={() => setSortKey(column.key)}
                      className={cn(
                        "cursor-pointer text-right whitespace-nowrap select-none",
                        sortKey === column.key && "text-primary",
                      )}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[150px]">Most played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((player) => (
                  <TableRow key={player.puuid}>
                    <TableCell>
                      <p className="font-medium">{player.alias}</p>
                      <p className="text-muted-foreground text-xs">{player.riotId}</p>
                    </TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "text-right tabular-nums",
                          column.key === "winRate" &&
                            (player.winRate >= 0.5 ? "text-win" : "text-loss"),
                        )}
                      >
                        {column.format(player)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChampionBadge
                          champion={player.favoriteChampion}
                          ddragonVersion={ddragonVersion}
                          size="sm"
                        />
                        <span className="text-sm">
                          {player.favoriteChampion}
                          <span className="text-muted-foreground">
                            {" "}
                            ({player.favoriteChampionGames})
                          </span>
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Champion pool</CardTitle>
            <CardDescription>
              Every champion each friend has locked in, with win rate and averages.
            </CardDescription>
          </div>
          <Select
            value={championPlayer}
            onValueChange={(value) => setChampionPlayer(value ?? "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All friends" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All friends</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.puuid} value={player.alias}>
                  {player.alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="slim-scroll max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Champion</TableHead>
                  <TableHead>Friend</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                  <TableHead className="text-right">KDA</TableHead>
                  <TableHead className="text-right">Avg K/D/A</TableHead>
                  <TableHead className="text-right">Avg dmg</TableHead>
                  <TableHead className="text-right">DPM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {championRows.map((row) => (
                  <TableRow key={`${row.alias}-${row.champion}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChampionBadge
                          champion={row.champion}
                          ddragonVersion={ddragonVersion}
                          size="sm"
                        />
                        <span className="text-sm font-medium">{row.champion}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.alias}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.games}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        row.winRate >= 0.5 ? "text-win" : "text-loss",
                      )}
                    >
                      {formatPercent(row.winRate, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDecimal(row.kda)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatDecimal(row.avgKills)} / {formatDecimal(row.avgDeaths)} /{" "}
                      {formatDecimal(row.avgAssists)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.avgDamage)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.avgDpm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
