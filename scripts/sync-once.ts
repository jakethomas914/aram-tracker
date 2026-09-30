/**
 * One-shot sync, handy for cron jobs:
 *   npm run sync
 */
import { runSync } from "@/lib/sync/engine";

async function main(): Promise<void> {
  const summary = await runSync({ force: true });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exit(summary.errors.length > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
