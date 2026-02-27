import { pool } from '../db/pool.js';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseChordProMeta(text) {
  const meta = { title: '', artist: '', key: '' };
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^\{(title|t|artist|a|key)\s*:\s*(.+?)\}$/i);
    if (m) {
      const d = m[1].toLowerCase();
      if (d === 't' || d === 'title') meta.title = m[2];
      else if (d === 'a' || d === 'artist') meta.artist = m[2];
      else if (d === 'key') meta.key = m[2];
    }
  }
  return meta;
}

function splitSongs(text) {
  // Split by {title:} or {t:} directives
  const parts = text.split(/(?=\{(?:title|t)\s*:)/i).filter(s => s.trim());
  return parts;
}

export default {
  async importChordPro(req, res) {
    const { text, tags } = req.body;
    if (!text) return res.status(400).json({ error: 'Текст обязателен' });

    const parts = splitSongs(text);
    const imported = [];

    for (const part of parts) {
      const meta = parseChordProMeta(part);
      const title = meta.title || 'Без названия';
      const id = genId();

      const { rows } = await pool.query(
        `INSERT INTO songs (id, title, artist, key, chordpro, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title`,
        [id, title, meta.artist, meta.key, part.trim(), tags || []]
      );
      imported.push(rows[0]);
    }

    res.status(201).json({ imported, count: imported.length });
  },
};
