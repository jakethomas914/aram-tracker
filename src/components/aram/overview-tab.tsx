"use client";

import { Percent, Swords, Target } from "lucide-react";

import { EmptyState } from "@/components/aram/empty-state";
import { StatCard } from "@/components/aram/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardState } from "@/lib/dashboard";
import { formatNumber, formatPercent } from "@/lib/format";
import { CHAMPION_CLASSES } from "@/lib/riot/champion-data";
import { cn } from "@/lib/utils";

export function OverviewTab({ state }: { state: DashboardState }) {
  const { overview, players, championClasses } = state;

  if (overview.matches === 0) {
    return (
      <EmptyState
        icon={<Swords className="size-8" />}
        title="Nothing tracked yet"
        description="Add your friends to the roster, then hit Sync now. Average damage, win rate, and champion-class mix for the tracked group show up here."
      />
    );
  }

  const ranked = [...players].sort(
    (a, b) => b.avgDamage - a.avgDamage || b.winRate - a.winRate || a.alias.localeCompare(b.alias),
  );
  const topDamage = ranked[0]?.avgDamage ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Games tracked"
          value={overview.matches}
          hint={`${overview.wins}W – ${overview.losses}L as a group`}
          icon={<Swords className="size-4" />}
        />
        <StatCard
          label="Group win rate"
          value={formatPercent(overview.winRate)}
          hint="When the tracked friends share a side"
          tone={overview.winRate >= 0.5 ? "win" : "loss"}
          icon={<Percent className="size-4" />}
        />
        <StatCard
          label="Top average damage"
          value={topDamage > 0 ? formatNumber(topDamage) : "—"}
          hint={ranked[0] ? ranked[0].alias : undefined}
          tone="primary"
          icon={<Target className="size-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Damage leaderboard</CardTitle>
          <CardDescription>
            Ranked by average damage to champions in games this person played with the
            tracked group. Win rate is their record in those same games.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {ranked.map((player, index) => (
            <div key={player.puuid} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-muted-foreground w-5 shrink-0 text-sm tabular-nums">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium">{player.alias}</span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {player.games} game{player.games === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-3 text-sm tabular-nums">
                  <span
                    className={cn(
                      "font-medium",
                      player.winRate >= 0.5 ? "text-win" : "text-loss",
                    )}
                  >
                    {formatPercent(player.winRate)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {player.wins}W–{player.losses}L
                  </span>
                  <span className="font-semibold">{formatNumber(player.avgDamage)}</span>
                </div>
              </div>
              <div className="pl-7">
                <Progress
                  value={topDamage > 0 ? (player.avgDamage / topDamage) * 100 : 0}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Champion classes</CardTitle>
          <CardDescription>
            Share of every champion the tracked group locked in. Each pick counts once,
            under that champion&apos;s primary role.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {championClasses.map((entry) => {
            const meta = CHAMPION_CLASSES[entry.classKey];
            return (
              <div key={entry.classKey} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{meta.shortLabel}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="text-foreground font-medium">
                      {formatPercent(entry.share, 0)}
                    </span>
                    {" · "}
                    {entry.picks} pick{entry.picks === 1 ? "" : "s"}
                    {entry.picks > 0 ? ` · ${formatPercent(entry.winRate)} WR` : ""}
                  </span>
                </div>
                <Progress value={entry.share * 100} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
