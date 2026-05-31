const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// ============================================================
// GLOBAL ERROR HANDLING
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  db.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  db.close(() => {
    process.exit(0);
  });
});
// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function genId() {
  return crypto.randomBytes(8).toString('hex');
}

function formatCurrentDate() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Setup tables and initial data
function initializeDatabase() {
  db.serialize(() => {
    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Create Leads table
    db.run(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        value REAL DEFAULT 0,
        source TEXT NOT NULL,
        stage TEXT NOT NULL,
        date TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        temperature TEXT DEFAULT 'warm',
        phone TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        custom_notes TEXT DEFAULT ''
      )
    `, (err) => {
      if (!err) {
        // Ensure new columns exist if table was already created in a previous version
        db.run("ALTER TABLE leads ADD COLUMN sort_order INTEGER DEFAULT 0", () => {});
        db.run("ALTER TABLE leads ADD COLUMN temperature TEXT DEFAULT 'warm'", () => {});
        db.run("ALTER TABLE leads ADD COLUMN phone TEXT DEFAULT ''", () => {});
        db.run("ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'medium'", () => {});
        db.run("ALTER TABLE leads ADD COLUMN custom_notes TEXT DEFAULT ''", () => {});
      }
    });

    // Check if initial users exist, if not, create default
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) console.error(err);
      if (row && row.count === 0) {
        const defaultUser = {
          id: 'user_admin',
          name: 'Administrador CRM',
          email: 'admin@crmini.com',
          password: 'adminpassword'
        };
        db.run(
          "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
          [defaultUser.id, defaultUser.name, defaultUser.email, defaultUser.password],
          (err) => {
            if (err) console.error("Error creating default user:", err.message);
            else console.log("Default admin user created: admin@crmini.com / adminpassword");
          }
        );
      }
    });

    // Check if initial leads exist, if not, create defaults
    db.get("SELECT COUNT(*) as count FROM leads", (err, row) => {
      if (err) console.error(err);
      if (row && row.count === 0) {
        const initialLeads = [
          { id: 'lead1', name: 'João Silva', company: 'Tech Solutions LTDA', value: 12000, source: 'whatsapp', stage: 'new', date: 'Abr 6', sort_order: 1 },
          { id: 'lead2', name: 'Maria Oliveira', company: 'Unichristus', value: 8500, source: 'instagram', stage: 'new', date: 'Abr 4', sort_order: 2 },
          { id: 'lead3', name: 'Carlos Santos', company: 'Construtora XYZ', value: 45000, source: 'facebook', stage: 'negotiating', date: 'Mai 9', sort_order: 1 }
        ];

        const stmt = db.prepare("INSERT INTO leads (id, name, company, value, source, stage, date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        initialLeads.forEach(lead => {
          stmt.run([lead.id, lead.name, lead.company, lead.value, lead.source, lead.stage, lead.date, lead.sort_order]);
        });
        stmt.finalize(() => {
          console.log("Initial test leads added to database.");
        });
      }
    });
  });
}

// ============================================================
// AUTH API
// ============================================================
app.post('/api/auth/login', (req, res) => {
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

app.post('/api/auth/register', (req, res) => {
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

// ============================================================
// USERS API
// ============================================================
app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
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

app.put('/api/users/:id', (req, res) => {
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

app.delete('/api/users/:id', (req, res) => {
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

// ============================================================
// LEADS API
// ============================================================
app.get('/api/leads', (req, res) => {
  db.all('SELECT * FROM leads ORDER BY sort_order ASC, id ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/leads', (req, res) => {
  const { name, company, source, stage } = req.body;
  const id = req.body.id || genId();
  const value = req.body.value || 0;
  const date = req.body.date || formatCurrentDate();
  const sort_order = req.body.sort_order !== undefined ? req.body.sort_order : 0;
  const temperature = req.body.temperature || 'warm';
  const phone = req.body.phone || '';
  const priority = req.body.priority || 'medium';
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

app.put('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { name, company, value, source, stage, sort_order, temperature, phone, priority, custom_notes } = req.body;
  
  if (!name || !company || value === undefined || !source || !stage) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios (name, company, value, source, stage)' });
  }

  db.get('SELECT id FROM leads WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Lead não encontrado' });

    const targetSortOrder = sort_order !== undefined ? sort_order : (row.sort_order || 0);
    const targetTemp = temperature !== undefined ? temperature : (row.temperature || 'warm');
    const targetPhone = phone !== undefined ? phone : (row.phone || '');
    const targetPriority = priority !== undefined ? priority : (row.priority || 'medium');
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

app.post('/api/leads/reorder', (req, res) => {
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

app.delete('/api/leads/:id', (req, res) => {
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

// ============================================================
// SYSTEM HEALTH CHECK API
// ============================================================
app.get('/api/health', (req, res) => {
  db.get('SELECT 1', [], (err) => {
    if (err) {
      return res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
    res.json({ status: 'ok', database: 'connected' });
  });
});

// ============================================================
// SWAGGER INTERACT PLAYGROUND
// ============================================================
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`CRMini Server running on http://localhost:${PORT}`);
console.log('Process PID:', process.pid);
});
