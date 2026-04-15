import { pool } from '../db/pool.js';

export default {
  async get(req, res) {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'global'");
    res.json(rows[0]?.value || {});
  },

  async update(req, res) {
    const value = req.body;
    const { rows } = await pool.query(
      "UPDATE settings SET value = $1 WHERE key = 'global' RETURNING value",
      [JSON.stringify(value)]
    );
    if (!rows.length) {
      // Insert if not exists
      const { rows: inserted } = await pool.query(
        "INSERT INTO settings (key, value) VALUES ('global', $1) RETURNING value",
        [JSON.stringify(value)]
      );
      return res.json(inserted[0].value);
    }
    res.json(rows[0].value);
  },
};
