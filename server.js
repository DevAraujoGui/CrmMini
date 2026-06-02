const express = require('express');
const path = require('path');
const cors = require('cors');
const { db } = require('./lib/db');

// Global handlers for stability & clean exits
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));
const shutdown = () => db.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route definitions
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api', require('./routes/health'));
app.get('/docs', (_, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CRMini Server running on http://localhost:${PORT}`);
  console.log('Process ID:', process.pid);
});
