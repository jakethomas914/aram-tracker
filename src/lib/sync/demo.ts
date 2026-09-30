import type { RawMatch, RawParticipant, RawTimeline, RosterMember } from "@/lib/types";
import { ARAM_QUEUE_ID } from "@/lib/types";

/**
 * Without a RIOT_API_KEY the app runs on generated matches instead of an empty
 * screen. Demo data is produced in Riot's Match-V5 shape and goes through the
 * exact same normalization, filtering and export path as live data, so the only
 * thing that changes between demo and live mode is where the JSON comes from.
 */

const DEMO_PREFIX = "DEMO_NA1_";

/** Deterministic PRNG so a given match ID always generates the same match. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const CHAMPIONS: Array<[number, string]> = [
  [22, "Ashe"], [103, "Ahri"], [84, "Akali"], [12, "Alistar"], [32, "Amumu"],
  [34, "Anivia"], [1, "Annie"], [136, "AurelionSol"], [432, "Bard"], [53, "Blitzcrank"],
  [63, "Brand"], [201, "Braum"], [51, "Caitlyn"], [164, "Camille"], [69, "Cassiopeia"],
  [42, "Corki"], [122, "Darius"], [131, "Diana"], [119, "Draven"], [245, "Ekko"],
  [81, "Ezreal"], [9, "Fiddlesticks"], [114, "Fiora"], [105, "Fizz"], [3, "Galio"],
  [104, "Graves"], [120, "Hecarim"], [74, "Heimerdinger"], [39, "Irelia"], [40, "Janna"],
  [59, "JarvanIV"], [24, "Jax"], [126, "Jayce"], [222, "Jinx"], [145, "Kaisa"],
  [429, "Kalista"], [43, "Karma"], [30, "Karthus"], [38, "Kassadin"], [55, "Katarina"],
  [10, "Kayle"], [141, "Kayn"], [85, "Kennen"], [121, "Khazix"], [203, "Kindred"],
  [64, "LeeSin"], [89, "Leona"], [127, "Lissandra"], [236, "Lucian"], [117, "Lulu"],
  [99, "Lux"], [54, "Malphite"], [90, "Malzahar"], [57, "Maokai"], [11, "MasterYi"],
  [21, "MissFortune"], [82, "Mordekaiser"], [25, "Morgana"], [267, "Nami"], [75, "Nasus"],
  [111, "Nautilus"], [518, "Neeko"], [76, "Nidalee"], [56, "Nocturne"], [20, "Nunu"],
  [2, "Olaf"], [61, "Orianna"], [516, "Ornn"], [80, "Pantheon"], [78, "Poppy"],
  [555, "Pyke"], [246, "Qiyana"], [133, "Quinn"], [497, "Rakan"], [33, "Rammus"],
  [421, "RekSai"], [58, "Renekton"], [107, "Rengar"], [92, "Riven"], [68, "Rumble"],
  [13, "Ryze"], [360, "Samira"], [113, "Sejuani"], [235, "Senna"], [147, "Seraphine"],
  [875, "Sett"], [35, "Shaco"], [98, "Shen"], [102, "Shyvana"], [27, "Singed"],
  [14, "Sion"], [15, "Sivir"], [72, "Skarner"], [37, "Sona"], [16, "Soraka"],
  [50, "Swain"], [517, "Sylas"], [134, "Syndra"], [223, "TahmKench"], [163, "Taliyah"],
  [91, "Talon"], [44, "Taric"], [17, "Teemo"], [412, "Thresh"], [18, "Tristana"],
  [48, "Trundle"], [23, "Tryndamere"], [4, "TwistedFate"], [29, "Twitch"], [77, "Udyr"],
  [6, "Urgot"], [110, "Varus"], [67, "Vayne"], [45, "Veigar"], [161, "Velkoz"],
  [254, "Vi"], [234, "Viego"], [112, "Viktor"], [8, "Vladimir"], [106, "Volibear"],
  [19, "Warwick"], [498, "Xayah"], [101, "Xerath"], [5, "XinZhao"], [157, "Yasuo"],
  [777, "Yone"], [83, "Yorick"], [350, "Yuumi"], [154, "Zac"], [238, "Zed"],
  [115, "Ziggs"], [26, "Zilean"], [142, "Zoe"], [143, "Zyra"],
];

/** Mid-to-late game ARAM item IDs, grouped so builds look coherent. */
const AD_ITEMS = [3031, 3072, 3094, 3036, 3033, 6673, 3046, 3142, 6676, 3153];
const AP_ITEMS = [6655, 4645, 3089, 3157, 3135, 3116, 3165, 4629, 3040, 3102];
const TANK_ITEMS = [3068, 3075, 3110, 3143, 3065, 8001, 3193, 3742, 3083, 2502];
const BOOTS = [3006, 3009, 3020, 3047, 3111, 3158];
const TRINKETS = [3340, 3363, 3364];
/** ARAM only offers Mark/Dash (32) plus the usual suspects. */
const SUMMONER_SPELLS = [4, 32, 1, 3, 6, 7, 11, 12, 13, 14, 21];

