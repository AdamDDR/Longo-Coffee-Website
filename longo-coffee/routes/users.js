const express    = require('express');
const crypto     = require('crypto');
const db         = require('../database/db');

const router = express.Router();

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function superAdminGuard(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  if (role !== 'super_admin') return res.status(403).json({ error: 'Super Admin only' });
  next();
}

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
router.get('/', superAdminGuard, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, full_name, email, role, is_active, is_flagged,
             force_password_change, temp_password, created_at
      FROM users
      ORDER BY id ASC
    `).all();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/role
// ---------------------------------------------------------------------------
router.put('/:id/role', superAdminGuard, (req, res) => {
  const { role } = req.body;
  if (!['client', 'admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ error: 'Cannot change super admin role' });

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/flag
// ---------------------------------------------------------------------------
router.put('/:id/flag', superAdminGuard, (req, res) => {
  const is_flagged = req.body.is_flagged ? 1 : 0;
  try {
    db.prepare('UPDATE users SET is_flagged = ? WHERE id = ?').run(is_flagged, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/active
// ---------------------------------------------------------------------------
router.put('/:id/active', superAdminGuard, (req, res) => {
  const is_active = req.body.is_active ? 1 : 0;
  try {
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update active status' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/temp-password
// ---------------------------------------------------------------------------
router.put('/:id/temp-password', superAdminGuard, (req, res) => {
  const { temp_password } = req.body;
  if (!temp_password || temp_password.trim().length < 6)
    return res.status(400).json({ error: 'Temporary password must be at least 6 characters' });

  try {
    const hashed = sha256(temp_password.trim());
    db.prepare(`
      UPDATE users
      SET password_hash = ?, temp_password = ?, force_password_change = 1
      WHERE id = ?
    `).run(hashed, temp_password.trim(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set temporary password' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// ---------------------------------------------------------------------------
router.delete('/:id', superAdminGuard, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ error: 'Cannot delete super admin' });

    db.prepare(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`).run(req.params.id);
    db.prepare(`DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = ?)`).run(req.params.id);
    db.prepare('DELETE FROM orders          WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM support_tickets WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users           WHERE id      = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
