import { pool } from '../db/pool.js';

export default {
  async exportAll(req, res) {
    const { rows } = await pool.query('SELECT chordpro FROM songs ORDER BY sort_order, title');
    const text = rows.map(r => r.chordpro).join('\n\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="songbook.chordpro"');
    res.send(text);
  },
};
