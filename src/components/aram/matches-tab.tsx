"use client";

import { useMemo, useState } from "react";
import { Swords } from "lucide-react";

import { ChampionBadge } from "@/components/aram/champion-badge";
import { EmptyState } from "@/components/aram/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatKda,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { MatchRecord, ParticipantRecord } from "@/lib/types";
import { queueLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Mayhem gets its own colour so the two modes are separable at a glance. */
export function QueueBadge({ queueId }: { queueId: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap font-medium",
        queueId === 2400
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {queueLabel(queueId)}
    </Badge>
  );
}

export function ResultPill({ win }: { win: boolean | null }) {
  if (win === null) {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground">
        Split
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        win
          ? "border-win/40 bg-win/10 text-win"
          : "border-loss/40 bg-loss/10 text-loss",
      )}
    >
      {win ? "Win" : "Loss"}
    </Badge>
  );
}

export function MatchesTab({
  matches,
  totalMatches,
  ddragonVersion,
  playerOptions,
}: {
  matches: MatchRecord[];
  totalMatches: number;
  ddragonVersion: string | null;
  playerOptions: string[];
}) {
  const [query, setQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");
  const [selected, setSelected] = useState<MatchRecord | null>(null);

  // Only offer queues that actually appear in the stored history.
  const queueOptions = useMemo(() => {
    const seen = new Map<number, number>();
    for (const match of matches) {
      seen.set(match.queueId, (seen.get(match.queueId) ?? 0) + 1);
    }
    return [...seen.entries()]
      .map(([queueId, games]) => ({ queueId, games, label: queueLabel(queueId) }))
      .sort((a, b) => b.games - a.games);
  }, [matches]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return matches.filter((match) => {
      const tracked = match.participants.filter((participant) => participant.isTracked);

      if (playerFilter !== "all") {
        if (!tracked.some((participant) => participant.alias === playerFilter)) return false;
      }
      if (queueFilter !== "all" && String(match.queueId) !== queueFilter) return false;
      if (resultFilter === "win" && match.groupWin !== true) return false;
      if (resultFilter === "loss" && match.groupWin !== false) return false;
      if (!needle) return true;

      return (
        match.matchId.toLowerCase().includes(needle) ||
        tracked.some(
          (participant) =>
            participant.championName.toLowerCase().includes(needle) ||
            (participant.alias ?? participant.riotId).toLowerCase().includes(needle),
        )
      );
    });
  }, [matches, playerFilter, query, queueFilter, resultFilter]);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="size-8" />}
        title="No games stored yet"
        description="Run a sync to pull every ARAM: Mayhem and ARAM game your group has played. Matches your friends played without each other are skipped automatically."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search champion, friend, or match ID"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-3">
          <Select
            value={queueFilter}
            onValueChange={(value) => setQueueFilter(value ?? "all")}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Any mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any mode</SelectItem>
              {queueOptions.map((option) => (
                <SelectItem key={option.queueId} value={String(option.queueId)}>
                  {option.label} ({option.games})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={playerFilter}
            onValueChange={(value) => setPlayerFilter(value ?? "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Any friend" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any friend</SelectItem>
              {playerOptions.map((alias) => (
                <SelectItem key={alias} value={alias}>
                  {alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={resultFilter}
            onValueChange={(value) => setResultFilter(value ?? "all")}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Any result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any result</SelectItem>
              <SelectItem value="win">Wins</SelectItem>
              <SelectItem value="loss">Losses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground text-xs sm:ml-auto">
          Showing {filtered.length} of {totalMatches} tracked games
        </p>
      </div>

      <div className="border-border/70 bg-card slim-scroll overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px]">Played</TableHead>
              <TableHead className="w-[130px]">Mode</TableHead>
              <TableHead className="w-[90px]">Result</TableHead>
              <TableHead className="w-[80px]">Length</TableHead>
              <TableHead>Your group</TableHead>
              <TableHead className="w-[110px] text-right">Group K/D/A</TableHead>
              <TableHead className="w-[110px] text-right">Group damage</TableHead>
              <TableHead className="w-[80px]">Patch</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((match) => {
              const tracked = match.participants.filter(
                (participant) => participant.isTracked,
              );
              const kills = tracked.reduce((total, p) => total + p.kills, 0);
              const deaths = tracked.reduce((total, p) => total + p.deaths, 0);
              const assists = tracked.reduce((total, p) => total + p.assists, 0);
              const damage = tracked.reduce(
                (total, p) => total + p.totalDamageDealtToChampions,
                0,
              );

              return (
                <TableRow key={match.matchId}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(match.gameStartTimestamp)}
                  </TableCell>
                  <TableCell>
                    <QueueBadge queueId={match.queueId} />
                  </TableCell>
                  <TableCell>
                    <ResultPill win={match.groupWin} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(match.gameDuration)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {tracked.map((participant) => (
                        <span
                          key={participant.puuid}
                          className="bg-muted/60 flex items-center gap-1.5 rounded-md py-0.5 pr-2 pl-0.5 text-xs"
                        >
                          <ChampionBadge
                            champion={participant.championName}
                            ddragonVersion={ddragonVersion}
                            size="sm"
                          />
                          <span className="font-medium">
                            {participant.alias ?? participant.riotId}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatKda(
                              participant.kills,
                              participant.deaths,
                              participant.assists,
                            )}
                          </span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKda(kills, deaths, assists)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(damage)}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {match.patch}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(match)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <MatchDialog
        match={selected}
        ddragonVersion={ddragonVersion}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function MatchDialog({
  match,
  ddragonVersion,
  onClose,
}: {
  match: MatchRecord | null;
  ddragonVersion: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={match !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        {match ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span>{match.matchId}</span>
                <ResultPill win={match.groupWin} />
                <QueueBadge queueId={match.queueId} />
                <Badge variant="secondary">queueId {match.queueId}</Badge>
              </DialogTitle>
              <DialogDescription>
                {formatDateTime(match.gameStartTimestamp)} ·{" "}
                {formatDuration(match.gameDuration)} · patch {match.patch} · gameMode{" "}
                {match.gameMode} · {match.trackedPuuids.length} friends in the lobby
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {[100, 200].map((teamId) => {
                const team = match.teams.find((entry) => entry.teamId === teamId);
                const rows = match.participants.filter(
                  (participant) => participant.teamId === teamId,
                );
                return (
                  <section key={teamId} className="space-y-2">
                    <header className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {teamId === 100 ? "Blue side" : "Red side"}
                      </h4>
                      <ResultPill win={team?.win ?? null} />
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {team?.kills ?? 0} kills · {team?.towers ?? 0} towers
                      </span>
                    </header>
                    <div className="slim-scroll overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Player</TableHead>
                            <TableHead className="text-right">K/D/A</TableHead>
                            <TableHead className="text-right">KDA</TableHead>
                            <TableHead className="text-right">KP</TableHead>
                            <TableHead className="text-right">Damage</TableHead>
                            <TableHead className="text-right">Taken</TableHead>
                            <TableHead className="text-right">Heal/Shield</TableHead>
                            <TableHead className="text-right">Gold</TableHead>
                            <TableHead>Build</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((participant) => (
                            <ParticipantRow
                              key={participant.puuid}
                              participant={participant}
                              ddragonVersion={ddragonVersion}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ParticipantRow({
  participant,
  ddragonVersion,
}: {
  participant: ParticipantRecord;
  ddragonVersion: string | null;
}) {
  return (
    <TableRow className={participant.isTracked ? "bg-primary/5" : undefined}>
      <TableCell>
        <div className="flex items-center gap-2">
          <ChampionBadge
            champion={participant.championName}
            ddragonVersion={ddragonVersion}
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              {participant.alias ?? participant.riotId}
              {participant.isTracked ? (
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary h-4 px-1 text-[10px]"
                >
                  friend
                </Badge>
              ) : null}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {participant.championName} · level {participant.champLevel}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatKda(participant.kills, participant.deaths, participant.assists)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatDecimal(participant.kda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatPercent(participant.killParticipation, 0)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(participant.totalDamageDealtToChampions)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(participant.totalDamageTaken)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(
          participant.totalHeal + participant.totalDamageShieldedOnTeammates,
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(participant.goldEarned)}
      </TableCell>
      <TableCell className="max-w-[260px]">
        <p className="text-muted-foreground truncate text-xs" title={participant.items.join(", ")}>
          {participant.items.join(", ") || "—"}
        </p>
        <p className="text-muted-foreground/80 truncate text-xs">
          {participant.perks.keystone || "—"} · {participant.summonerSpells.join(" + ")}
        </p>
      </TableCell>
    </TableRow>
  );
}
