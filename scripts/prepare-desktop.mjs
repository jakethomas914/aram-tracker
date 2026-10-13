/**
 * Turns `next build` output into the folder the desktop app bundles.
 *
 * Next's standalone server does not include static assets, may contain runtime
 * state copied in by the file tracer, and uses symlinks for externalised packages.
 * Symlinks do not survive being copied into a Windows build reliably, so they are
 * replaced with real copies.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("No .next/standalone/server.js. Run `npm run build` first.");
  process.exit(1);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true, dereference: true });
}

copyDir(path.join(root, "public"), path.join(standalone, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));

for (const leaked of ["data", "exports", ".env", ".env.local"]) {
  fs.rmSync(path.join(standalone, leaked), { recursive: true, force: true });
}

function dereferenceLinks(directory) {
  let replaced = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.realpathSync(full);
      fs.rmSync(full, { recursive: true, force: true });
      fs.cpSync(target, full, { recursive: true, dereference: true });
      replaced += 1;
    } else if (entry.isDirectory()) {
      replaced += dereferenceLinks(full);
    }
  }
  return replaced;
}

const replaced = dereferenceLinks(standalone);
console.log(`Prepared ${path.relative(root, standalone)} (${replaced} symlinks replaced).`);