/**
 * Real rune-tree IDs so generated pages are internally consistent: a keystone
 * and its minor runes always come from the tree they belong to.
 */
const RUNE_TREES = [
  {
    style: 8000, // Precision
    keystones: [8005, 8008, 8021, 8010],
    minor: [9101, 9111, 8009, 9104, 9105, 9103, 8014, 8017, 8299],
  },
  {
    style: 8100, // Domination
    keystones: [8112, 8124, 8128, 9923],
    minor: [8126, 8139, 8143, 8137, 8140, 8141, 8135, 8105, 8106],
  },
  {
    style: 8200, // Sorcery
    keystones: [8214, 8229, 8230],
    minor: [8224, 8226, 8275, 8210, 8234, 8233, 8237, 8232, 8236],
  },
  {
    style: 8300, // Inspiration
    keystones: [8351, 8360, 8369],
    minor: [8306, 8304, 8321, 8313, 8352, 8345, 8347, 8410, 8316],
  },
  {
    style: 8400, // Resolve
    keystones: [8437, 8439, 8465],
    minor: [8446, 8463, 8401, 8429, 8444, 8473, 8451, 8453, 8242],
  },
];
const STAT_SHARDS = { offense: [5005, 5008, 5007], flex: [5008, 5002, 5003], defense: [5001, 5002, 5003] };

/** Friends the demo roster is seeded with. */
export const DEMO_ROSTER: Array<{ gameName: string; tagLine: string; alias: string }> = [
  { gameName: "PoroSnaxx", tagLine: "NA1", alias: "Poro" },
  { gameName: "BaronSteal", tagLine: "NA1", alias: "Baron" },
  { gameName: "HexdrinkHarold", tagLine: "NA1", alias: "Harold" },
  { gameName: "MidOrFeedMel", tagLine: "NA1", alias: "Mel" },
  { gameName: "SnowballSniper", tagLine: "NA1", alias: "Sniper" },
];

const FILLER_NAMES = [
  "TurretDiver", "ZhonyaEnjoyer", "LastHitLarry", "BlueBuffBandit", "FlashOnW",
  "SmiteGoesBrr", "AramAndchill", "PentaPending", "GrayScreenGamer", "OneTrickTerry",
  "WardlessWanda", "TeleportTom", "InhibSitter", "ScuttleShrimp", "MinionMassacre",
];

