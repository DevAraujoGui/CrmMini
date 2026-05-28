const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

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
        date TEXT NOT NULL
      )
    `);

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
          { id: 'lead1', name: 'João Silva', company: 'Tech Solutions LTDA', value: 12000, source: 'whatsapp', stage: 'new', date: 'Abr 6' },
          { id: 'lead2', name: 'Maria Oliveira', company: 'Unichristus', value: 8500, source: 'instagram', stage: 'new', date: 'Abr 4' },
          { id: 'lead3', name: 'Carlos Santos', company: 'Construtora XYZ', value: 45000, source: 'facebook', stage: 'negotiating', date: 'Mai 9' }
        ];

        const stmt = db.prepare("INSERT INTO leads (id, name, company, value, source, stage, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
        initialLeads.forEach(lead => {
          stmt.run([lead.id, lead.name, lead.company, lead.value, lead.source, lead.stage, lead.date]);
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
  db.all('SELECT * FROM leads', [], (err, rows) => {
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
  if (!name || !company || !source || !stage) {
    return res.status(400).json({ error: 'Required fields are missing (name, company, source, stage)' });
  }
  db.run(
    'INSERT INTO leads (id, name, company, value, source, stage, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, company, value, source, stage, date],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id, name, company, value, source, stage, date });
    }
  );
});

app.put('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { name, company, value, source, stage } = req.body;
  
  if (!name || !company || value === undefined || !source || !stage) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios (name, company, value, source, stage)' });
  }

  db.get('SELECT id FROM leads WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Lead não encontrado' });

    db.run(
      'UPDATE leads SET name = ?, company = ?, value = ?, source = ?, stage = ? WHERE id = ?',
      [name, company, value, source, stage, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Lead updated successfully' });
      }
    );
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
});
