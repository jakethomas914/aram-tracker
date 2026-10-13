# ARAM Group Tracker

Tracks every ARAM game you play **with a specific group of friends** through Riot's
Match-V5 API, and writes the full stat line for each game into a multi-sheet Excel
workbook.

The rule it enforces is the one you care about: a match is only kept when
`info.queueId === 450` (ARAM) **and** at least _N_ of your tracked friends were in
the lobby. Solo ARAMs and every other queue are discarded.

## What you get

**A dashboard** for the group: record and win rate, current streak, per-friend
leaderboard, champion pools, duo win rates, single-game records, and a full
scoreboard for any match.

**An Excel workbook** (`exports/aram-stats.xlsx`) with eight sheets:

| Sheet                   | One row per…                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| **Overview**            | group record, totals, streaks, patches, roster                        |
| **Matches**             | match — result, duration, who played what, group totals               |
| **Friend Performances** | tracked friend per match — 53 columns, the full stat line             |
| **Player Totals**       | friend — games, win rate, KDA, averages, multikills, favourite champ  |
| **Champion Pool**       | friend + champion — games, win rate, KDA, damage                      |
| **Duo Win Rates**       | pair of friends — games together and win rate                         |
| **Hall of Fame**        | award — who holds each single-game record and in which match          |
| **All Participants**    | all ten players per match, so nothing the API returned is thrown away |

The per-performance sheets carry everything Match-V5 exposes for ARAM: champion and
level, K/D/A and KDA, kill participation, damage dealt / taken / mitigated, damage
to turrets, team damage share, healing, healing on teammates, shielding, effective
heal+shield, gold earned and spent, gold and damage per minute, minions, vision
score, crowd-control time, time spent dead, longest time alive, multikills and
killing sprees, first blood, time played, items, trinket, summoner spells, the full
rune page (keystone, both trees, all selections, stat shards), ability order,
position (`NONE` in ARAM), team, match ID, and patch.

Item, rune, and summoner-spell names come from
[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon), so the
spreadsheet reads `Zhonya's Hourglass` instead of `3157`. Ability order is derived
from `SKILL_LEVEL_UP` events in the match timeline.

## Quick start

```bash
npm install
npm run dev          # http://localhost:43127
```

With no `RIOT_API_KEY` set, the app boots in **demo mode**: it generates matches in
the exact Match-V5 response shape and runs them through the same normalization,
filtering, and export code as real data. Click **Simulate a game** in the header to
watch a new game land and the spreadsheet rewrite itself.

### Tracking your real games

1. Sign in at the [Riot Developer Portal](https://developer.riotgames.com) and copy
   your key.
2. Open **Settings → Riot API key** in the app, paste it, and click **Save and
   test**. The key is checked with Riot first and saved to `data/riot-key.json`
   (git-ignored, never sent back to the browser). No restart needed, and the watcher
   picks it up too. Setting `RIOT_API_KEY` in `.env.local` still works; a key pasted
   in the app takes priority.
3. Open the **Roster** tab and add each friend's Riot ID (`GameName#TAG`). Each one
   is resolved to a puuid through Account-V1.
4. Hit **Sync now**.

Riot cannot renew keys automatically: the default development key stops working
every 24 hours and only a signed-in human can generate the next one. When that
happens the app pauses syncing and shows an "API key has expired" banner with a
button to the paste box. To stop re-pasting daily, register the project as a
**Personal** project on the developer portal; personal keys are intended for a small
private group and do not expire daily.

### Polling after every game

```bash
npm run watch
```

The watcher re-checks match history on an interval (default 300s, editable in the
Settings tab), stores any new group ARAM, and rewrites the workbook. Leave it
running next to the dev server and the spreadsheet stays current on its own.

Each pass fetches at most `maxMatchesPerSync` matches (default 30) so no single
sync runs long under Riot's rate limits. When there is history left to backfill the
watcher loops straight into the next pass instead of sleeping, so it catches up
quickly and then settles into the normal interval — which makes it the easiest way
to do the initial import of a long match history.

One-shot equivalents, for cron:

```bash
npm run sync     # fetch new matches once, print a JSON summary
npm run export   # rebuild the workbook from stored data, no API calls
```

## How the filtering works

```
GET /lol/match/v5/matches/by-puuid/{puuid}/ids?queue=450&startTime=…&count=…
  → union of match IDs across every roster member, deduped
GET /lol/match/v5/matches/{matchId}
  → verify info.queueId === 450
  → count roster members among info.participants
  → keep the match only if that count >= minGroupSize
GET /lol/match/v5/matches/{matchId}/timeline   (optional)
  → SKILL_LEVEL_UP events become the ability order
```

`queue=450` lets Riot do the first pass, and `info.queueId` is re-checked on the
match itself before anything is stored. Match IDs that fail either test are recorded
in a skip list so they are never fetched twice.

Rate limiting mirrors a development key — 20 requests/second and 100 requests/2
minutes — through a shared sliding-window limiter, with `Retry-After` honoured on
429 and retries on 5xx.

## Configuration

Everything below is settable in the **Settings** tab (stored in `data/db.json`) and
seedable from the environment. See `.env.example` for the full list.

| Setting                 | Env var                       | Default    | Meaning                                       |
| ----------------------- | ----------------------------- | ---------- | --------------------------------------------- |
| Regional routing        | `RIOT_REGION`                 | `americas` | `americas` / `europe` / `asia` / `sea`        |
| Friends required        | `ARAM_MIN_GROUP_SIZE`         | `2`        | Minimum roster members for a match to count   |
| Look back               | `ARAM_LOOKBACK_DAYS`          | `90`       | How far back match history is pulled          |
| Match IDs per friend    | `ARAM_MATCHES_PER_PLAYER`     | `40`       | Riot caps this at 100                         |
| Matches per sync pass   | `ARAM_MAX_MATCHES_PER_SYNC`   | `30`       | Keeps a large first backfill from running long |
| Fetch ability order     | `ARAM_FETCH_TIMELINES`        | `true`     | One extra timeline request per match          |
| Watcher interval        | `ARAM_WATCH_INTERVAL_SECONDS` | `300`      | Seconds between polls                         |
| Auto-write the workbook | `ARAM_AUTO_WRITE_WORKBOOK`    | `true`     | Rewrite the `.xlsx` whenever matches are found |

`RIOT_REGION` also accepts a platform id (`na1`, `euw1`, `kr`, …) and maps it to the
right regional cluster, since Account-V1 and Match-V5 are served per cluster rather
than per platform.

## Project layout

```
src/lib/riot/       Match-V5 + Account-V1 client, rate limiter, Data Dragon names
src/lib/sync/       sync engine, raw → normalized mapping, demo data generator
src/lib/store/      JSON database with atomic writes and a serialized write lock
src/lib/stats/      aggregation: player totals, champion pools, duos, records
src/lib/excel/      ExcelJS workbook builder
src/app/api/        state, sync, roster, settings, export, reset
src/components/aram/ dashboard UI
scripts/watch.ts    polling watcher
```

Stored data lives in `data/db.json` and generated spreadsheets in `exports/`. Both
are gitignored — delete `data/db.json` to start over, or use **Clear stored matches**
in the Settings tab to keep your roster while rebuilding history.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · ExcelJS · Zod

## Notes

Match data comes from Riot Games' Match-V5 API. This project isn't endorsed by Riot
Games and doesn't reflect their views.
