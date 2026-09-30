import { NextResponse } from "next/server";

import { EXPORT_DIR, WORKBOOK_FILENAME } from "@/lib/config";
import {
  buildWorkbookBuffer,
  workbookFilename,
  writeWorkbookToDisk,
} from "@/lib/excel/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const buffer = await buildWorkbookBuffer();
  const filename = workbookFilename();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

/** Refresh the workbook that lives on disk next to the repo. */
export async function POST() {
  const target = await writeWorkbookToDisk(EXPORT_DIR, WORKBOOK_FILENAME);
  return NextResponse.json({ path: target });
}
