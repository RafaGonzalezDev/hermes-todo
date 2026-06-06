#!/usr/bin/env node
/**
 * seed.mjs — populate hermes-todo with a varied set of tasks.
 *
 * Usage (from the project root):
 *   npm run seed              # add tasks to whatever is already in the DB
 *   npm run seed:fresh        # wipe the table first, then insert
 *   node scripts/seed.mjs --wipe --count=40
 *
 * Why a script and not a one-off SQL dump?
 *   - It hits the same validation path the API uses, so we know the
 *     data is shaped exactly as the app expects.
 *   - It computes "today" and offsets due dates from that, so the
 *     overdue / due-soon / done-recently distribution stays meaningful
 *     no matter when you run it.
 *
 * The default set covers every status × priority combination, plus
 * edge cases (no description, no due date, overdue, long titles, etc.)
 * so the UI's filters, badges, and sort orders all have something to
 * chew on.
 */

import { setTimeout as sleep } from 'node:timers/promises';

const API = process.env.SEED_API || 'http://localhost:3001';

function parseArgs(argv) {
  const opts = { wipe: false, count: null, baseUrl: API };
  for (const arg of argv) {
    if (arg === '--wipe') opts.wipe = true;
    else if (arg === '--fresh') opts.wipe = true;
    else if (arg.startsWith('--count=')) opts.count = Number(arg.slice(8));
    else if (arg.startsWith('--api=')) opts.baseUrl = arg.slice(6);
  }
  return opts;
}

