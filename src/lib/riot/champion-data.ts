/**
 * Static champion role and class mapping from Riot Games Data Dragon.
 *
 * Each champion carries tags: Marksman (ADC), Tank, Assassin, Mage, Fighter, Support.
 * This bundled mapping guarantees champion class analytics work offline and during demo mode.
 */

export type ChampionClassKey =
  | "Marksman"
  | "Tank"
  | "Assassin"
  | "Mage"
  | "Fighter"
  | "Support";

export interface ChampionClassMeta {
  key: ChampionClassKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CHAMPION_CLASS_KEYS: ChampionClassKey[] = [
  "Marksman",
  "Tank",
  "Assassin",
  "Mage",
  "Fighter",
  "Support",
];

export const CHAMPION_CLASSES: Record<ChampionClassKey, ChampionClassMeta> = {
  Marksman: {
    key: "Marksman",
    label: "ADC (Marksman)",
    shortLabel: "ADC",
    description: "Ranged attack-damage carries with high sustained damage",
    color: "#f59e0b",
    bgClass: "bg-amber-500/10 dark:bg-amber-400/10",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/30",
  },
  Tank: {
    key: "Tank",
    label: "Tank",
    shortLabel: "Tank",
    description: "High durability frontline initiators and damage absorbers",
    color: "#3b82f6",
    bgClass: "bg-blue-500/10 dark:bg-blue-400/10",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/30",
  },
  Assassin: {
    key: "Assassin",
    label: "Assassin",
    shortLabel: "Assassin",
    description: "Agile burst damage dealers targeting priority threats",
    color: "#a855f7",
    bgClass: "bg-purple-500/10 dark:bg-purple-400/10",
    textClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-500/30",
  },
  Mage: {
    key: "Mage",
    label: "Mage",
    shortLabel: "Mage",
    description: "Ranged ability-power casters with burst and area control",
    color: "#06b6d4",
    bgClass: "bg-cyan-500/10 dark:bg-cyan-400/10",
    textClass: "text-cyan-600 dark:text-cyan-400",
    borderClass: "border-cyan-500/30",
  },
  Fighter: {
    key: "Fighter",
    label: "Fighter",
    shortLabel: "Fighter",
    description: "Versatile brawlers blending durability with sustained damage",
    color: "#ef4444",
    bgClass: "bg-red-500/10 dark:bg-red-400/10",
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-red-500/30",
  },
  Support: {
    key: "Support",
    label: "Support",
    shortLabel: "Support",
    description: "Utility champions providing shields, buffs, and crowd control",
    color: "#10b981",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-400/10",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/30",
  },
};

const CHAMPION_TAGS_MAP: Record<string, ChampionClassKey[]> = {
  "1": [
    "Mage",
    "Support"
  ],
  "2": [
    "Fighter",
    "Tank"
  ],
  "3": [
    "Tank",
    "Mage"
  ],
  "4": [
    "Mage",
    "Marksman"
  ],
  "5": [
    "Fighter",
    "Tank"
  ],
  "6": [
    "Fighter",
    "Tank"
  ],
  "7": [
    "Assassin",
    "Mage"
  ],
  "8": [
    "Mage",
    "Fighter"
  ],
  "9": [
    "Mage",
    "Support"
  ],
  "10": [
    "Mage",
    "Marksman"
  ],
  "11": [
    "Assassin",
    "Fighter"
  ],
  "12": [
    "Tank",
    "Support"
  ],
  "13": [
    "Mage"
  ],
  "14": [
    "Tank",
    "Fighter"
  ],
  "15": [
    "Marksman"
  ],
  "16": [
    "Support",
    "Mage"
  ],
  "17": [
    "Marksman",
    "Mage"
  ],
  "18": [
    "Marksman",
    "Assassin"
  ],
  "19": [
    "Fighter",
    "Tank"
  ],
  "20": [
    "Tank",
    "Mage"
  ],
  "21": [
    "Marksman",
    "Mage"
  ],
  "22": [
    "Marksman",
    "Support"
  ],
  "23": [
    "Fighter",
    "Assassin"
  ],
  "24": [
    "Fighter"
  ],
  "25": [
    "Mage",
    "Support"
  ],
  "26": [
    "Support",
    "Mage"
  ],
  "27": [
    "Tank",
    "Mage"
  ],
  "28": [
    "Assassin",
    "Mage"
  ],
  "29": [
    "Marksman",
    "Assassin"
  ],
  "30": [
    "Mage"
  ],
  "31": [
    "Tank",
    "Mage"
  ],
  "32": [
    "Tank",
    "Support"
  ],
  "33": [
    "Tank"
  ],
  "34": [
    "Mage"
  ],
  "35": [
    "Assassin"
  ],
  "36": [
    "Tank",
    "Fighter"
  ],
  "37": [
    "Support",
    "Mage"
  ],
  "38": [
    "Assassin",
    "Mage"
  ],
  "39": [
    "Fighter",
    "Assassin"
  ],
  "40": [
    "Support",
    "Mage"
  ],
  "41": [
    "Fighter"
  ],
  "42": [
    "Marksman",
    "Mage"
  ],
  "43": [
    "Mage",
    "Support"
  ],
  "44": [
    "Support",
    "Tank"
  ],
  "45": [
    "Mage"
  ],
  "48": [
    "Fighter",
    "Tank"
  ],
  "50": [
    "Mage",
    "Support"
  ],
  "51": [
    "Marksman"
  ],
  "53": [
    "Tank",
    "Support"
  ],
  "54": [
    "Tank",
    "Mage"
  ],
  "55": [
    "Assassin",
    "Mage"
  ],
  "56": [
    "Fighter",
    "Assassin"
  ],
  "57": [
    "Tank",
    "Support"
  ],
  "58": [
    "Fighter",
    "Tank"
  ],
  "59": [
    "Fighter",
    "Tank"
  ],
  "60": [
    "Assassin",
    "Mage"
  ],
  "61": [
    "Mage",
    "Support"
  ],
  "62": [
    "Fighter",
    "Tank"
  ],
  "63": [
    "Mage",
    "Support"
  ],
  "64": [
    "Fighter",
    "Assassin"
  ],
  "67": [
    "Marksman",
    "Assassin"
  ],
  "68": [
    "Fighter",
    "Mage"
  ],
  "69": [
    "Mage"
  ],
  "72": [
    "Tank",
    "Fighter"
  ],
  "74": [
    "Mage",
    "Support"
  ],
  "75": [
    "Fighter",
    "Tank"
  ],
  "76": [
    "Assassin",
    "Mage"
  ],
  "77": [
    "Fighter",
    "Tank"
  ],
  "78": [
    "Tank",
    "Fighter"
  ],
  "79": [
    "Fighter",
    "Mage"
  ],
  "80": [
    "Fighter",
    "Assassin"
  ],
  "81": [
    "Marksman",
    "Mage"
  ],
  "82": [
    "Fighter",
    "Mage"
  ],
  "83": [
    "Fighter",
    "Tank"
  ],
  "84": [
    "Assassin"
  ],
  "85": [
    "Mage"
  ],
  "86": [
    "Fighter",
    "Tank"
  ],
  "89": [
    "Tank",
    "Support"
  ],
  "90": [
    "Mage"
  ],
  "91": [
    "Assassin"
  ],
  "92": [
    "Fighter",
    "Assassin"
  ],
  "96": [
    "Marksman",
    "Mage"
  ],
  "98": [
    "Tank"
  ],
  "99": [
    "Mage",
    "Support"
  ],
  "101": [
    "Mage",
    "Support"
  ],
  "102": [
    "Fighter",
    "Mage"
  ],
  "103": [
    "Mage",
    "Assassin"
  ],
  "104": [
    "Marksman"
  ],
  "105": [
    "Assassin",
    "Fighter"
  ],
  "106": [
    "Fighter",
    "Tank"
  ],
  "107": [
    "Assassin",
    "Fighter"
  ],
  "110": [
    "Marksman",
    "Mage"
  ],
  "111": [
    "Tank",
    "Support"
  ],
  "112": [
    "Mage"
  ],
  "113": [
    "Tank"
  ],
  "114": [
    "Fighter",
    "Assassin"
  ],
  "115": [
    "Mage"
  ],
  "117": [
    "Support",
    "Mage"
  ],
  "119": [
    "Marksman"
  ],
  "120": [
    "Fighter",
    "Tank"
  ],
  "121": [
    "Assassin"
  ],
  "122": [
    "Fighter",
    "Tank"
  ],
  "126": [
    "Marksman",
    "Fighter"
  ],
  "127": [
    "Mage"
  ],
  "131": [
    "Fighter",
    "Assassin"
  ],
  "133": [
    "Marksman",
    "Assassin"
  ],
  "134": [
    "Mage"
  ],
  "136": [
    "Mage"
  ],
  "141": [
    "Fighter",
    "Assassin"
  ],
  "142": [
    "Mage"
  ],
  "143": [
    "Mage",
    "Support"
  ],
  "145": [
    "Marksman",
    "Mage"
  ],
  "147": [
    "Support",
    "Mage"
  ],
  "150": [
    "Fighter",
    "Tank"
  ],
  "154": [
    "Tank",
    "Fighter"
  ],
  "157": [
    "Fighter",
    "Assassin"
  ],
  "161": [
    "Mage",
    "Support"
  ],
  "163": [
    "Mage",
    "Support"
  ],
  "164": [
    "Fighter",
    "Assassin"
  ],
  "166": [
    "Marksman",
    "Assassin"
  ],
  "200": [
    "Fighter"
  ],
  "201": [
    "Tank",
    "Support"
  ],
  "202": [
    "Marksman",
    "Mage"
  ],
  "203": [
    "Marksman"
  ],
  "221": [
    "Marksman"
  ],
  "222": [
    "Marksman"
  ],
  "223": [
    "Tank",
    "Support"
  ],
  "233": [
    "Fighter",
    "Assassin"
  ],
  "234": [
    "Fighter",
    "Assassin"
  ],
  "235": [
    "Support",
    "Marksman"
  ],
  "236": [
    "Marksman",
    "Assassin"
  ],
  "238": [
    "Assassin"
  ],
  "240": [
    "Fighter"
  ],
  "245": [
    "Assassin",
    "Mage"
  ],
  "246": [
    "Assassin"
  ],
  "254": [
    "Fighter",
    "Assassin"
  ],
  "266": [
    "Fighter"
  ],
  "267": [
    "Support",
    "Mage"
  ],
  "268": [
    "Mage",
    "Marksman"
  ],
  "350": [
    "Support",
    "Mage"
  ],
  "360": [
    "Marksman",
    "Assassin"
  ],
  "412": [
    "Support",
    "Tank"
  ],
  "420": [
    "Fighter",
    "Tank"
  ],
  "421": [
    "Fighter",
    "Tank"
  ],
  "427": [
    "Support",
    "Mage"
  ],
  "429": [
    "Marksman"
  ],
  "432": [
    "Support",
    "Mage"
  ],
  "497": [
    "Support"
  ],
  "498": [
    "Marksman"
  ],
  "516": [
    "Tank"
  ],
  "517": [
    "Mage",
    "Assassin"
  ],
  "518": [
    "Mage",
    "Support"
  ],
  "523": [
    "Marksman"
  ],
  "526": [
    "Tank",
    "Support"
  ],
  "555": [
    "Support",
    "Assassin"
  ],
  "711": [
    "Mage"
  ],
  "777": [
    "Fighter",
    "Assassin"
  ],
  "799": [
    "Fighter",
    "Assassin"
  ],
  "875": [
    "Fighter",
    "Tank"
  ],
  "876": [
    "Fighter",
    "Mage"
  ],
  "887": [
    "Fighter"
  ],
  "888": [
    "Support",
    "Mage"
  ],
  "893": [
    "Mage",
    "Assassin"
  ],
  "895": [
    "Fighter",
    "Assassin"
  ],
  "897": [
    "Tank",
    "Fighter"
  ],
  "901": [
    "Marksman",
    "Mage"
  ],
  "902": [
    "Support",
    "Mage"
  ],
  "910": [
    "Mage",
    "Support"
  ],
  "950": [
    "Assassin",
    "Fighter"
  ],
  "aatrox": [
    "Fighter"
  ],
  "ahri": [
    "Mage",
    "Assassin"
  ],
  "akali": [
    "Assassin"
  ],
  "akshan": [
    "Marksman",
    "Assassin"
  ],
  "alistar": [
    "Tank",
    "Support"
  ],
  "ambessa": [
    "Fighter",
    "Assassin"
  ],
  "amumu": [
    "Tank",
    "Support"
  ],
  "anivia": [
    "Mage"
  ],
  "annie": [
    "Mage",
    "Support"
  ],
  "aphelios": [
    "Marksman"
  ],
  "ashe": [
    "Marksman",
    "Support"
  ],
  "aurelionsol": [
    "Mage"
  ],
  "aurora": [
    "Mage",
    "Assassin"
  ],
  "azir": [
    "Mage",
    "Marksman"
  ],
  "bard": [
    "Support",
    "Mage"
  ],
  "belveth": [
    "Fighter"
  ],
  "blitzcrank": [
    "Tank",
    "Support"
  ],
  "brand": [
    "Mage",
    "Support"
  ],
  "braum": [
    "Tank",
    "Support"
  ],
  "briar": [
    "Fighter",
    "Assassin"
  ],
  "caitlyn": [
    "Marksman"
  ],
  "camille": [
    "Fighter",
    "Assassin"
  ],
  "cassiopeia": [
    "Mage"
  ],
  "chogath": [
    "Tank",
    "Mage"
  ],
  "corki": [
    "Marksman",
    "Mage"
  ],
  "darius": [
    "Fighter",
    "Tank"
  ],
  "diana": [
    "Fighter",
    "Assassin"
  ],
  "draven": [
    "Marksman"
  ],
  "drmundo": [
    "Tank",
    "Fighter"
  ],
  "ekko": [
    "Assassin",
    "Mage"
  ],
  "elise": [
    "Assassin",
    "Mage"
  ],
  "evelynn": [
    "Assassin",
    "Mage"
  ],
  "ezreal": [
    "Marksman",
    "Mage"
  ],
  "fiddlesticks": [
    "Mage",
    "Support"
  ],
  "fiora": [
    "Fighter",
    "Assassin"
  ],
  "fizz": [
    "Assassin",
    "Fighter"
  ],
  "galio": [
    "Tank",
    "Mage"
  ],
  "gangplank": [
    "Fighter"
  ],
  "garen": [
    "Fighter",
    "Tank"
  ],
  "gnar": [
    "Fighter",
    "Tank"
  ],
  "gragas": [
    "Fighter",
    "Mage"
  ],
  "graves": [
    "Marksman"
  ],
  "gwen": [
    "Fighter"
  ],
  "hecarim": [
    "Fighter",
    "Tank"
  ],
  "heimerdinger": [
    "Mage",
    "Support"
  ],
  "hwei": [
    "Mage",
    "Support"
  ],
  "illaoi": [
    "Fighter",
    "Tank"
  ],
  "irelia": [
    "Fighter",
    "Assassin"
  ],
  "ivern": [
    "Support",
    "Mage"
  ],
  "janna": [
    "Support",
    "Mage"
  ],
  "jarvaniv": [
    "Fighter",
    "Tank"
  ],
  "jax": [
    "Fighter"
  ],
  "jayce": [
    "Marksman",
    "Fighter"
  ],
  "jhin": [
    "Marksman",
    "Mage"
  ],
  "jinx": [
    "Marksman"
  ],
  "kaisa": [
    "Marksman",
    "Mage"
  ],
  "kalista": [
    "Marksman"
  ],
  "karma": [
    "Mage",
    "Support"
  ],
  "karthus": [
    "Mage"
  ],
  "kassadin": [
    "Assassin",
    "Mage"
  ],
  "katarina": [
    "Assassin",
    "Mage"
  ],
  "kayle": [
    "Mage",
    "Marksman"
  ],
  "kayn": [
    "Fighter",
    "Assassin"
  ],
  "kennen": [
    "Mage"
  ],
  "khazix": [
    "Assassin"
  ],
  "kindred": [
    "Marksman"
  ],
  "kled": [
    "Fighter"
  ],
  "kogmaw": [
    "Marksman",
    "Mage"
  ],
  "ksante": [
    "Tank",
    "Fighter"
  ],
  "leblanc": [
    "Assassin",
    "Mage"
  ],
  "leesin": [
    "Fighter",
    "Assassin"
  ],
  "leona": [
    "Tank",
    "Support"
  ],
  "lillia": [
    "Fighter",
    "Mage"
  ],
  "lissandra": [
    "Mage"
  ],
  "lucian": [
    "Marksman",
    "Assassin"
  ],
  "lulu": [
    "Support",
    "Mage"
  ],
  "lux": [
    "Mage",
    "Support"
  ],
  "malphite": [
    "Tank",
    "Mage"
  ],
  "malzahar": [
    "Mage"
  ],
  "maokai": [
    "Tank",
    "Support"
  ],
  "masteryi": [
    "Assassin",
    "Fighter"
  ],
  "milio": [
    "Support",
    "Mage"
  ],
  "missfortune": [
    "Marksman",
    "Mage"
  ],
  "monkeyking": [
    "Fighter",
    "Tank"
  ],
  "wukong": [
    "Fighter",
    "Tank"
  ],
  "mordekaiser": [
    "Fighter",
    "Mage"
  ],
  "morgana": [
    "Mage",
    "Support"
  ],
  "naafiri": [
    "Assassin",
    "Fighter"
  ],
  "nami": [
    "Support",
    "Mage"
  ],
  "nasus": [
    "Fighter",
    "Tank"
  ],
  "nautilus": [
    "Tank",
    "Support"
  ],
  "neeko": [
    "Mage",
    "Support"
  ],
  "nidalee": [
    "Assassin",
    "Mage"
  ],
  "nilah": [
    "Fighter",
    "Assassin"
  ],
  "nocturne": [
    "Fighter",
    "Assassin"
  ],
  "nunu": [
    "Tank",
    "Mage"
  ],
  "nunuwillump": [
    "Tank",
    "Mage"
  ],
  "olaf": [
    "Fighter",
    "Tank"
  ],
  "orianna": [
    "Mage",
    "Support"
  ],
  "ornn": [
    "Tank"
  ],
  "pantheon": [
    "Fighter",
    "Assassin"
  ],
  "poppy": [
    "Tank",
    "Fighter"
  ],
  "pyke": [
    "Support",
    "Assassin"
  ],
  "qiyana": [
    "Assassin"
  ],
  "quinn": [
    "Marksman",
    "Assassin"
  ],
  "rakan": [
    "Support"
  ],
  "rammus": [
    "Tank"
  ],
  "reksai": [
    "Fighter",
    "Tank"
  ],
  "rell": [
    "Tank",
    "Support"
  ],
  "renata": [
    "Support",
    "Mage"
  ],
  "renataglasc": [
    "Support",
    "Mage"
  ],
  "renekton": [
    "Fighter",
    "Tank"
  ],
  "rengar": [
    "Assassin",
    "Fighter"
  ],
  "riven": [
    "Fighter",
    "Assassin"
  ],
  "rumble": [
    "Fighter",
    "Mage"
  ],
  "ryze": [
    "Mage"
  ],
  "samira": [
    "Marksman",
    "Assassin"
  ],
  "sejuani": [
    "Tank"
  ],
  "senna": [
    "Support",
    "Marksman"
  ],
  "seraphine": [
    "Support",
    "Mage"
  ],
  "sett": [
    "Fighter",
    "Tank"
  ],
  "shaco": [
    "Assassin"
  ],
  "shen": [
    "Tank"
  ],
  "shyvana": [
    "Fighter",
    "Mage"
  ],
  "singed": [
    "Tank",
    "Mage"
  ],
  "sion": [
    "Tank",
    "Fighter"
  ],
  "sivir": [
    "Marksman"
  ],
  "skarner": [
    "Tank",
    "Fighter"
  ],
  "smolder": [
    "Marksman",
    "Mage"
  ],
  "sona": [
    "Support",
    "Mage"
  ],
  "soraka": [
    "Support",
    "Mage"
  ],
  "swain": [
    "Mage",
    "Support"
  ],
  "sylas": [
    "Mage",
    "Assassin"
  ],
  "syndra": [
    "Mage"
  ],
  "tahmkench": [
    "Tank",
    "Support"
  ],
  "taliyah": [
    "Mage",
    "Support"
  ],
  "talon": [
    "Assassin"
  ],
  "taric": [
    "Support",
    "Tank"
  ],
  "teemo": [
    "Marksman",
    "Mage"
  ],
  "thresh": [
    "Support",
    "Tank"
  ],
  "tristana": [
    "Marksman",
    "Assassin"
  ],
  "trundle": [
    "Fighter",
    "Tank"
  ],
  "tryndamere": [
    "Fighter",
    "Assassin"
  ],
  "twistedfate": [
    "Mage",
    "Marksman"
  ],
  "twitch": [
    "Marksman",
    "Assassin"
  ],
  "udyr": [
    "Fighter",
    "Tank"
  ],
  "urgot": [
    "Fighter",
    "Tank"
  ],
  "varus": [
    "Marksman",
    "Mage"
  ],
  "vayne": [
    "Marksman",
    "Assassin"
  ],
  "veigar": [
    "Mage"
  ],
  "velkoz": [
    "Mage",
    "Support"
  ],
  "vex": [
    "Mage"
  ],
  "vi": [
    "Fighter",
    "Assassin"
  ],
  "viego": [
    "Fighter",
    "Assassin"
  ],
  "viktor": [
    "Mage"
  ],
  "vladimir": [
    "Mage",
    "Fighter"
  ],
  "volibear": [
    "Fighter",
    "Tank"
  ],
  "warwick": [
    "Fighter",
    "Tank"
  ],
  "xayah": [
    "Marksman"
  ],
  "xerath": [
    "Mage",
    "Support"
  ],
  "xinzhao": [
    "Fighter",
    "Tank"
  ],
  "yasuo": [
    "Fighter",
    "Assassin"
  ],
  "yone": [
    "Fighter",
    "Assassin"
  ],
  "yorick": [
    "Fighter",
    "Tank"
  ],
  "yuumi": [
    "Support",
    "Mage"
  ],
  "zac": [
    "Tank",
    "Fighter"
  ],
  "zed": [
    "Assassin"
  ],
  "zeri": [
    "Marksman"
  ],
  "ziggs": [
    "Mage"
  ],
  "zilean": [
    "Support",
    "Mage"
  ],
  "zoe": [
    "Mage"
  ],
  "zyra": [
    "Mage",
    "Support"
  ]
};

export function normalizeChampionKey(nameOrId: string | number): string {
  return String(nameOrId).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getChampionTags(nameOrId: string | number): ChampionClassKey[] {
  const norm = normalizeChampionKey(nameOrId);
  const found = CHAMPION_TAGS_MAP[norm] ?? CHAMPION_TAGS_MAP[String(nameOrId)];
  if (found && found.length > 0) return found;
  return ["Fighter"];
}

export function getPrimaryChampionClass(nameOrId: string | number): ChampionClassKey {
  const tags = getChampionTags(nameOrId);
  return tags[0] ?? "Fighter";
}
