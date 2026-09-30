import { EXPORT_DIR, WORKBOOK_FILENAME, isDemoMode } from "@/lib/config";
import { loadStaticData } from "@/lib/riot/ddragon";
import { getMatches, readDb } from "@/lib/store/db";
import {
  buildChampionSummaries,
  buildDuoSummaries,
  buildGroupOverview,
  buildPlayerSummaries,
  buildRecords,
  type ChampionSummary,
  type DuoSummary,
  type GroupOverview,
  type PlayerSummary,
  type RecordEntry,
} from "@/lib/stats/aggregate";
import type { MatchRecord, RosterMember, Settings, SyncState } from "@/lib/types";
import { ARAM_QUEUE_ID } from "@/lib/types";

/** Matches sent to the browser; aggregates still cover the full history. */
const MATCH_PAGE_SIZE = 120;

export interface DashboardState {
  demoMode: boolean;
  aramQueueId: number;
  workbookPath: string;
  /** Data Dragon patch used for champion portraits; null when the CDN is unreachable. */
  ddragonVersion: string | null;
  settings: Settings;
  roster: RosterMember[];
  syncState: SyncState;
  overview: GroupOverview;
  players: PlayerSummary[];
  champions: ChampionSummary[];
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

  return {
    demoMode: isDemoMode(),
    aramQueueId: ARAM_QUEUE_ID,
    workbookPath: `${EXPORT_DIR}/${WORKBOOK_FILENAME}`,
    ddragonVersion: staticData?.version ?? null,
    settings: db.settings,
    roster: db.roster,
    syncState: db.syncState,
    overview: buildGroupOverview(matches),
    players: buildPlayerSummaries(matches),
    champions: buildChampionSummaries(matches),
    duos: buildDuoSummaries(matches),
    records: buildRecords(matches),
    matches: matches.slice(0, MATCH_PAGE_SIZE),
    totalMatches: matches.length,
  };
}
