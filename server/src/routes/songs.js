import { pool } from '../db/pool.js';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default {
  async list(req, res) {
    const { rows } = await pool.query(
      'SELECT id, title, artist, key, tags, status, transpose, youtube_urls, youtube_labels, sort_order, created_at FROM songs ORDER BY sort_order, title'
    );
    res.json(rows);
  },

  async get(req, res) {
    const { rows } = await pool.query('SELECT * FROM songs WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Песня не найдена' });
    res.json(rows[0]);
  },

  async create(req, res) {
    const { title, artist, key, chordpro, tags, status } = req.body;
    if (!title || !chordpro) {
      return res.status(400).json({ error: 'Название и текст обязательны' });
    }
    const id = genId();
    const { rows } = await pool.query(
      `INSERT INTO songs (id, title, artist, key, chordpro, tags, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, title, artist || '', key || '', chordpro, tags || [], status || 'new']
    );
    res.status(201).json(rows[0]);
  },

  async update(req, res) {
    const { title, artist, key, chordpro, tags, sort_order, status, youtube_urls, youtube_labels } = req.body;
    const { rows } = await pool.query(
      `UPDATE songs SET
         title = COALESCE($2, title),
         artist = COALESCE($3, artist),
         key = COALESCE($4, key),
         chordpro = COALESCE($5, chordpro),
         tags = COALESCE($6, tags),
         sort_order = COALESCE($7, sort_order),
         status = COALESCE($8, status),
         youtube_urls = COALESCE($9, youtube_urls),
         youtube_labels = COALESCE($10, youtube_labels),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, title, artist, key, chordpro, tags, sort_order, status, youtube_urls, youtube_labels]
    );
    if (!rows.length) return res.status(404).json({ error: 'Песня не найдена' });
    res.json(rows[0]);
  },

  async updateTranspose(req, res) {
    const { transpose } = req.body;
    if (typeof transpose !== 'number' || transpose < -12 || transpose > 12) {
      return res.status(400).json({ error: 'Недопустимое значение транспонирования' });
    }
    const { rows } = await pool.query(
      'UPDATE songs SET transpose = $2, updated_at = NOW() WHERE id = $1 RETURNING id, transpose',
      [req.params.id, transpose]
    );
    if (!rows.length) return res.status(404).json({ error: 'Песня не найдена' });
    res.json(rows[0]);
  },

  async updateStatus(req, res) {
    const { status } = req.body;
    if (!['new', 'learning', 'known'].includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }
    const { rows } = await pool.query(
      'UPDATE songs SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id, status',
      [req.params.id, status]
    );
    if (!rows.length) return res.status(404).json({ error: 'Песня не найдена' });
    res.json(rows[0]);
  },

  async remove(req, res) {
    const { rowCount } = await pool.query('DELETE FROM songs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Песня не найдена' });
    res.json({ ok: true });
  },
};
