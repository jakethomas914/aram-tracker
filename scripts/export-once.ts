/**
 * Rebuild the workbook from whatever is already stored, without calling Riot:
 *   npm run export
 */
import { EXPORT_DIR, WORKBOOK_FILENAME } from "@/lib/config";
import { writeWorkbookToDisk } from "@/lib/excel/workbook";

async function main(): Promise<void> {
  const target = await writeWorkbookToDisk(EXPORT_DIR, WORKBOOK_FILENAME);
  process.stdout.write(`wrote ${target}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
