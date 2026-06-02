const express = require('express');
const router = express.Router();
const { db } = require('../lib/db');
const { genId, formatCurrentDate } = require('../lib/utils');

router.get('/', (req, res) => {
  db.all('SELECT * FROM leads ORDER BY sort_order ASC, id ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { name, company, source, stage } = req.body;
  const id = req.body.id || genId();
  const value = req.body.value || 0;
  const date = req.body.date || formatCurrentDate();
  const sort_order = req.body.sort_order !== undefined ? req.body.sort_order : 0;
  const temperature = req.body.temperature || '';
  const phone = req.body.phone || '';
  const priority = req.body.priority || '';
  const custom_notes = req.body.custom_notes || '';
  
  if (!name || !company || !source || !stage) {
    return res.status(400).json({ error: 'Required fields are missing (name, company, source, stage)' });
  }
  db.run(
    'INSERT INTO leads (id, name, company, value, source, stage, date, sort_order, temperature, phone, priority, custom_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, company, value, source, stage, date, sort_order, temperature, phone, priority, custom_notes],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id, name, company, value, source, stage, date, sort_order, temperature, phone, priority, custom_notes });
    }
  );
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, company, value, source, stage, sort_order, temperature, phone, priority, custom_notes } = req.body;
  
  if (!name || !company || value === undefined || !source || !stage) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios (name, company, value, source, stage)' });
  }

  db.get('SELECT id FROM leads WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Lead não encontrado' });

    const targetSortOrder = sort_order !== undefined ? sort_order : (row.sort_order || 0);
    const targetTemp = temperature !== undefined ? temperature : (row.temperature || '');
    const targetPhone = phone !== undefined ? phone : (row.phone || '');
    const targetPriority = priority !== undefined ? priority : (row.priority || '');
    const targetNotes = custom_notes !== undefined ? custom_notes : (row.custom_notes || '');

    db.run(
      'UPDATE leads SET name = ?, company = ?, value = ?, source = ?, stage = ?, sort_order = ?, temperature = ?, phone = ?, priority = ?, custom_notes = ? WHERE id = ?',
      [name, company, value, source, stage, targetSortOrder, targetTemp, targetPhone, targetPriority, targetNotes, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Lead updated successfully' });
      }
    );
  });
});

router.post('/reorder', (req, res) => {
  const { orders } = req.body; // Array de { id, stage, sort_order }
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ error: 'Orders array is required' });
  }
  
  const stmt = db.prepare('UPDATE leads SET stage = ?, sort_order = ? WHERE id = ?');
  db.serialize(() => {
    orders.forEach(item => {
      stmt.run([item.stage, item.sort_order, item.id]);
    });
    stmt.finalize((err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Leads reordered successfully' });
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM leads WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    res.json({ message: 'Lead deleted successfully' });
  });
});

module.exports = router;
