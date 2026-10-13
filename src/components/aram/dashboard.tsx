"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FlaskConical,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { MatchesTab } from "@/components/aram/matches-tab";
import { OverviewTab } from "@/components/aram/overview-tab";
import { PlayersTab } from "@/components/aram/players-tab";
import { RosterTab } from "@/components/aram/roster-tab";
import { SettingsTab } from "@/components/aram/settings-tab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DashboardState } from "@/lib/dashboard";
import { formatRelative } from "@/lib/format";
import type { SyncSummary } from "@/lib/types";
import { queueLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_REFRESH_MS = 20_000;

export function Dashboard({ initialState }: { initialState: DashboardState }) {
  const [state, setState] = useState(initialState);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("overview");
  const syncingRef = useRef(false);

  // Re-render the "last synced" label without refetching.
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Pick up matches found by the background watcher process.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (syncingRef.current) return;
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.ok) setState((await response.json()) as DashboardState);
      } catch {
        // A failed poll is not worth a toast; the next tick retries.
      }
    }, STATE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const runSync = useCallback(async (options: { simulateNewDemoMatch?: boolean } = {}) => {
    setSyncing(true);
    syncingRef.current = true;
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const payload = (await response.json()) as {
        summary?: SyncSummary;
        state?: DashboardState;
        error?: string;
      };

      if (!response.ok || !payload.summary) {
        toast.error(payload.error ?? "Sync failed.");
        return;
      }

      if (payload.state) setState(payload.state);
      const { summary } = payload;

      if (summary.groupMatchesAdded > 0) {
        const backfill =
          summary.pendingMatches > 0
            ? ` ${summary.pendingMatches} more to go — sync again to continue.`
            : "";
        const split = Object.entries(summary.addedByQueue ?? {})
          .map(([queueId, count]) => `${count} ${queueLabel(Number(queueId))}`)
          .join(", ");
        toast.success(
          `Added ${summary.groupMatchesAdded} ${
            summary.groupMatchesAdded === 1 ? "game" : "games"
          }${split ? ` (${split})` : ""}`,
          {
            description:
              (summary.workbookPath
                ? `Spreadsheet rewritten at ${summary.workbookPath}.`
                : "Download the workbook to get the updated sheets.") + backfill,
          },
        );
      } else if (summary.errors.length > 0) {
        toast.error(summary.errors[0]);
      } else {
        toast.info("No new games since the last sync.", {
          description: `Checked ${summary.candidateMatches} match ${
            summary.candidateMatches === 1 ? "ID" : "IDs"
          } from Riot.`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, []);

  async function downloadWorkbook() {
    setExporting(true);
    try {
      const response = await fetch("/api/export");
      if (!response.ok) {
        toast.error("Could not build the workbook.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        response.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "aram-stats.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Spreadsheet downloaded.");
    } finally {
      setExporting(false);
    }
  }

  const playerAliases = state.players.map((player) => player.alias);
  const lastSync = state.syncState.lastSyncAt;
  const lastError = state.syncState.lastError;

  return (
    <div className="hextech-backdrop min-h-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {state.settings.trackedQueueIds.map((queueId) => (
                <Badge
                  key={queueId}
                  variant="outline"
                  className="border-primary/40 text-primary bg-primary/10"
                >
                  {queueLabel(queueId)} · {queueId}
                </Badge>
              ))}
              {state.demoMode ? (
                <Badge variant="secondary" className="gap-1">
                  <FlaskConical className="size-3" />
                  demo data
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" />
                  live Riot API
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                {state.settings.region}
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              ARAM Group Tracker
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Pulls every ARAM: Mayhem and standard ARAM game your group plays together
              through Riot&apos;s Match-V5 API, keeps the full stat line for each player,
              and writes it all into a multi-sheet Excel workbook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              key={tick}
              className="text-muted-foreground mr-1 text-xs whitespace-nowrap"
            >
              Last synced {formatRelative(lastSync)}
            </span>
            {state.demoMode ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      onClick={() => runSync({ simulateNewDemoMatch: true })}
                      disabled={syncing}
                    >
                      <FlaskConical className="size-4" />
                      Simulate a game
                    </Button>
                  }
                />
                <TooltipContent>
                  Appends one freshly finished ARAM game, the same way the watcher picks
                  up a real one.
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Button variant="outline" onClick={downloadWorkbook} disabled={exporting}>
              <Download className="size-4" />
              {exporting ? "Building…" : "Download Excel"}
            </Button>
            <Button onClick={() => runSync()} disabled={syncing}>
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </header>

        {state.syncState.keyRejected ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertTitle>Your Riot API key has expired</AlertTitle>
            <AlertDescription>
              <p>
                Riot stopped accepting the key, which happens every 24 hours with a
                development key. Syncing is paused until you add a fresh one.
              </p>
              <Button size="sm" className="mt-2" onClick={() => setTab("settings")}>
                Enter a new key
              </Button>
            </AlertDescription>
          </Alert>
        ) : lastError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertTitle>Last sync reported a problem</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="gap-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="matches">
              Matches
              {state.totalMatches > 0 ? (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {state.totalMatches}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="roster">
              Roster
              {state.roster.length > 0 ? (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {state.roster.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab state={state} />
          </TabsContent>
          <TabsContent value="matches">
            <MatchesTab
              matches={state.matches}
              totalMatches={state.totalMatches}
              ddragonVersion={state.ddragonVersion}
              playerOptions={playerAliases}
            />
          </TabsContent>
          <TabsContent value="players">
            <PlayersTab
              players={state.players}
              playersByQueue={state.playersByQueue}
              champions={state.champions}
              ddragonVersion={state.ddragonVersion}
            />
          </TabsContent>
          <TabsContent value="roster">
            <RosterTab state={state} onStateChange={setState} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab state={state} onStateChange={setState} />
          </TabsContent>
        </Tabs>

        <footer className="text-muted-foreground/70 mt-10 text-xs">
          Match data from Riot Games&apos; Match-V5 API. This project is not endorsed by
          Riot Games.
        </footer>
      </div>
    </div>
  );
}
