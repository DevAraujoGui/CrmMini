const express = require('express');
const router = express.Router();
const { db } = require('../lib/db');
const { genId } = require('../lib/utils');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }
    res.json(user);
  });
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const id = req.body.id || genId();
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required (name, email, password)' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'E-mail já cadastrado' });

    db.run(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email, password],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id, name, email });
      }
    );
  });
});

module.exports = router;
