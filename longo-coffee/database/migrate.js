const db = require('./db');

try {
  // ---- Projects table ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capex_egp REAL NOT NULL DEFAULT 0,
      projected_roi_pct REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned', 'Review', 'Active', 'Completed', 'Cancelled')),
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Projects table created / verified');

  // Seed sample projects only if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM projects').get();
  if (count.c === 0) {
    const ins = db.prepare(`INSERT INTO projects (name, capex_egp, projected_roi_pct, status, notes) VALUES (?, ?, ?, ?, ?)`);
    ins.run('Roastery Expansion Phase II', 250000, 22.4, 'Active', 'Expanding roastery capacity to meet growing demand');
    ins.run('Direct Trade Partnership Program', 85000, 15.2, 'Review', 'Direct relationships with Ethiopian and Colombian farmers');
    ins.run('Retail Packaging Redesign', 45000, 9.8, 'Planned', 'Eco-friendly packaging that reinforces brand identity');
    console.log('✅ Sample projects inserted');
  } else {
    console.log('ℹ️  Projects table already has data, skipping seed');
  }

  // ---- Password reset tokens (for clients) ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ password_reset_tokens table created / verified');

  // ---- Admin reset requests (visible to super admin) ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ admin_reset_requests table created / verified');

  // ---- Add columns to users if they don't exist ----
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

  if (!userCols.includes('force_password_change')) {
    db.exec("ALTER TABLE users ADD COLUMN force_password_change INTEGER NOT NULL DEFAULT 0");
    console.log('✅ Added force_password_change column');
  }
  if (!userCols.includes('temp_password_hash')) {
    db.exec("ALTER TABLE users ADD COLUMN temp_password_hash TEXT DEFAULT NULL");
    console.log('✅ Added temp_password_hash column');
  }
  if (!userCols.includes('is_guest')) {
    db.exec("ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0");
    console.log('✅ Added is_guest column');
  }

  console.log('\n🎉 All migrations complete!');
} catch (e) {
  console.error('Migration error:', e.message);
  process.exit(1);
}
