import path from "node:path";

import type { RegionalRoute, Settings } from "./types";

const REGIONAL_ROUTES: RegionalRoute[] = ["americas", "europe", "asia", "sea"];

/**
 * Platform routing values (na1, euw1, ...) map onto the four regional clusters
 * that account-v1 and match-v5 are served from. Users usually know their
 * platform, so we accept either spelling for RIOT_REGION.
 */
const PLATFORM_TO_REGIONAL: Record<string, RegionalRoute> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  me1: "europe",
  kr: "asia",
  jp1: "asia",
  tw2: "sea",
  sg2: "sea",
  vn2: "sea",
  ph2: "sea",
  th2: "sea",
  oc1: "sea",
};

export function parseRegion(value: string | undefined): RegionalRoute {
  const normalized = (value ?? "").trim().toLowerCase();
  if ((REGIONAL_ROUTES as string[]).includes(normalized)) {
    return normalized as RegionalRoute;
  }
  return PLATFORM_TO_REGIONAL[normalized] ?? "americas";
}

export const REGIONAL_ROUTE_OPTIONS = REGIONAL_ROUTES;

function intFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * These are deliberately overridable to any absolute path, which Turbopack would
 * otherwise treat as unbounded filesystem access and trace the entire project
 * into the server bundle. The tracing opt-out is safe here: nothing is imported
 * from these directories, they only hold the match database and the workbook.
 */
export const DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
);
export const EXPORT_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.EXPORT_DIR ?? path.join(process.cwd(), "exports"),
);
export const DB_PATH = path.join(DATA_DIR, "db.json");
export const WORKBOOK_FILENAME = "aram-stats.xlsx";

export function getApiKey(): string | null {
  const key = process.env.RIOT_API_KEY?.trim();
  return key ? key : null;
}

/** True when we have no API key and fall back to generated demo matches. */
export function isDemoMode(): boolean {
  if (boolFromEnv("ARAM_DEMO_MODE", false)) return true;
  return getApiKey() === null;
}

export function defaultSettings(): Settings {
  return {
    region: parseRegion(process.env.RIOT_REGION),
    minGroupSize: Math.max(1, intFromEnv("ARAM_MIN_GROUP_SIZE", 2)),
    lookbackDays: Math.max(1, intFromEnv("ARAM_LOOKBACK_DAYS", 90)),
    matchesPerPlayer: Math.min(100, Math.max(1, intFromEnv("ARAM_MATCHES_PER_PLAYER", 40))),
    maxMatchesPerSync: Math.max(1, intFromEnv("ARAM_MAX_MATCHES_PER_SYNC", 30)),
    fetchTimelines: boolFromEnv("ARAM_FETCH_TIMELINES", true),
    watchIntervalSeconds: Math.max(30, intFromEnv("ARAM_WATCH_INTERVAL_SECONDS", 300)),
    autoWriteWorkbook: boolFromEnv("ARAM_AUTO_WRITE_WORKBOOK", true),
  };
}

/**
 * Riot IDs to seed the roster with on first run, e.g.
 * ARAM_ROSTER="Faker#KR1,Doublelift#NA1".
 */
export function seedRosterFromEnv(): string[] {
  return (process.env.ARAM_ROSTER ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
