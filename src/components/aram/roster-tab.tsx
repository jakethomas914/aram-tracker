"use client";

import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardState } from "@/lib/dashboard";
import { formatDecimal, formatPercent } from "@/lib/format";

export function RosterTab({
  state,
  onStateChange,
}: {
  state: DashboardState;
  onStateChange: (next: DashboardState) => void;
}) {
  const [riotId, setRiotId] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);

  const summaries = new Map(state.players.map((player) => [player.puuid, player]));

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!riotId.trim()) return;

    setBusy(true);
    try {
      const response = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId, alias: alias || undefined }),
      });
      const payload = (await response.json()) as {
        state?: DashboardState;
        error?: string;
      };
      if (!response.ok || !payload.state) {
        toast.error(payload.error ?? "Could not add that Riot ID.");
        return;
      }
      onStateChange(payload.state);
      setRiotId("");
      setAlias("");
      toast.success("Added to the tracked group.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(puuid: string, label: string) {
    const response = await fetch(`/api/roster?puuid=${encodeURIComponent(puuid)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { state?: DashboardState; error?: string };
    if (!response.ok || !payload.state) {
      toast.error(payload.error ?? "Could not remove that player.");
      return;
    }
    onStateChange(payload.state);
    toast.success(`Removed ${label}.`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Tracked group</CardTitle>
          <CardDescription>
            A match is stored when at least {state.settings.minGroupSize} of these
            players are in the same ARAM lobby. Change that threshold in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.roster.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No friends added yet. Add the Riot IDs of everyone you play ARAM with.
            </p>
          ) : (
            state.roster.map((member) => {
              const summary = summaries.get(member.puuid);
              return (
                <div
                  key={member.puuid}
                  className="border-border/60 bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {member.alias}
                      {!member.resolved ? (
                        <Badge variant="destructive" className="text-[10px]">
                          unresolved
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.gameName}#{member.tagLine}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {summary
                      ? `${summary.games} games · ${formatPercent(summary.winRate, 0)} · ${formatDecimal(summary.kda)} KDA`
                      : "no games yet"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${member.alias}`}
                    onClick={() => removeMember(member.puuid, member.alias)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a friend</CardTitle>
          <CardDescription>
            {state.demoMode
              ? "Demo mode accepts any Riot ID and invents a stable puuid for it."
              : "Riot IDs are resolved to a puuid through Account-V1 before they are saved."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riot-id">Riot ID</Label>
              <Input
                id="riot-id"
                value={riotId}
                onChange={(event) => setRiotId(event.target.value)}
                placeholder="PoroSnaxx#NA1"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias">
                Display name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Poro"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={busy || !riotId.trim()} className="w-full">
              <UserPlus className="size-4" />
              {busy ? "Adding…" : "Add to group"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
