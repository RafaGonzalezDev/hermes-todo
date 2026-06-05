import { Router } from 'express';
import { stmts } from '../db.js';
import { validateTaskPayload } from '../validation.js';

const router = Router();

// GET /api/tasks — list with optional ?status=&priority= filters
router.get('/', (req, res) => {
  const all = stmts.list.all();
  const { status, priority } = req.query;
  const filtered = all.filter((t) => {
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    return true;
  });
  res.json({ data: filtered, count: filtered.length });
});

// GET /api/tasks/stats — aggregates (defined before /:id to avoid collision)
router.get('/stats', (_req, res) => {
  const row = stmts.stats.get();
  res.json({
    data: {
      total: row.total ?? 0,
      pending: row.pending ?? 0,
      in_progress: row.in_progress ?? 0,
      done: row.done ?? 0,
      high_priority: row.high_priority ?? 0,
      overdue: row.overdue ?? 0,
    },
  });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const task = stmts.get.get(id);
  if (!task) return res.status(404).json({ error: 'task not found' });
  res.json({ data: task });
});

// POST /api/tasks — create
router.post('/', (req, res) => {
  const { errors, data } = validateTaskPayload(req.body, { partial: false });
  if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });

  const info = stmts.create.run(data);
  const created = stmts.get.get(info.lastInsertRowid);
  res.status(201).json({ data: created });
});

// PATCH /api/tasks/:id — partial update
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const existing = stmts.get.get(id);
  if (!existing) return res.status(404).json({ error: 'task not found' });

  const { errors, data } = validateTaskPayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });

  const info = stmts.patch.run(stmts.patchBind({ ...data, id }));
  if (info.changes === 0) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.json({ data: stmts.get.get(id) });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const info = stmts.delete.run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.status(204).end();
});

export default router;
