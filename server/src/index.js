import express from 'express';
import cors from 'cors';
import { pool, runMigrations } from './db/pool.js';
import songsRouter from './routes/songs.js';
import setlistsRouter from './routes/setlists.js';
import adminRouter from './routes/admin.js';
import importRouter from './routes/import.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Admin auth middleware for mutations
function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  next();
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public routes
app.get('/api/songs', songsRouter.list);
app.get('/api/songs/:id', songsRouter.get);
app.get('/api/setlists', setlistsRouter.list);
app.get('/api/setlists/:id', setlistsRouter.get);
app.get('/api/export', exportRouter.exportAll);

// Admin routes
app.post('/api/admin/verify', adminRouter.verify);
app.post('/api/songs', requireAdmin, songsRouter.create);
app.put('/api/songs/:id', requireAdmin, songsRouter.update);
app.delete('/api/songs/:id', requireAdmin, songsRouter.remove);
app.post('/api/setlists', requireAdmin, setlistsRouter.create);
app.put('/api/setlists/:id', requireAdmin, setlistsRouter.update);
app.delete('/api/setlists/:id', requireAdmin, setlistsRouter.remove);
app.post('/api/import', requireAdmin, importRouter.importChordPro);

// Start
async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Songbook API listening on port ${PORT}`);
  });
}

start().catch(console.error);
