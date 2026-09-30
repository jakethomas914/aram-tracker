import fs from "node:fs/promises";
import path from "node:path";

import { DATA_DIR } from "@/lib/config";

/**
 * Item / rune / summoner-spell names come from Data Dragon, Riot's public static
 * data CDN (no API key required). Match-V5 only returns numeric IDs, so without
 * this the spreadsheet would be full of bare numbers.
 *
 * The bundle is cached on disk; if the CDN is unreachable we degrade to
 * "Item 3153"-style labels rather than failing a sync.
 */
/** One rune tree, split into the keystone slot and the minor-rune slots. */
export interface RuneTree {
  style: number;
  keystones: number[];
  minor: number[];
}

interface StaticBundle {
  /** Bumped when the shape below changes, which invalidates old caches. */
  schema: number;
  version: string;
  fetchedAt: number;
  items: Record<string, string>;
  summonerSpells: Record<string, string>;
  runes: Record<string, string>;
  runeStyles: Record<string, string>;
  runeTrees: RuneTree[];
}

const CACHE_SCHEMA = 2;
const CACHE_PATH = path.join(DATA_DIR, "ddragon-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

let memoryCache: StaticBundle | null = null;
let inFlight: Promise<StaticBundle | null> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Data Dragon ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function readCache(): Promise<StaticBundle | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(CACHE_PATH, "utf8")) as StaticBundle;
    if (parsed.schema !== CACHE_SCHEMA) return null;
    return parsed.items && parsed.runes ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(bundle: StaticBundle): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(bundle), "utf8");
  } catch {
    // A missing cache only costs us a refetch later.
  }
}

async function downloadBundle(): Promise<StaticBundle> {
  const versions = await fetchJson<string[]>(
    "https://ddragon.leagueoflegends.com/api/versions.json",
  );
  const version = versions[0];
  const cdn = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US`;

  const [itemData, spellData, runeData] = await Promise.all([
    fetchJson<{ data: Record<string, { name: string }> }>(`${cdn}/item.json`),
    fetchJson<{ data: Record<string, { key: string; name: string }> }>(
      `${cdn}/summoner.json`,
    ),
    fetchJson<
      Array<{
        id: number;
        name: string;
        slots: Array<{ runes: Array<{ id: number; name: string }> }>;
      }>
    >(`${cdn}/runesReforged.json`),
  ]);

  const items: Record<string, string> = {};
  for (const [id, item] of Object.entries(itemData.data)) items[id] = item.name;

  const summonerSpells: Record<string, string> = {};
  for (const spell of Object.values(spellData.data)) {
    summonerSpells[spell.key] = spell.name;
  }

  const runes: Record<string, string> = {};
  const runeStyles: Record<string, string> = {};
  const runeTrees: RuneTree[] = [];
  for (const style of runeData) {
    runeStyles[String(style.id)] = style.name;
    for (const slot of style.slots) {
      for (const rune of slot.runes) runes[String(rune.id)] = rune.name;
    }
    runeTrees.push({
      style: style.id,
      // The first slot holds keystones; the rest are the minor rows.
      keystones: (style.slots[0]?.runes ?? []).map((rune) => rune.id),
      minor: style.slots.slice(1).flatMap((slot) => slot.runes.map((rune) => rune.id)),
    });
  }

  return {
    schema: CACHE_SCHEMA,
    version,
    fetchedAt: Date.now(),
    items,
    summonerSpells,
    runes,
    runeStyles,
    runeTrees,
  };
}

export async function loadStaticData(): Promise<StaticBundle | null> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const cached = await readCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      memoryCache = cached;
      return cached;
    }
    try {
      const fresh = await downloadBundle();
      memoryCache = fresh;
      await writeCache(fresh);
      return fresh;
    } catch {
      // Stale cache beats numeric IDs.
      memoryCache = cached;
      return cached;
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Stat shards are not in runesReforged.json, so they are mapped by hand. */
const STAT_PERKS: Record<string, string> = {
  "5001": "Health Scaling",
  "5002": "Armor",
  "5003": "Magic Resist",
  "5005": "Attack Speed",
  "5007": "Ability Haste",
  "5008": "Adaptive Force",
  "5010": "Move Speed",
  "5011": "Health",
  "5013": "Tenacity",
};

/** Rune trees for the current patch, or null when the CDN is unreachable. */
export async function loadRuneTrees(): Promise<RuneTree[] | null> {
  const bundle = await loadStaticData();
  return bundle?.runeTrees?.length ? bundle.runeTrees : null;
}

export interface NameResolver {
  version: string | null;
  item(id: number): string;
  summonerSpell(id: number): string;
  rune(id: number): string;
  runeStyle(id: number): string;
  statPerk(id: number): string;
}

export async function createNameResolver(): Promise<NameResolver> {
  const bundle = await loadStaticData();
  const lookup = (map: Record<string, string> | undefined, id: number, label: string) => {
    if (!id) return "";
    return map?.[String(id)] ?? `${label} ${id}`;
  };

  return {
    version: bundle?.version ?? null,
    item: (id) => lookup(bundle?.items, id, "Item"),
    summonerSpell: (id) => lookup(bundle?.summonerSpells, id, "Spell"),
    rune: (id) => lookup(bundle?.runes, id, "Rune"),
    runeStyle: (id) => lookup(bundle?.runeStyles, id, "Style"),
    statPerk: (id) => (id ? (STAT_PERKS[String(id)] ?? `Shard ${id}`) : ""),
  };
}
