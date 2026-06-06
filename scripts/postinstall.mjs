#!/usr/bin/env node
/**
 * postinstall.mjs — installed automatically by `npm install` at the root.
 *
 * Why this exists
 * ---------------
 * `better-sqlite3` ships prebuilt binaries via `prebuild-install`. The
 * prebuild on npm happens to target Node 22 (MODULE_VERSION 127), but the
 * version of node that `npm run dev` actually uses depends on the user's
 * environment — on systems with nvm and npm ≥ 11, npm silently promotes
 * scripts to the highest installed Node. If the runtime Node is 24 (137),
 * the prebuilt binary won't load.
 *
 * Compiling natively takes ~30–50s and depends on a C++ toolchain, so we
 * don't want to force it unconditionally. Instead we check at install time:
 * if `node` (i.e. what npm will use for lifecycle scripts) is a different
 * ABI version than what `better-sqlite3` was last built for, we rebuild it
 * from source. Silent and idempotent.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const serverDir = resolve(root, 'server');
const bsqlDir = resolve(serverDir, 'node_modules/better-sqlite3');

function log(msg) {
  process.stdout.write(`[postinstall] ${msg}\n`);
}

function skip(reason) {
  log(`skip — ${reason}`);
}

if (!existsSync(bsqlDir)) {
  return skip('better-sqlite3 not installed yet (run install:all to fetch it)');
}

// What ABI does the runtime node use?
const runtimeNode = process.execPath;
const runtimeVersion = spawnSync(runtimeNode, ['-p', 'process.versions.modules'], {
  encoding: 'utf8',
}).stdout.trim();

// What ABI is the prebuilt/compiled binary currently built for? We don't
// have that header on disk, but we can attempt a require and inspect the
// error message — it includes the required vs. found MODULE_VERSIONs.
const probe = `
  try {
    require('better-sqlite3');
    process.stdout.write('OK');
  } catch (e) {
    const m = String(e && e.message || e);
    process.stdout.write('FAIL ' + m);
  }
`;

const probeResult = spawnSync(
  runtimeNode,
  ['-e', probe, '--eval-cwd=' + serverDir],
  { encoding: 'utf8' },
).stdout.trim();

if (probeResult === 'OK') {
  return skip(`binary matches runtime (ABI ${runtimeVersion})`);
}

const mismatch = probeResult.match(/NODE_MODULE_VERSION (\d+)/g) || [];
if (mismatch.length < 2) {
  return skip(`could not parse ABI from probe: ${probeResult.slice(0, 80)}`);
}

const required = mismatch[0].match(/(\d+)/)[1];
const found = mismatch[1].match(/(\d+)/)[1];

if (required === found) {
  return skip(`binary matches runtime (ABI ${required})`);
}

log(`ABI mismatch — binary is built for ${required}, runtime needs ${found}.`);
log(`rebuilding better-sqlite3 from source (this takes ~30s)...`);

const rebuild = spawnSync(
  runtimeNode,
  [resolve(root, 'node_modules/npm/bin/npm-cli.js'), 'install', '--build-from-source', '--foreground-scripts'],
  { cwd: serverDir, stdio: 'inherit', env: { ...process.env, npm_config_build_from_source: 'true' } },
);

if (rebuild.status !== 0) {
  process.stderr.write(`[postinstall] rebuild failed — see errors above.\n`);
  process.exit(rebuild.status ?? 1);
}

// Verify
const verify = spawnSync(runtimeNode, ['-e', probe, '--eval-cwd=' + serverDir], { encoding: 'utf8' }).stdout.trim();
if (verify !== 'OK') {
  process.stderr.write(`[postinstall] rebuild succeeded but binary still fails: ${verify}\n`);
  process.exit(1);
}
log(`rebuild ok — better-sqlite3 now matches runtime ABI ${found}.`);
