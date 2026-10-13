/**
 * Copies the prepared Next server into the packaged app.
 *
 * electron-builder silently drops every folder named `node_modules` when it copies
 * `extraResources`, which would leave the bundled server without its dependencies
 * (4.6 MB instead of ~70 MB, and a server that cannot start). Copying here, after
 * packing, bypasses that filtering.
 */
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const source = path.join(context.packager.projectDir, ".next", "standalone");
  if (!fs.existsSync(path.join(source, "server.js"))) {
    throw new Error("Missing .next/standalone/server.js. Run `npm run desktop:prepare` first.");
  }

  const target = path.join(context.appOutDir, "resources", "app-server");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, dereference: true });

  if (!fs.existsSync(path.join(target, "node_modules", "next"))) {
    throw new Error("The bundled server is missing node_modules/next.");
  }
};
