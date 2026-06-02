const express = require('express');
const router = express.Router();
const { db } = require('../lib/db');
const { genId } = require('../lib/utils');

router.get('/', (req, res) => {
  db.all('SELECT id, name, email FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { name, email, password } = req.body;
  const id = req.body.id || genId();
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required (name, email, password)' });
  }
  db.run(
    'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
    [id, name, email, password],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id, name, email });
    }
  );
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios (name, email, password)' });
  }

  db.get('SELECT id FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' });

    db.run(
      'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
      [name, email, password, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User updated successfully' });
      }
    );
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;
