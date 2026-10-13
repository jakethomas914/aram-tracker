"use client";

import { useState } from "react";
import { KeyRound, RotateCcw, Save, TerminalSquare } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

/**
 * Long, unbreakable strings like API keys and absolute paths sit inside grid and
 * flex children, whose default `min-width: auto` lets them push the whole card
 * wider than a phone viewport. Wrapping plus `min-w-0` keeps them contained.
 */
const CODE_BLOCK =
  "bg-muted text-muted-foreground mt-1 w-full min-w-0 rounded-md p-3 text-xs break-all whitespace-pre-wrap";

const REGIONS: Array<{ value: RegionalRoute; label: string }> = [
  { value: "americas", label: "Americas (NA, BR, LAN, LAS)" },
  { value: "europe", label: "Europe (EUW, EUNE, TR, RU, ME)" },
  { value: "asia", label: "Asia (KR, JP)" },
  { value: "sea", label: "SEA (OCE, TW, VN, SG, PH, TH)" },
];

const RIOT_PORTAL_URL = "https://developer.riotgames.com";

function ApiKeyCard({
  state,
  onStateChange,
}: {
  state: DashboardState;
  onStateChange: (next: DashboardState) => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const { source, preview } = state.apiKey;
  const rejected = state.syncState.keyRejected;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const payload = (await response.json()) as { state?: DashboardState; error?: string };
      if (!response.ok || !payload.state) {
        toast.error(payload.error ?? "Could not save the key.");
        return;
      }
      setKey("");
      onStateChange(payload.state);
      toast.success("Key accepted by Riot.", {
        description: "Add your friends on the Roster tab, then hit Sync now.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/key", { method: "DELETE" });
      const payload = (await response.json()) as { state?: DashboardState };
      if (payload.state) onStateChange(payload.state);
      toast.success("Saved key removed.");
    } finally {
      setBusy(false);
    }
  }

  const statusTitle = rejected
    ? "Riot rejected this key"
    : state.demoMode
      ? "Running on demo data"
      : "Riot API key is active";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-4" />
          Riot API key
          <Badge variant={rejected ? "destructive" : "secondary"}>{statusTitle}</Badge>
        </CardTitle>
        <CardDescription>
          {state.demoMode
            ? "No key yet, so matches are generated locally in the real Match-V5 shape. Paste a key to track your actual games."
            : source === "env"
              ? `Using ${preview} from the RIOT_API_KEY environment variable. Pasting a key here overrides it.`
              : `Using ${preview}, saved on this computer.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-2">
          <Label htmlFor="riot-key">Paste a Riot API key</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="riot-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="min-w-0 font-mono text-xs"
            />
            <Button type="submit" disabled={busy || key.trim() === ""}>
              {busy ? "Checking…" : "Save and test"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            The key is checked with Riot first and only saved if it works. No restart
            needed.
          </p>
        </form>

        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            Get one at{" "}
            <a
              href={RIOT_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              developer.riotgames.com
            </a>{" "}
            after signing in with a Riot account.
          </p>
          <p>
            The default development key stops working every 24 hours and Riot offers no
            way to renew it automatically. To avoid pasting a new one daily, register
            this as a <strong>Personal</strong> project on the same site: personal keys
            are meant for a small private group and do not expire daily.
          </p>
        </div>

        {source === "app" ? (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Remove saved key
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

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

  /** Kept in `availableQueues` order so Mayhem stays first in the header badges. */
  function toggleQueue(queueId: number, enabled: boolean) {
    const next = enabled
      ? state.availableQueues
          .filter(
            (queue) => queue.id === queueId || draft.trackedQueueIds.includes(queue.id),
          )
          .map((queue) => queue.id)
      : draft.trackedQueueIds.filter((id) => id !== queueId);

    if (next.length === 0) {
      toast.error("Track at least one queue.");
      return;
    }
    update("trackedQueueIds", next);
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tracked queues</Label>
              <p className="text-muted-foreground text-xs">
                Every game is identified by <code>info.queueId</code>. Turning a queue
                off hides its games from the dashboard and the spreadsheet without
                deleting them, and turning it back on restores them.
              </p>
            </div>
            <div className="space-y-2">
              {state.availableQueues.map((queue) => (
                <div
                  key={queue.id}
                  className="border-border/60 bg-muted/20 flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor={`queue-${queue.id}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {queue.label}
                      <Badge variant="secondary">{queue.id}</Badge>
                    </Label>
                    <p className="text-muted-foreground text-xs">{queue.description}</p>
                  </div>
                  <Switch
                    id={`queue-${queue.id}`}
                    checked={draft.trackedQueueIds.includes(queue.id)}
                    onCheckedChange={(checked) => toggleQueue(queue.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

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
                Solo games are ignored below this threshold.
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
              <Label htmlFor="max-per-sync">Matches fetched per sync</Label>
              <Input
                id="max-per-sync"
                type="number"
                min={1}
                max={500}
                value={draft.maxMatchesPerSync}
                onChange={(event) =>
                  update("maxMatchesPerSync", Number(event.target.value) || 1)
                }
              />
              <p className="text-muted-foreground text-xs">
                Keeps a big first backfill from running long; leftovers are picked up
                on the next pass.
              </p>
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
        <ApiKeyCard state={state} onStateChange={onStateChange} />

        {!state.demoMode ? (
          <Alert>
            <KeyRound className="size-4" />
            <AlertTitle>Live Riot API mode</AlertTitle>
            <AlertDescription>
              Requests are rate limited to 20/second and 100/2 minutes, matching a
              development key. Match history is pulled once per tracked queue (
              {draft.trackedQueueIds.map((id) => `queue=${id}`).join(", ")}) and every
              match is re-checked against <code>info.queueId</code> before it is stored.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="size-4" />
              Automatic polling
            </CardTitle>
            <CardDescription>
              The watcher checks every tracked queue on an interval and rewrites the
              spreadsheet whenever a new game shows up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className={CODE_BLOCK}>npm run watch</pre>
            <p className="text-muted-foreground text-xs">
              Current interval: every {draft.watchIntervalSeconds} seconds. The
              workbook is written to:
            </p>
            <pre className={CODE_BLOCK}>{state.workbookPath}</pre>
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