function isoDays(delta) {
  // YYYY-MM-DD; SQLite stores the date portion, time of day is irrelevant.
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function log(...a) { process.stdout.write(`[seed] ${a.join(' ')}\n`); }

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function ping() {
  try {
    const res = await api('GET', '/api/health');
    // /api/health returns {status, service, timestamp} directly (not wrapped
    // in {data: ...} like the other routes), so we read from the root.
    if (res.status !== 'ok') throw new Error('unhealthy');
    return true;
  } catch (e) {
    process.stderr.write(`[seed] cannot reach API at ${API} — is \`npm run dev\` running?\n`);
    process.stderr.write(`[seed]   ${e.message}\n`);
    process.exit(1);
  }
}

async function wipe() {
  const { data } = await api('GET', '/api/tasks');
  const ids = data.map((t) => t.id);
  if (!ids.length) {
    log('wipe: table already empty');
    return;
  }
  log(`wipe: deleting ${ids.length} existing task(s)`);
  // Sequential to keep load on the server reasonable; the dataset is small.
  for (const id of ids) {
    await api('DELETE', `/api/tasks/${id}`);
  }
}

function buildSeed() {
  // Curated set — covers every status × priority, plus overdue, due-today,
  // and tasks without a due date. Titles/desc are project-flavored to make
  // the UI look lived-in.
  return [
    // ----- in_progress / high -----
    { title: 'Wire up /api/tasks/stats aggregation', status: 'in_progress', priority: 'high',
      description: 'Group by status and priority; include overdue count.',
      due_date: isoDays(0) },
    { title: 'Fix Vite proxy ECONNREFUSED on cold start', status: 'in_progress', priority: 'high',
      description: 'Backend boots ~150ms after Vite; show a friendly loading state instead of error.',
      due_date: isoDays(1) },
    { title: 'Design editorial hero for /index', status: 'in_progress', priority: 'high',
      description: 'Two-row section: mono index + sans 4xl title, hairline divider.',
      due_date: isoDays(2) },

    // ----- in_progress / medium -----
    { title: 'Refactor task list into virtualized rows', status: 'in_progress', priority: 'medium',
      description: 'Dataset is small now but the empty-state skeleton should be ready for 10k+ rows.',
      due_date: isoDays(3) },
    { title: 'Add dark-mode-friendly focus rings', status: 'in_progress', priority: 'medium',
      description: '2px lime outline, 4px offset; verify on inputs and buttons.',
      due_date: isoDays(5) },
    { title: 'Write docstring for validateTaskPayload', status: 'in_progress', priority: 'medium',
      due_date: isoDays(7) },

    // ----- pending / high -----
    { title: 'Migrate SQLite to Postgres', status: 'pending', priority: 'high',
      description: 'Postpone until we actually need concurrent writers. SQLite is fine for v1.',
      due_date: isoDays(14) },
    { title: 'Ship the /api/tasks/stats endpoint', status: 'pending', priority: 'high',
      description: 'Used by the dashboard. Returns total / pending / in_progress / done / high_priority / overdue.',
      due_date: isoDays(1) },
    { title: 'Add OpenAPI spec', status: 'pending', priority: 'high',
      due_date: isoDays(21) },

    // ----- pending / medium -----
    { title: 'Add keyboard shortcuts', status: 'pending', priority: 'medium',
      description: 'n = new, / = search, j/k = move selection, Enter = open, Esc = close.',
      due_date: isoDays(4) },
    { title: 'Empty state illustration', status: 'pending', priority: 'medium',
      description: 'Mono line drawing in lime accent.', due_date: isoDays(10) },
    { title: 'Tasks filtering by priority and status', status: 'pending', priority: 'medium',
      due_date: isoDays(6) },
    { title: 'Responsive layout for < 768px', status: 'pending', priority: 'medium',
      due_date: isoDays(8) },
    { title: 'Bulk select + bulk delete', status: 'pending', priority: 'medium',
      due_date: isoDays(12) },

    // ----- pending / low -----
    { title: 'Add favicon set', status: 'pending', priority: 'low',
      due_date: isoDays(20) },
    { title: 'Write a CHANGELOG.md', status: 'pending', priority: 'low' },
    { title: 'Investigate Framer Motion vs. CSS transitions', status: 'pending', priority: 'low',
      description: 'Current CSS-only approach is fine for now; revisit if we add choreographed sequences.' },

    // ----- done / high -----
    { title: 'Set up root package.json orchestrator', status: 'done', priority: 'high',
      description: 'Single `npm run dev` to boot server + client with a clickable frontend URL.',
      due_date: isoDays(-1) },
    { title: 'Extract design tokens from personal-portfolio', status: 'done', priority: 'high',
      description: 'colors.css, typography.css, spacing.css. Accent #c5e063, Inter + JetBrains Mono.',
      due_date: isoDays(-2) },
    { title: 'Decide on dark editorial aesthetic', status: 'done', priority: 'high' },

    // ----- done / medium -----
    { title: 'Vite + React 19 baseline', status: 'done', priority: 'medium',
      description: 'Vite 7, React 19.1, plugin-react 4.3.', due_date: isoDays(-3) },
    { title: 'Express 5 + better-sqlite3 wired', status: 'done', priority: 'medium',
      due_date: isoDays(-4) },
    { title: 'CORS allow-all for dev', status: 'done', priority: 'medium',
      description: 'Vite proxy handles the real path; CORS is a safety net.',
      due_date: isoDays(-5) },
    { title: 'Health endpoint /api/health', status: 'done', priority: 'medium',
      due_date: isoDays(-5) },

    // ----- done / low -----
    { title: 'Decide on naming: hermes-todo', status: 'done', priority: 'low',
      due_date: isoDays(-7) },
    { title: 'README first draft', status: 'done', priority: 'low',
      due_date: isoDays(-6) },

    // ----- overdue (still pending or in_progress) -----
    { title: 'Audit log table for task mutations', status: 'pending', priority: 'medium',
      description: 'Overdue: was due 3 days ago. Punted to next iteration.',
      due_date: isoDays(-3) },
    { title: 'Update Node version in CI', status: 'in_progress', priority: 'high',
      description: 'Overdue — Node 22 EOL April 2026, must move to 24.',
      due_date: isoDays(-2) },
    { title: 'Triage accessibility warnings from axe-core', status: 'pending', priority: 'high',
      description: '2 critical, 4 serious — overdue since last week.',
      due_date: isoDays(-5) },

    // ----- misc edge cases -----
    { title: 'Quick win: surface "last updated" relative time', status: 'pending', priority: 'low',
      description: 'Tiny UX polish. "2h ago", "yesterday", etc.' },
    { title: 'Investigate why React 19 strict-mode double-invokes effects in dev', status: 'pending', priority: 'low',
      description: 'Likely just need to verify our fetch effect has a clean abort path.' },
    { title: 'Roadmap item: multi-board support', status: 'pending', priority: 'low',
      description: 'Would need a `boards` table and a board_id FK on tasks. Not in v1 scope.' },
  ];
}

async function insertAll(tasks) {
  let ok = 0, fail = 0;
  for (const t of tasks) {
    try {
      await api('POST', '/api/tasks', t);
      ok++;
    } catch (e) {
      fail++;
      process.stderr.write(`[seed]   ✗ ${t.title}: ${e.message}\n`);
    }
  }
  return { ok, fail };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  log(`target: ${API}`);

  await ping();
  log('API reachable');

  if (opts.wipe) await wipe();

  const seed = buildSeed();
  const tasks = opts.count ? seed.slice(0, opts.count) : seed;
  log(`inserting ${tasks.length} task(s)`);

  const { ok, fail } = await insertAll(tasks);
  log(`done — ${ok} inserted${fail ? `, ${fail} failed` : ''}`);

  // Brief stats summary so the user can sanity-check from the terminal.
  await sleep(50);
  const stats = await api('GET', '/api/tasks/stats');
  const s = stats.data;
  log(`stats: total=${s.total}  pending=${s.pending}  in_progress=${s.in_progress}  ` +
      `done=${s.done}  high=${s.high_priority}  overdue=${s.overdue}`);

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`[seed] fatal: ${e.stack || e.message}\n`);
  process.exit(1);
});
