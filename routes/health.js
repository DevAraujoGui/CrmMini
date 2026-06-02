const express = require('express');
const router = express.Router();
const { db } = require('../lib/db');

router.get('/health', (req, res) => {
  db.get('SELECT 1', [], (err) => {
    if (err) {
      return res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
    res.json({ status: 'ok', database: 'connected' });
  });
});

module.exports = router;
