import express from 'express';
import cors from 'cors';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '64kb' }));

// Request log (compact, terminal-friendly)
app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.path}`);
  next();
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hermes-todo', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/tasks', tasksRouter);

// 404 for unknown /api/* routes
app.use('/api', (_req, res) => res.status(404).json({ error: 'route not found' }));

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err && err.stack ? err.stack : err);
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  res.status(500).json({ error: 'internal server error', detail: err && err.message });
});

app.listen(PORT, () => {
  console.log(`hermes-todo server listening on http://localhost:${PORT}`);
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/tasks`);
  console.log(`   POST   /api/tasks`);
  console.log(`   PATCH  /api/tasks/:id`);
  console.log(`   DELETE /api/tasks/:id`);
  console.log(`   GET    /api/tasks/stats`);
});
