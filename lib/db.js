const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

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
        temperature TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        priority TEXT DEFAULT '',
        custom_notes TEXT DEFAULT ''
      )
    `, (err) => {
      if (!err) {
        // Ensure new columns exist if table was already created in a previous version
        db.run("ALTER TABLE leads ADD COLUMN sort_order INTEGER DEFAULT 0", () => {});
        db.run("ALTER TABLE leads ADD COLUMN temperature TEXT DEFAULT ''", () => {});
        db.run("ALTER TABLE leads ADD COLUMN phone TEXT DEFAULT ''", () => {});
        db.run("ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT ''", () => {});
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

module.exports = { db };
