const express = require('express');
const db      = require('../database/db');
const auth    = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

const router = express.Router();


// GET /api/tickets
// Admin sees all, client sees their own
router.get('/', auth, (req, res) => {
  try {
    const userId  = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'super_admin';

    let tickets;
    if (isAdmin) {
      tickets = db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC').all();
    } else {
      tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    }

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});


// GET /api/tickets/:id
// Get full ticket thread
router.get('/:id', auth, (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'super_admin';

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Clients don't see internal notes
    const msgQuery = isAdmin
      ? 'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC'
      : 'SELECT * FROM ticket_messages WHERE ticket_id = ? AND is_internal_note = 0 ORDER BY created_at ASC';

    ticket.messages = db.prepare(msgQuery).all(id);
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket thread:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});


// POST /api/tickets
// Create a new ticket — guests and logged-in users both allowed
router.post('/', (req, res) => {
  const { name, email, subject, message } = req.body;
  const userId = req.session && req.session.user ? req.session.user.id : null;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  try {
    const createTx = db.transaction(() => {
      const ticketInfo = db.prepare(`
        INSERT INTO support_tickets (user_id, subject, message, customer_name, customer_email)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, subject || 'Contact Form Submission', message, name, email);

      const ticketId = ticketInfo.lastInsertRowid;

      db.prepare(`
        INSERT INTO ticket_messages (ticket_id, sender_role, message_text)
        VALUES (?, 'client', ?)
      `).run(ticketId, message);

      return ticketId;
    });

    const id = createTx();
    res.status(201).json({ success: true, ticket_id: id });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});


// POST /api/tickets/:id/reply
// Add a message to a ticket thread (auth required)
router.post('/:id/reply', auth, (req, res) => {
  const { id }                   = req.params;
  const { message, is_internal_note } = req.body;
  const role = req.session.user.role;

  if (!message) return res.status(400).json({ error: 'Message text is required' });

  try {
    const isAdmin  = role === 'admin' || role === 'super_admin';
    const internal = (isAdmin && is_internal_note) ? 1 : 0;

    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_role, message_text, is_internal_note)
      VALUES (?, ?, ?, ?)
    `).run(id, role, message, internal);

    // Auto-update status to In Progress if admin replies to an Open ticket
    if (isAdmin) {
      db.prepare(`
        UPDATE support_tickets SET status = 'In Progress'
        WHERE id = ? AND status = 'Open'
      `).run(id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});


// PUT /api/tickets/:id/status
// Admins: change status + urgency freely
// Clients: can only close their OWN tickets
router.put('/:id/status', auth, (req, res) => {
  const { id }             = req.params;
  const { status, urgency } = req.body;
  const userId  = req.session.user.id;
  const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'super_admin';

  try {
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!isAdmin) {
      if (ticket.user_id !== userId) return res.status(403).json({ error: 'Access denied' });
      const allowed = ['Closed', 'Resolved'];
      if (!allowed.includes(status)) return res.status(403).json({ error: 'Clients can only close or resolve tickets' });
      db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, id);
      return res.json({ success: true });
    }

    if (status)  db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, id);
    if (urgency) db.prepare('UPDATE support_tickets SET urgency = ? WHERE id = ?').run(urgency, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});


module.exports = router;
