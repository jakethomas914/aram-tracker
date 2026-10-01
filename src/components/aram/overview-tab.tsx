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
import type { PlayerClassShare } from "@/lib/stats/aggregate";
import { cn } from "@/lib/utils";

export function OverviewTab({ state }: { state: DashboardState }) {
  const { overview, players, playerChampionClasses } = state;

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
  const classesByPlayer = new Map(
    playerChampionClasses.map((entry) => [entry.puuid, entry]),
  );

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
            Each player&apos;s own mix. A percentage is that person&apos;s share of their
            tracked games on that class, counted once under the champion&apos;s primary
            role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {ranked.map((player) => {
            const mix = classesByPlayer.get(player.puuid);
            if (!mix) return null;
            return (
              <div key={player.puuid} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{player.alias}</span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {mix.games} game{mix.games === 1 ? "" : "s"}
                  </span>
                </div>
                <ClassMix classes={mix.classes} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ClassMix({ classes }: { classes: PlayerClassShare[] }) {
  const played = classes.filter((entry) => entry.share > 0);
  const games = classes.reduce((total, entry) => total + entry.picks, 0);
  const summary = classes
    .map((entry) => `${entry.shortLabel} ${formatPercent(entry.share, 0)}`)
    .join(", ");

  return (
    <div className="space-y-2">
      <div
        className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={summary}
      >
        {played.map((entry) => (
          <div
            key={entry.classKey}
            className="h-full"
            style={{
              width: `${entry.share * 100}%`,
              backgroundColor: CHAMPION_CLASSES[entry.classKey].color,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {classes.map((entry) => (
          <span
            key={entry.classKey}
            className={cn(
              "text-xs tabular-nums",
              entry.picks === 0 && "text-muted-foreground/70",
            )}
            title={`${entry.label}: ${entry.picks} of ${games} games`}
          >
            <span
              className="mr-1 inline-block size-2 rounded-full align-middle"
              style={{ backgroundColor: CHAMPION_CLASSES[entry.classKey].color }}
            />
            <span className={entry.picks > 0 ? "font-medium" : undefined}>
              {entry.shortLabel}
            </span>{" "}
            {formatPercent(entry.share, 0)}
          </span>
        ))}
      </div>
    </div>
  );
}
