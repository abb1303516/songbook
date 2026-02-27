import { pool } from '../db/pool.js';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default {
  async list(req, res) {
    const { rows } = await pool.query(
      'SELECT id, title, artist, key, tags, sort_order, created_at FROM songs ORDER BY sort_order, title'
    );
    res.json(rows);
  },

  async get(req, res) {
    const { rows } = await pool.query('SELECT * FROM songs WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Песня не найдена' });
    res.json(rows[0]);
  },

  async create(req, res) {
    const { title, artist, key, chordpro, tags } = req.body;
    if (!title || !chordpro) {
      return res.status(400).json({ error: 'Название и текст обязательны' });
    }
    const id = genId();
    const { rows } = await pool.query(
      `INSERT INTO songs (id, title, artist, key, chordpro, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, title, artist || '', key || '', chordpro, tags || []]
    );
    res.status(201).json(rows[0]);
  },

  async update(req, res) {
    const { title, artist, key, chordpro, tags, sort_order } = req.body;
    const { rows } = await pool.query(
      `UPDATE songs SET
         title = COALESCE($2, title),
         artist = COALESCE($3, artist),
         key = COALESCE($4, key),
         chordpro = COALESCE($5, chordpro),
         tags = COALESCE($6, tags),
         sort_order = COALESCE($7, sort_order),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, title, artist, key, chordpro, tags, sort_order]
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
