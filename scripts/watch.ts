/**
 * Polls Riot for new ARAM games and rewrites the spreadsheet whenever one lands.
 *
 * Run alongside the dev server:
 *   npm run watch
 *
 * The interval comes from the saved settings (Settings tab, or
 * ARAM_WATCH_INTERVAL_SECONDS) and is re-read on every pass, so changing it in
 * the UI takes effect without a restart.
 */
import { EXPORT_DIR, WORKBOOK_FILENAME, isDemoMode } from "@/lib/config";
import { writeWorkbookToDisk } from "@/lib/excel/workbook";
import { getSettings, invalidateCache, setSyncState } from "@/lib/store/db";
import { SyncBusyError, runSync } from "@/lib/sync/engine";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let stopping = false;

function log(message: string): void {
  process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);
}

async function once(): Promise<void> {
  // Another process (the web app) may have written the database since last pass.
  invalidateCache();

  try {
    const summary = await runSync();

    if (summary.groupMatchesAdded > 0) {
      log(
        `+${summary.groupMatchesAdded} ARAM game(s): ${summary.addedMatchIds.join(", ")}`,
      );
      if (summary.workbookPath) log(`workbook updated -> ${summary.workbookPath}`);
    } else {
      log(
        `no new games (checked ${summary.candidateMatches} match id(s), skipped ${summary.skippedNonGroup} without enough friends)`,
      );
    }

    for (const error of summary.errors) log(`warning: ${error}`);
  } catch (error) {
    if (error instanceof SyncBusyError) {
      log("a sync is already running, skipping this pass");
      return;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  log(
    `watcher starting in ${isDemoMode() ? "demo" : "live Riot API"} mode; workbook target ${EXPORT_DIR}/${WORKBOOK_FILENAME}`,
  );

  // Make sure a workbook exists even before the first new match arrives.
  try {
    log(`wrote ${await writeWorkbookToDisk(EXPORT_DIR, WORKBOOK_FILENAME)}`);
  } catch (error) {
    log(`could not write the initial workbook: ${(error as Error).message}`);
  }

  while (!stopping) {
    try {
      await once();
    } catch (error) {
      log(`sync error: ${error instanceof Error ? error.message : String(error)}`);
      // Clear the running flag so a crashed pass does not wedge the next one.
      await setSyncState({ running: false }).catch(() => undefined);
    }

    const settings = await getSettings();
    const intervalMs = settings.watchIntervalSeconds * 1000;
    log(`sleeping ${settings.watchIntervalSeconds}s`);

    // Wake up early when the process is asked to stop.
    const step = 1000;
    for (let waited = 0; waited < intervalMs && !stopping; waited += step) {
      await sleep(Math.min(step, intervalMs - waited));
    }
  }

  log("watcher stopped");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) process.exit(0);
    stopping = true;
    log(`received ${signal}, finishing up`);
  });
}

main().catch((error) => {
  log(`fatal: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});
