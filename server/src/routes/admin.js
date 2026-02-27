export default {
  verify(req, res) {
    const password = req.body.password || req.headers['x-admin-password'];
    if (password === process.env.ADMIN_PASSWORD) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: 'Неверный пароль' });
    }
  },
};
