import {
  type ApiKeySource,
  EXPORT_DIR,
  WORKBOOK_FILENAME,
  getApiKey,
  getApiKeySource,
  isDemoMode,
} from "@/lib/config";
import { previewKey } from "@/lib/store/api-key";
import { loadStaticData } from "@/lib/riot/ddragon";
import { getMatches, readDb } from "@/lib/store/db";
import {
  buildChampionSummaries,
  buildPlayerChampionClassSummaries,
  buildDuoSummaries,
  buildGroupOverview,
  buildPlayerSummaries,
  buildQueueSummaries,
  buildRecords,
  type ChampionSummary,
  type PlayerChampionClassSummary,
  type DuoSummary,
  type GroupOverview,
  type PlayerSummary,
  type QueueSummary,
  type RecordEntry,
} from "@/lib/stats/aggregate";
import type { MatchRecord, RosterMember, Settings, SyncState } from "@/lib/types";
import { ARAM_QUEUES } from "@/lib/types";

/** Matches sent to the browser; aggregates still cover the full history. */
const MATCH_PAGE_SIZE = 120;

export interface DashboardState {
  demoMode: boolean;
  /** Which key is active, masked. The key itself never leaves the server. */
  apiKey: { source: ApiKeySource | null; preview: string | null };
  /** Every queue the tracker knows how to follow, for the settings picker. */
  availableQueues: typeof ARAM_QUEUES;
  workbookPath: string;
  /** Data Dragon patch used for champion portraits; null when the CDN is unreachable. */
  ddragonVersion: string | null;
  settings: Settings;
  roster: RosterMember[];
  syncState: SyncState;
  overview: GroupOverview;
  queues: QueueSummary[];
  players: PlayerSummary[];
  /** The same player totals recomputed inside each queue, for the mode filter. */
  playersByQueue: Array<{ queueId: number; label: string; players: PlayerSummary[] }>;
  champions: ChampionSummary[];
  playerChampionClasses: PlayerChampionClassSummary[];
  duos: DuoSummary[];
  records: RecordEntry[];
  matches: MatchRecord[];
  totalMatches: number;
}

export async function getDashboardState(): Promise<DashboardState> {
  const [db, matches, staticData] = await Promise.all([
    readDb(),
    getMatches(),
    loadStaticData(),
  ]);

  const queues = buildQueueSummaries(matches);

  return {
    demoMode: isDemoMode(),
    apiKey: {
      source: getApiKeySource(),
      preview: getApiKey() ? previewKey(getApiKey() as string) : null,
    },
    availableQueues: ARAM_QUEUES,
    workbookPath: `${EXPORT_DIR}/${WORKBOOK_FILENAME}`,
    ddragonVersion: staticData?.version ?? null,
    settings: db.settings,
    roster: db.roster,
    syncState: db.syncState,
    overview: buildGroupOverview(matches),
    queues,
    players: buildPlayerSummaries(matches),
    playersByQueue: queues.map((queue) => ({
      queueId: queue.queueId,
      label: queue.label,
      players: buildPlayerSummaries(
        matches.filter((match) => match.queueId === queue.queueId),
      ),
    })),
    champions: buildChampionSummaries(matches),
    playerChampionClasses: buildPlayerChampionClassSummaries(matches),
    duos: buildDuoSummaries(matches),
    records: buildRecords(matches),
    matches: matches.slice(0, MATCH_PAGE_SIZE),
    totalMatches: matches.length,
  };
}