export function demoPuuid(gameName: string, tagLine: string): string {
  const seed = hashString(`${gameName}#${tagLine}`).toString(16).padStart(8, "0");
  return `demo-${seed}-${gameName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export function demoRosterMembers(now = Date.now()): RosterMember[] {
  return DEMO_ROSTER.map((friend, index) => ({
    puuid: demoPuuid(friend.gameName, friend.tagLine),
    gameName: friend.gameName,
    tagLine: friend.tagLine,
    alias: friend.alias,
    addedAt: now - (DEMO_ROSTER.length - index) * 1000,
    resolved: true,
  }));
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length) % values.length];
}

function pickMany<T>(random: () => number, values: T[], count: number): T[] {
  const pool = [...values];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return chosen;
}

function buildParticipant(
  random: () => number,
  options: {
    puuid: string;
    gameName: string;
    tagLine: string;
    teamId: number;
    win: boolean;
    durationSeconds: number;
    /** 0.6 = below average game, 1.6 = smurf game. */
    skill: number;
  },
): RawParticipant {
  const [championId, championName] = pick(random, CHAMPIONS);
  const minutes = options.durationSeconds / 60;
  const archetype = random();
  const itemPool = archetype < 0.4 ? AP_ITEMS : archetype < 0.8 ? AD_ITEMS : TANK_ITEMS;
  const isSupportish = archetype >= 0.8 || random() < 0.2;

  const winBias = options.win ? 1.25 : 0.8;
  const scale = options.skill * winBias;

  const kills = Math.max(0, Math.round((minutes * 0.55 * scale) * (0.6 + random() * 0.9)));
  const deaths = Math.max(
    0,
    Math.round((minutes * 0.45) / Math.max(0.5, scale) * (0.6 + random() * 0.9)),
  );
  const assists = Math.max(0, Math.round(minutes * 0.7 * scale * (0.5 + random())));

  const damage = Math.round(minutes * (900 + random() * 900) * scale);
  const damageTaken = Math.round(minutes * (800 + random() * 700) * (isSupportish ? 0.8 : 1.1));
  const heal = isSupportish
    ? Math.round(minutes * (400 + random() * 900))
    : Math.round(minutes * (80 + random() * 250));
  const healsOnTeammates = isSupportish ? Math.round(heal * (0.4 + random() * 0.4)) : 0;
  const shielding = isSupportish ? Math.round(minutes * (200 + random() * 700)) : 0;
  const gold = Math.round(minutes * (450 + random() * 220) * (0.85 + options.skill * 0.15));

  const items = [...pickMany(random, itemPool, 5), pick(random, BOOTS)];
  const primaryTree = pick(random, RUNE_TREES);
  const secondaryTree = pick(
    random,
    RUNE_TREES.filter((tree) => tree.style !== primaryTree.style),
  );
  const keystone = pick(random, primaryTree.keystones);

  const doubleKills = kills >= 4 && random() < 0.55 ? 1 + Math.floor(random() * 2) : 0;
  const tripleKills = doubleKills > 0 && random() < 0.28 ? 1 : 0;
  const quadraKills = tripleKills > 0 && random() < 0.16 ? 1 : 0;
  const pentaKills = quadraKills > 0 && random() < 0.12 ? 1 : 0;

  const teamKillsEstimate = Math.max(kills + assists, Math.round(minutes * 2.4));

  return {
    puuid: options.puuid,
    riotIdGameName: options.gameName,
    riotIdTagline: options.tagLine,
    summonerName: options.gameName,
    teamId: options.teamId,
    win: options.win,
    teamPosition: "",
    individualPosition: "NONE",
    championId,
    championName,
    champLevel: Math.min(18, 9 + Math.round(minutes / 2.2)),
    kills,
    deaths,
    assists,
    totalDamageDealtToChampions: damage,
    damageDealtToTurrets: Math.round(random() * 4000 * (options.win ? 1.6 : 0.7)),
    totalDamageTaken: damageTaken,
    damageSelfMitigated: Math.round(damageTaken * (0.5 + random() * 0.7)),
    totalHeal: heal,
    totalHealsOnTeammates: healsOnTeammates,
    totalDamageShieldedOnTeammates: shielding,
    goldEarned: gold,
    goldSpent: Math.round(gold * (0.86 + random() * 0.12)),
    totalMinionsKilled: Math.round(minutes * (2 + random() * 5)),
    neutralMinionsKilled: 0,
    visionScore: Math.round(random() * 12),
    timeCCingOthers: Math.round(random() * 45),
    totalTimeSpentDead: Math.round(deaths * (14 + random() * 22)),
    longestTimeSpentLiving: Math.round(120 + random() * 500),
    doubleKills,
    tripleKills,
    quadraKills,
    pentaKills,
    largestMultiKill: 1 + doubleKills + tripleKills + quadraKills + pentaKills,
    largestKillingSpree: Math.min(kills, Math.round(random() * 6)),
    firstBloodKill: false,
    timePlayed: options.durationSeconds,
    item0: items[0] ?? 0,
    item1: items[1] ?? 0,
    item2: items[2] ?? 0,
    item3: items[3] ?? 0,
    item4: items[4] ?? 0,
    item5: items[5] ?? 0,
    item6: pick(random, TRINKETS),
    summoner1Id: 4,
    summoner2Id: pick(
      random,
      SUMMONER_SPELLS.filter((id) => id !== 4),
    ),
    perks: {
      statPerks: {
        offense: pick(random, STAT_SHARDS.offense),
        flex: pick(random, STAT_SHARDS.flex),
        defense: pick(random, STAT_SHARDS.defense),
      },
      styles: [
        {
          description: "primaryStyle",
          style: primaryTree.style,
          selections: [keystone, ...pickMany(random, primaryTree.minor, 3)].map((perk) => ({
            perk,
          })),
        },
        {
          description: "subStyle",
          style: secondaryTree.style,
          selections: pickMany(random, secondaryTree.minor, 2).map((perk) => ({ perk })),
        },
      ],
    },
    challenges: {
      kda: deaths === 0 ? kills + assists : (kills + assists) / deaths,
      killParticipation: Math.min(1, (kills + assists) / Math.max(1, teamKillsEstimate)),
      damagePerMinute: damage / minutes,
      goldPerMinute: gold / minutes,
      teamDamagePercentage: 0.1 + random() * 0.25,
      damageTakenOnTeamPercentage: 0.1 + random() * 0.2,
      effectiveHealAndShielding: healsOnTeammates + shielding,
    },
  };
}

export interface DemoMatchOptions {
  /** Roster members eligible to appear in the game. */
  roster: RosterMember[];
  /** Sequence number, used for the match ID and the RNG seed. */
  index: number;
  /** When the game ended, epoch ms. */
  endedAt: number;
  /** Force how many roster members are in the lobby. */
  groupSize?: number;
}

export function buildDemoMatch(options: DemoMatchOptions): {
  match: RawMatch;
  timeline: RawTimeline;
} {
  const matchId = `${DEMO_PREFIX}${options.index}`;
  const random = mulberry32(hashString(matchId));

  const duration = Math.round(840 + random() * 780); // 14–27 minutes
  const startedAt = options.endedAt - duration * 1000;

  const eligible = options.roster.length > 0 ? options.roster : demoRosterMembers();
  const maxGroup = Math.min(5, eligible.length);
  const groupSize =
    options.groupSize ?? Math.max(2, Math.min(maxGroup, 2 + Math.floor(random() * maxGroup)));
  const group = pickMany(random, eligible, groupSize);

  // The tracked friends queue together, so they share team 100.
  const groupTeamId = 100;
  const groupWin = random() < 0.54;

  const participants: RawParticipant[] = [];
  const fillerPool = pickMany(random, FILLER_NAMES, FILLER_NAMES.length);
  let fillerIndex = 0;

  for (const member of group) {
    participants.push(
      buildParticipant(random, {
        puuid: member.puuid,
        gameName: member.gameName,
        tagLine: member.tagLine,
        teamId: groupTeamId,
        win: groupWin,
        durationSeconds: duration,
        // A stable per-player skill rating keeps the leaderboard meaningful.
        skill: 0.75 + (hashString(member.puuid) % 90) / 100,
      }),
    );
  }

  const fillerCount = 10 - group.length;
  for (let i = 0; i < fillerCount; i += 1) {
    const teamId = i < 5 - group.length ? groupTeamId : 200;
    const name = fillerPool[fillerIndex++ % fillerPool.length];
    participants.push(
      buildParticipant(random, {
        puuid: demoPuuid(name, "NA1"),
        gameName: name,
        tagLine: "NA1",
        teamId,
        win: teamId === groupTeamId ? groupWin : !groupWin,
        durationSeconds: duration,
        skill: 0.7 + random() * 0.8,
      }),
    );
  }

  participants.sort((a, b) => a.teamId - b.teamId);
  const firstBlooder = participants[Math.floor(random() * participants.length)];
  firstBlooder.firstBloodKill = true;

  const teamKills = (teamId: number) =>
    participants
      .filter((participant) => participant.teamId === teamId)
      .reduce((total, participant) => total + participant.kills, 0);

  const match: RawMatch = {
    metadata: {
      matchId,
      participants: participants.map((participant) => participant.puuid),
    },
    info: {
      queueId: ARAM_QUEUE_ID,
      gameMode: "ARAM",
      gameVersion: "15.19.704.1234",
      gameCreation: startedAt - 90_000,
      gameStartTimestamp: startedAt,
      gameEndTimestamp: options.endedAt,
      gameDuration: duration,
      participants,
      teams: [100, 200].map((teamId) => ({
        teamId,
        win: teamId === groupTeamId ? groupWin : !groupWin,
        objectives: {
          champion: {
            kills: teamKills(teamId),
            first: firstBlooder.teamId === teamId,
          },
          tower: { kills: teamId === groupTeamId ? (groupWin ? 5 : 2) : groupWin ? 2 : 5 },
          inhibitor: { kills: teamId === groupTeamId ? (groupWin ? 1 : 0) : groupWin ? 0 : 1 },
        },
      })),
    },
  };

  return { match, timeline: buildDemoTimeline(match, random) };
}

function buildDemoTimeline(match: RawMatch, random: () => number): RawTimeline {
  const levelUps = Math.min(18, Math.floor(match.info.gameDuration / 75) + 6);
  const events: Array<{ type: string; participantId: number; skillSlot: number }> = [];

  match.info.participants.forEach((_, index) => {
    const participantId = index + 1;
    // Max one basic ability first, take R whenever it is available.
    const maxOrder = pickMany(random, [1, 2, 3], 3);
    const sequence: number[] = [];
    for (let level = 1; level <= levelUps; level += 1) {
      if (level === 1) sequence.push(maxOrder[0]);
      else if (level === 2) sequence.push(maxOrder[1]);
      else if (level === 3) sequence.push(maxOrder[2]);
      else if (level === 6 || level === 11 || level === 16) sequence.push(4);
      else sequence.push(maxOrder[Math.min(2, Math.floor((level - 4) / 5))]);
    }
    for (const skillSlot of sequence) {
      events.push({ type: "SKILL_LEVEL_UP", participantId, skillSlot });
    }
  });

  return {
    metadata: match.metadata,
    info: { frames: [{ events }] },
  };
}

/**
 * A back-catalogue of finished games, newest first — the demo stand-in for
 * `GET /lol/match/v5/matches/by-puuid/{puuid}/ids`.
 */
export function demoMatchHistory(options: {
  roster: RosterMember[];
  count: number;
  now?: number;
}): Array<{ match: RawMatch; timeline: RawTimeline }> {
  const now = options.now ?? Date.now();
  const history: Array<{ match: RawMatch; timeline: RawTimeline }> = [];

  for (let index = 0; index < options.count; index += 1) {
    const random = mulberry32(hashString(`gap-${index}`));
    // Cluster games into evenings: a few back-to-back, then a gap of days.
    const sessionGap = Math.floor(index / 3) * (26 + random() * 40) * 3600 * 1000;
    const withinSession = (index % 3) * (22 * 60 * 1000);
    const endedAt = Math.round(now - sessionGap - withinSession - 15 * 60 * 1000);
    history.push(buildDemoMatch({ roster: options.roster, index, endedAt }));
  }

  return history;
}

/** Next unused demo match index, so a simulated game never collides. */
export function nextDemoMatchIndex(existingMatchIds: string[]): number {
  const indices = existingMatchIds
    .filter((id) => id.startsWith(DEMO_PREFIX))
    .map((id) => Number.parseInt(id.slice(DEMO_PREFIX.length), 10))
    .filter((value) => Number.isFinite(value));
  return indices.length > 0 ? Math.max(...indices) + 1 : 0;
}
