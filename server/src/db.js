import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database lives in server/data/ (gitignored, created on first run)
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH || join(dataDir, 'hermes-todo.db');
const db = new Database(dbPath);

// Foreign keys + WAL for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'in_progress', 'done')),
    priority    TEXT    NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low', 'medium', 'high')),
    due_date    TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
`);

// Prepared statements (compiled once, reused)
export const stmts = {
  list: db.prepare(`
    SELECT id, title, description, status, priority, due_date, created_at, updated_at
    FROM tasks
    ORDER BY
      CASE status
        WHEN 'in_progress' THEN 0
        WHEN 'pending'     THEN 1
        WHEN 'done'        THEN 2
      END,
      CASE priority
        WHEN 'high'   THEN 0
        WHEN 'medium' THEN 1
        WHEN 'low'    THEN 2
      END,
      datetime(due_date) ASC NULLS LAST,
      datetime(created_at) DESC
  `),

  get: db.prepare(`
    SELECT id, title, description, status, priority, due_date, created_at, updated_at
    FROM tasks WHERE id = ?
  `),

  create: db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date)
    VALUES (@title, @description, @status, @priority, @due_date)
  `),

  update: db.prepare(`
    UPDATE tasks
    SET title       = @title,
        description = @description,
        status      = @status,
        priority    = @priority,
        due_date    = @due_date,
        updated_at  = datetime('now')
    WHERE id = @id
  `),

  patch: db.prepare(`
    UPDATE tasks
    SET title       = COALESCE(@title,       title),
        description = COALESCE(@description, description),
        status      = COALESCE(@status,      status),
        priority    = COALESCE(@priority,    priority),
        due_date    = COALESCE(@due_date,    due_date),
        updated_at  = datetime('now')
    WHERE id = @id
  `),

  // Helper: every COALESCE(@field, …) must receive a bound value, even if null.
  // better-sqlite3 named parameters are strict — missing keys throw.
  patchBind(row) {
    return {
      title:       row.title       ?? null,
      description: row.description ?? null,
      status:      row.status      ?? null,
      priority:    row.priority    ?? null,
      due_date:    row.due_date    ?? null,
      id:          row.id,
    };
  },

  delete: db.prepare(`DELETE FROM tasks WHERE id = ?`),

  stats: db.prepare(`
    SELECT
      COUNT(*)                                                    AS total,
      SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END)     AS pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)     AS in_progress,
      SUM(CASE WHEN status = 'done'        THEN 1 ELSE 0 END)     AS done,
      SUM(CASE WHEN priority = 'high'      THEN 1 ELSE 0 END)     AS high_priority,
      SUM(CASE WHEN due_date IS NOT NULL
               AND date(due_date) < date('now')
               AND status != 'done'          THEN 1 ELSE 0 END)   AS overdue
    FROM tasks
  `),
};

export default db;
