import { pool } from '../db/pool.js';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default {
  async list(req, res) {
    const { rows } = await pool.query(
      'SELECT id, name, song_ids, created_at FROM setlists ORDER BY name'
    );
    res.json(rows);
  },

  async get(req, res) {
    const { rows } = await pool.query('SELECT * FROM setlists WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Сет-лист не найден' });

    // Include full song data for the setlist
    const setlist = rows[0];
    if (setlist.song_ids.length) {
      const { rows: songs } = await pool.query(
        'SELECT * FROM songs WHERE id = ANY($1)',
        [setlist.song_ids]
      );
      // Preserve order from song_ids
      const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
      setlist.songs = setlist.song_ids.map(id => songMap[id]).filter(Boolean);
    } else {
      setlist.songs = [];
    }
    res.json(setlist);
  },

  async create(req, res) {
    const { name, song_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Название обязательно' });
    const id = genId();
    const { rows } = await pool.query(
      `INSERT INTO setlists (id, name, song_ids) VALUES ($1, $2, $3) RETURNING *`,
      [id, name, song_ids || []]
    );
    res.status(201).json(rows[0]);
  },

  async update(req, res) {
    const { name, song_ids } = req.body;
    const { rows } = await pool.query(
      `UPDATE setlists SET
         name = COALESCE($2, name),
         song_ids = COALESCE($3, song_ids),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, name, song_ids]
    );
    if (!rows.length) return res.status(404).json({ error: 'Сет-лист не найден' });
    res.json(rows[0]);
  },

  async remove(req, res) {
    const { rowCount } = await pool.query('DELETE FROM setlists WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Сет-лист не найден' });
    res.json({ ok: true });
  },
};
