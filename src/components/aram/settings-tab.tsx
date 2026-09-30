"use client";

import { useState } from "react";
import { KeyRound, RotateCcw, Save, TerminalSquare } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { DashboardState } from "@/lib/dashboard";
import type { RegionalRoute, Settings } from "@/lib/types";

const REGIONS: Array<{ value: RegionalRoute; label: string }> = [
  { value: "americas", label: "Americas (NA, BR, LAN, LAS)" },
  { value: "europe", label: "Europe (EUW, EUNE, TR, RU, ME)" },
  { value: "asia", label: "Asia (KR, JP)" },
  { value: "sea", label: "SEA (OCE, TW, VN, SG, PH, TH)" },
];

export function SettingsTab({
  state,
  onStateChange,
}: {
  state: DashboardState;
  onStateChange: (next: DashboardState) => void;
}) {
  const [draft, setDraft] = useState<Settings>(state.settings);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as {
        state?: DashboardState;
        error?: string;
      };
      if (!response.ok || !payload.state) {
        toast.error(payload.error ?? "Could not save settings.");
        return;
      }
      onStateChange(payload.state);
      toast.success("Settings saved.");
    } finally {
      setSaving(false);
    }
  }

  async function resetMatches() {
    setResetting(true);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      const payload = (await response.json()) as { state?: DashboardState };
      if (payload.state) onStateChange(payload.state);
      toast.success("Stored matches cleared. The next sync rebuilds history.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sync behaviour</CardTitle>
          <CardDescription>
            Controls what the Match-V5 calls ask for and which games are kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="region">Regional routing</Label>
            <Select
              value={draft.region}
              onValueChange={(value) => update("region", value as RegionalRoute)}
            >
              <SelectTrigger id="region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Account-V1 and Match-V5 are served per cluster, not per platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-group">Friends required per match</Label>
              <Input
                id="min-group"
                type="number"
                min={1}
                max={5}
                value={draft.minGroupSize}
                onChange={(event) =>
                  update("minGroupSize", Number(event.target.value) || 1)
                }
              />
              <p className="text-muted-foreground text-xs">
                Solo ARAMs are ignored below this threshold.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lookback">Look back (days)</Label>
              <Input
                id="lookback"
                type="number"
                min={1}
                max={3650}
                value={draft.lookbackDays}
                onChange={(event) =>
                  update("lookbackDays", Number(event.target.value) || 1)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="per-player">Match IDs per friend</Label>
              <Input
                id="per-player"
                type="number"
                min={1}
                max={100}
                value={draft.matchesPerPlayer}
                onChange={(event) =>
                  update("matchesPerPlayer", Number(event.target.value) || 1)
                }
              />
              <p className="text-muted-foreground text-xs">Riot caps this at 100.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Watcher interval (seconds)</Label>
              <Input
                id="interval"
                type="number"
                min={30}
                max={86400}
                value={draft.watchIntervalSeconds}
                onChange={(event) =>
                  update("watchIntervalSeconds", Number(event.target.value) || 30)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="timelines">Fetch ability order</Label>
              <p className="text-muted-foreground text-xs">
                Adds one timeline request per match to capture skill-up order.
              </p>
            </div>
            <Switch
              id="timelines"
              checked={draft.fetchTimelines}
              onCheckedChange={(checked) => update("fetchTimelines", checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto-write">Write the workbook automatically</Label>
              <p className="text-muted-foreground text-xs">
                Refreshes the .xlsx on disk whenever new games are found.
              </p>
            </div>
            <Switch
              id="auto-write"
              checked={draft.autoWriteWorkbook}
              onCheckedChange={(checked) => update("autoWriteWorkbook", checked)}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={() => setDraft(state.settings)}>
            Revert
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        {state.demoMode ? (
          <Alert>
            <KeyRound className="size-4" />
            <AlertTitle>Running on demo data</AlertTitle>
            <AlertDescription>
              <p>
                No <code>RIOT_API_KEY</code> is set, so matches are generated locally in
                the exact Match-V5 shape. To track your real games, put a key in{" "}
                <code>.env.local</code> and restart:
              </p>
              <pre className="bg-muted text-muted-foreground mt-1 w-full overflow-x-auto rounded-md p-3 text-xs">
                RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              </pre>
              <p>
                Grab one from the Riot Developer Portal. Development keys expire every
                24 hours.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <KeyRound className="size-4" />
            <AlertTitle>Live Riot API mode</AlertTitle>
            <AlertDescription>
              Requests are rate limited to 20/second and 100/2 minutes, matching a
              development key. Match history is filtered with{" "}
              <code>queue={state.aramQueueId}</code> and every match is re-checked
              against <code>info.queueId</code> before it is stored.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="size-4" />
              Automatic polling
            </CardTitle>
            <CardDescription>
              The watcher checks for new ARAM games on an interval and rewrites the
              spreadsheet whenever one shows up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
              npm run watch
            </pre>
            <p className="text-muted-foreground text-xs">
              Current interval: every {draft.watchIntervalSeconds} seconds. The
              workbook is written to:
            </p>
            <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
              {state.workbookPath}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Clears every stored match. Your roster and settings are kept, and the
              next sync pulls history again from Riot.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={resetMatches} disabled={resetting}>
              <RotateCcw className="size-4" />
              {resetting ? "Clearing…" : "Clear stored matches"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
