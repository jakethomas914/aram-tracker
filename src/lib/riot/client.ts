import { getApiKey } from "@/lib/config";
import type {
  RawAccount,
  RawMatch,
  RawTimeline,
  RegionalRoute,
} from "@/lib/types";

import { RateLimiter } from "./limiter";

export class RiotApiError extends Error {
  constructor(
    readonly status: number,
    readonly endpoint: string,
    message: string,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("No Riot API key is set. Paste one in Settings to pull live matches.");
    this.name = "MissingApiKeyError";
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One limiter per process so the API route and watcher share a budget. */
const sharedLimiter = new RateLimiter();

export interface MatchIdQuery {
  /** Unix seconds. Riot rejects startTime values before the 2021-06-16 epoch. */
  startTime?: number;
  endTime?: number;
  start?: number;
  count?: number;
  queue?: number;
  type?: "ranked" | "normal" | "tourney" | "tutorial";
}

export class RiotClient {
  private readonly apiKey: string;
  private readonly limiter: RateLimiter;

  constructor(
    readonly region: RegionalRoute,
    apiKey: string | null = getApiKey(),
    limiter: RateLimiter = sharedLimiter,
  ) {
    if (!apiKey) throw new MissingApiKeyError();
    this.apiKey = apiKey;
    this.limiter = limiter;
  }

  private get baseUrl(): string {
    return `https://${this.region}.api.riotgames.com`;
  }

  private async request<T>(endpoint: string, attempt = 0): Promise<T> {
    const response = await this.limiter.schedule(() =>
      fetch(`${this.baseUrl}${endpoint}`, {
        headers: { "X-Riot-Token": this.apiKey },
        cache: "no-store",
      }),
    );

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "5", 10);
      this.limiter.penalize(Number.isFinite(retryAfter) ? retryAfter : 5);
      if (attempt < 3) return this.request<T>(endpoint, attempt + 1);
      throw new RiotApiError(429, endpoint, "Rate limited by Riot after 3 retries.");
    }

    if (response.status >= 500 && attempt < 3) {
      await sleep(500 * 2 ** attempt);
      return this.request<T>(endpoint, attempt + 1);
    }

    if (!response.ok) {
      throw new RiotApiError(
        response.status,
        endpoint,
        describeStatus(response.status, endpoint),
      );
    }

    return (await response.json()) as T;
  }

  /** account-v1: resolve a Riot ID such as "Hide on bush#KR1" to a puuid. */
  async getAccountByRiotId(gameName: string, tagLine: string): Promise<RawAccount> {
    const endpoint = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName,
    )}/${encodeURIComponent(tagLine)}`;
    return this.request<RawAccount>(endpoint);
  }

  async getAccountByPuuid(puuid: string): Promise<RawAccount> {
    return this.request<RawAccount>(
      `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  /**
   * match-v5 match IDs. `queue` accepts a single ID per call, so callers wanting
   * several queues (ARAM: Mayhem plus ARAM) issue one call each. We still verify
   * `info.queueId` on each match before storing it.
   */
  async getMatchIds(puuid: string, query: MatchIdQuery = {}): Promise<string[]> {
    const params = new URLSearchParams();
    if (query.queue !== undefined) params.set("queue", String(query.queue));
    params.set("start", String(query.start ?? 0));
    params.set("count", String(Math.min(100, query.count ?? 20)));
    if (query.startTime !== undefined) params.set("startTime", String(query.startTime));
    if (query.endTime !== undefined) params.set("endTime", String(query.endTime));
    if (query.type) params.set("type", query.type);

    return this.request<string[]>(
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`,
    );
  }

  async getMatch(matchId: string): Promise<RawMatch> {
    return this.request<RawMatch>(`/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
  }

  async getTimeline(matchId: string): Promise<RawTimeline> {
    return this.request<RawTimeline>(
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
    );
  }
}

/** 401/403 from Riot mean the key itself was refused, not that one lookup failed. */
export function isKeyRejection(error: unknown): boolean {
  return error instanceof RiotApiError && (error.status === 401 || error.status === 403);
}

export type KeyCheck = "valid" | "rejected";

/**
 * Riot has no "is this key good" endpoint. Looking up an account that cannot exist
 * does the job: a good key gets a 404, a bad or expired one gets a 401/403.
 */
export async function checkApiKey(key: string, region: RegionalRoute): Promise<KeyCheck> {
  try {
    await new RiotClient(region, key).getAccountByRiotId("keycheck", "zzzzz");
    return "valid";
  } catch (error) {
    if (error instanceof RiotApiError && error.status === 404) return "valid";
    if (isKeyRejection(error)) return "rejected";
    throw error;
  }
}

function describeStatus(status: number, endpoint: string): string {
  switch (status) {
    case 400:
      return `Riot rejected the request as malformed (${endpoint}).`;
    case 401:
      return "Riot returned 401 Unauthorized — the API key is missing or malformed.";
    case 403:
      return "Riot returned 403 Forbidden — the API key is invalid or expired. Development keys expire every 24 hours.";
    case 404:
      return `Riot found no data for ${endpoint}.`;
    case 415:
      return "Riot rejected the content type of the request.";
    default:
      return `Riot returned HTTP ${status} for ${endpoint}.`;
  }
}

/** Split "Name#TAG" into its parts. Falls back to a default tag when omitted. */
export function parseRiotId(
  input: string,
  fallbackTag = "NA1",
): { gameName: string; tagLine: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hashIndex = trimmed.lastIndexOf("#");
  if (hashIndex === -1) {
    return { gameName: trimmed, tagLine: fallbackTag };
  }
  const gameName = trimmed.slice(0, hashIndex).trim();
  const tagLine = trimmed.slice(hashIndex + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}
