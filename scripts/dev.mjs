#!/usr/bin/env node
/**
 * dev.mjs — single-command launcher for hermes-todo
 *
 * Starts the Express backend (port 3001) and the Vite frontend (port 5173)
 * simultaneously, prefixes each line with a color tag, and prints a
 * clickable hyperlink (ANSI OSC 8) to the frontend once Vite is ready.
 *
 * Why this script and not plain `concurrently`?
 *   - We want a reliable, framework-agnostic way to print a clickable URL.
 *     We listen to the child's stdout and react to Vite's "Local:" line,
 *     then re-emit a styled line with an OSC 8 hyperlink so the link is
 *     always visible regardless of the terminal width or Vite build flags.
 *   - If either child crashes we tear down the other and exit non-zero,
 *     so a half-running stack never lingers.
 *
 * Why spawn node/vite directly instead of `npm run dev`?
 *   - On systems with nvm, npm 11+ silently "promotes" to the newest
 *     installed Node when running scripts. That can cause native modules
 *     (e.g. better-sqlite3) compiled against one Node version to be
 *     loaded by another, producing a NODE_MODULE_VERSION mismatch.
 *     Running the entry point directly under the same node as the
 *     orchestrator avoids that mismatch entirely.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

// --- ANSI helpers ------------------------------------------------------------

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;

const fg = (r, g, b) => `${ESC}[38;2;${r};${g};${b}m`;
const SERVER = fg(126, 231, 135);  // lime-ish, matches the design system accent
const CLIENT = fg(120, 200, 255);  // cool blue for the client
const ACCENT = fg(197, 224, 99);  // #c5e063 — design-system lime

// OSC 8 hyperlink. Terminals that don't support it (very old ones) just
// render the visible text, which is fine.
const link = (url, label) =>
  `${ESC}]8;;${url}${ESC}\\${ACCENT}${BOLD}${label}${RESET}${ESC}]8;;${ESC}\\`;

const tag = (name, color) => `${color}${BOLD}[${name.padEnd(7)}]${RESET} `;

// --- Pre-flight --------------------------------------------------------------

const root = resolve(new URL('.', import.meta.url).pathname, '..');

function ensureDeps() {
  const missing = [];
  for (const sub of ['server', 'client']) {
    if (!existsSync(resolve(root, sub, 'node_modules'))) missing.push(sub);
  }
  if (missing.length) {
    process.stderr.write(
      `${tag('app', ACCENT)}missing dependencies in: ${missing.join(', ')}\n` +
      `${tag('app', ACCENT)}run: ${BOLD}npm run install:all${RESET}\n`,
    );
    process.exit(1);
  }
}

ensureDeps();

// --- Child management --------------------------------------------------------

/** @type {Array<{ name: string; color: string; child: import('node:child_process').ChildProcess }}> */
const procs = [];
let shuttingDown = false;
let bannerPrinted = false;
const FRONTEND_URL = 'http://localhost:5173/';

function start(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  procs.push({ name, color, child });

  const prefix = tag(name, color);

  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        process[out].write(`${prefix}${line}\n`);
        maybePrintBanner(name, line);
      }
    });
    stream.on('end', () => {
      if (buf.length) process[out].write(`${prefix}${buf}\n`);
    });
  };

  pipe(child.stdout, 'stdout');
  pipe(child.stderr, 'stderr');

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stderr.write(
      `${tag(name, color)}${DIM}exited (${reason}) — tearing down siblings${RESET}\n`,
    );
    for (const other of procs) {
      if (other.child !== child && other.child.exitCode === null) {
        other.child.kill('SIGTERM');
      }
    }
    process.exit(code ?? 1);
  });
}

function maybePrintBanner(name, line) {
  if (bannerPrinted) return;
  if (name !== 'client') return;
  // Vite prints "  ➜  Local:   http://localhost:5173/" once it's bound.
  if (!/Local:\s+https?:\/\//i.test(line)) return;
  bannerPrinted = true;
  process.stdout.write('\n');
  process.stdout.write(
    `${tag('app', ACCENT)}frontend ready → ${link(FRONTEND_URL, FRONTEND_URL)}\n`,
  );
  process.stdout.write(
    `${tag('app', ACCENT)}${DIM}API requests are proxied to http://localhost:3001 by Vite.${RESET}\n\n`,
  );
}

// --- Bootstrap ---------------------------------------------------------------

process.stdout.write(
  `${tag('app', ACCENT)}starting ${SERVER}${BOLD}server${RESET}${ACCENT} ` +
  `+ ${CLIENT}${BOLD}client${RESET}${ACCENT} (node ${process.versions.node})${RESET}\n`,
);

// Server: invoke the entrypoint directly so we use THIS node, not whatever
// `npm run` would have promoted to. `node --watch` is built into Node ≥ 18.
start(
  'server',
  SERVER,
  process.execPath,            // absolute path to the current node binary
  ['--watch', 'src/index.js'],
  resolve(root, 'server'),
);

// Client: same idea — call vite's bin directly. node_modules/.bin/vite is a
// shim that re-invokes node with the real entry; running it via the current
// node keeps everything on one ABI.
start(
  'client',
  CLIENT,
  process.execPath,
  [resolve(root, 'client/node_modules/vite/bin/vite.js')],
  resolve(root, 'client'),
);

// Forward Ctrl+C cleanly to both children
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const { child } of procs) {
      if (child.exitCode === null) child.kill(sig);
    }
  });
}
