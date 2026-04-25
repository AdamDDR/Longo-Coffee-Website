const express  = require('express');
const crypto   = require('crypto');
const db       = require('../database/db');

const router = express.Router();

// ── Helper ────────────────────────────────────────────────────────────────────
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

function validatePassword(pw) {
  if (!pw || pw.length < 8)  return 'Password must be at least 8 characters long';
  if (!SPECIAL_RE.test(pw))  return 'Password must contain at least 1 special character';
  return null;
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = db.prepare(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)'
    ).get(email.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Guest accounts cannot log in with a password
    if (user.is_guest) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const hash = sha256(password);
    if (user.password_hash !== hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
      id:                    user.id,
      name:                  user.full_name,
      email:                 user.email,
      role:                  user.role,
      force_password_change: !!user.force_password_change
    };

    if (user.force_password_change) {
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      return res.json({
        success:  true,
        redirect: isAdmin ? '/admin/change-password' : '/change-password'
      });
    }

    let redirect = '/';
    if (user.role === 'admin' || user.role === 'super_admin') {
      redirect = '/admin/dashboard';
    }

    res.json({ success: true, redirect });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required' });
  }

  if (!fullName.trim().includes(' ')) {
    return res.status(400).json({ error: 'Please enter both your first and last name' });
  }

  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const existing = db.prepare(
      'SELECT id, is_guest FROM users WHERE LOWER(email) = LOWER(?)'
    ).get(email.trim());

    if (existing) {
      if (existing.is_guest) {
        // ── Guest upgrade: set password and promote to real account ──────────
        const hash = sha256(password);
        db.prepare(`
          UPDATE users
          SET password_hash = ?,
              full_name     = COALESCE(NULLIF(full_name, ''), ?),
              is_guest      = 0
          WHERE id = ?
        `).run(hash, fullName.trim(), existing.id);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);

        req.session.user = {
          id:                    user.id,
          name:                  user.full_name,
          email:                 user.email,
          role:                  user.role,
          force_password_change: false
        };

        return res.status(201).json({ success: true, redirect: '/' });
      }

      // Real account already exists
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    // ── Fresh registration ────────────────────────────────────────────────────
    const hash = sha256(password);
    const info = db.prepare(
      "INSERT INTO users (full_name, email, password_hash, role, is_guest) VALUES (?, ?, ?, 'client', 0)"
    ).run(fullName.trim(), email.trim().toLowerCase(), hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    req.session.user = {
      id:                    user.id,
      name:                  user.full_name,
      email:                 user.email,
      role:                  user.role,
      force_password_change: false
    };

    res.status(201).json({ success: true, redirect: '/' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({ success: true, redirect: '/' });
  });
});

// ── GET /auth/logout (for href links) ────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = db.prepare(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)'
    ).get(email.trim());

    // Always respond the same way to prevent email enumeration
    if (!user || user.is_guest) {
      return res.json({ success: true });
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    if (isAdmin) {
      db.prepare('UPDATE users SET force_password_change = 1 WHERE id = ?').run(user.id);

      const existing = db.prepare(
        'SELECT id FROM admin_reset_requests WHERE user_id = ? AND resolved = 0'
      ).get(user.id);
      if (!existing) {
        db.prepare('INSERT INTO admin_reset_requests (user_id) VALUES (?)').run(user.id);
      }

      return res.json({ success: true, flow: 'admin' });
    }

    // Client flow: one-time token
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expires   = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    db.prepare(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
    ).run(tokenHash, expires, user.id);

    // In production: send email. Dev mode returns token directly.
    return res.json({ success: true, flow: 'client', resetToken: rawToken });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────────
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const pwErr = validatePassword(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const tokenHash = sha256(token);
    const user = db.prepare(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?'
    ).get(tokenHash, new Date().toISOString());

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const newHash = sha256(newPassword);
    db.prepare(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
    ).run(newHash, user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── GET /auth/profile ─────────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = db.prepare(
      'SELECT id, full_name, email, phone, role, shipping_address, created_at FROM users WHERE id = ?'
    ).get(req.session.user.id);

    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ── POST /auth/profile ────────────────────────────────────────────────────────
router.post('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { fullName, phone, shippingAddress } = req.body;
  if (!fullName) return res.status(400).json({ error: 'Full name is required' });

  try {
    db.prepare('UPDATE users SET full_name = ?, phone = ?, shipping_address = ? WHERE id = ?')
      .run(fullName.trim(), phone || null, shippingAddress || null, req.session.user.id);

    req.session.user.name = fullName.trim();
    res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── PUT /auth/profile ─────────────────────────────────────────────────────────
router.put('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { fullName, phone, shippingAddress } = req.body;
  if (!fullName) return res.status(400).json({ error: 'Full name is required' });

  try {
    db.prepare('UPDATE users SET full_name = ?, phone = ?, shipping_address = ? WHERE id = ?')
      .run(fullName.trim(), phone || null, shippingAddress || null, req.session.user.id);

    req.session.user.name = fullName.trim();
    res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── POST /auth/change-password ────────────────────────────────────────────────
router.post('/change-password', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  const pwErr = validatePassword(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const user = db.prepare('SELECT password_hash, is_guest FROM users WHERE id = ?').get(req.session.user.id);

    if (user.is_guest) {
      return res.status(403).json({ error: 'Guest accounts cannot change password. Please register first.' });
    }

    if (user.password_hash !== sha256(currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    db.prepare(
      'UPDATE users SET password_hash = ?, force_password_change = 0, temp_password = NULL WHERE id = ?'
    ).run(sha256(newPassword), req.session.user.id);

    req.session.user.force_password_change = false;
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
