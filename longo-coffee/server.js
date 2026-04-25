require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const fs      = require('fs');

const BetterSQLite3Store = require('better-sqlite3-session-store')(session);
const db = require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Run DB migration (safe on every restart)
// ---------------------------------------------------------------------------
try { db.exec(`ALTER TABLE users ADD COLUMN temp_password         TEXT    DEFAULT NULL`);  } catch (_) {}
try { db.exec(`ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0`);     } catch (_) {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_reset_requests (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      resolved   INTEGER DEFAULT 0,
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);
} catch (_) {}
try { db.exec(`ALTER TABLE admin_reset_requests ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`); } catch (_) {}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new BetterSQLite3Store({ client: db }),
  secret: process.env.SESSION_SECRET || 'longo-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ---------------------------------------------------------------------------
// API Routes
// NOTE: more-specific mounts MUST come before /api/admin
// ---------------------------------------------------------------------------
const authRoutes           = require('./routes/auth');
const productRoutes        = require('./routes/products');
const orderRoutes          = require('./routes/orders');
const ticketRoutes         = require('./routes/tickets');
const adminDashboardRoutes = require('./routes/admin-dashboard');
const adminRoutes          = require('./routes/admin');
const usersRoutes          = require('./routes/users');

app.get('/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.use('/auth',                 authRoutes);
app.use('/api/products',         productRoutes);
app.use('/api/orders',           orderRoutes);
app.use('/api/tickets',          ticketRoutes);
app.use('/api/contact',          ticketRoutes);
app.use('/api/admin/users',      usersRoutes);
app.use('/api/admin/dashboard',  adminDashboardRoutes);
app.use('/api/admin',            adminRoutes);

// ---------------------------------------------------------------------------
// Public Policies API
// ---------------------------------------------------------------------------
app.get('/api/policies', (req, res) => {
  try {
    const rows   = db.prepare('SELECT * FROM policies').all();
    const result = {};
    rows.forEach(row => { result[row.key] = row; });
    res.json(result);
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// ---------------------------------------------------------------------------
// Page Routes — Client
// ---------------------------------------------------------------------------
app.get('/',                (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'homepage.html')));
app.get('/shop',            (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'shop.html')));
app.get('/contact',         (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'contact.html')));
app.get('/profile',         (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'profile.html')));
app.get('/product/:id',     (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'product.html')));
app.get('/cart',            (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'cart.html')));
app.get('/auth',            (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'auth.html')));
app.get('/policies',        (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'policies.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'forgot-password.html')));
app.get('/reset-password',  (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'reset-password.html')));
app.get('/checkout',        (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'checkout.html')));
app.get('/ticket/:id',      (req, res) => res.sendFile(path.join(__dirname, 'views', 'client', 'ticket.html')));

app.get('/views/client/:page', (req, res) => {
  const filePath = path.join(__dirname, 'views', 'client', req.params.page);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Page not found');
});

// ---------------------------------------------------------------------------
// Page Routes — Admin
// ---------------------------------------------------------------------------
const adminGuard          = require('./middleware/adminGuard');
const { superAdminGuard } = require('./middleware/adminGuard');

app.get('/admin/change-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'change-password.html'));
});

app.get('/admin/users', adminGuard, superAdminGuard, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'users.html'));
});

app.get('/admin/:page', adminGuard, (req, res) => {
  const page     = req.params.page.endsWith('.html') ? req.params.page : req.params.page + '.html';
  const filePath = path.join(__dirname, 'views', 'admin', page);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Page not found');
});

// ---------------------------------------------------------------------------
// Uploads directory
// ---------------------------------------------------------------------------
const uploadsDir = path.join(__dirname, 'public', 'assets', 'images');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('\n  ☕ Longo Coffee is running at http://localhost:' + PORT + '\n');
  console.log('  Client:  http://localhost:' + PORT);
  console.log('  Admin:   http://localhost:' + PORT + '/admin/dashboard');
  console.log('  ---');
});
