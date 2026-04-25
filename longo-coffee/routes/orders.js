const express    = require('express');
const db         = require('../database/db');
const auth       = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const restoreStock = db.transaction((orderId) => {
  const items   = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
  const restore = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
  for (const item of items) restore.run(item.quantity, item.product_id);
});

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  try {
    const userId  = req.session.user.id;
    const role    = req.session.user.role;
    const isAdmin = role === 'admin' || role === 'super_admin';

    let orders;
    if (isAdmin) {
      orders = db.prepare(`
        SELECT o.*, u.full_name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `).all();
    } else {
      orders = db.prepare(`
        SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
      `).all(userId);

      const getItems = db.prepare(`
        SELECT oi.*, p.name as product_name, p.image_path as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `);

      orders.forEach(order => {
        order.items = getItems.all(order.id);
        if (order.shipping_address_snapshot) {
          try   { order.shipping_address = JSON.parse(order.shipping_address_snapshot); }
          catch { order.shipping_address = order.shipping_address_snapshot; }
        }
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
// Full order detail: items + parsed shipping address
router.get('/:id', auth, (req, res) => {
  const id      = parseInt(req.params.id);
  const userId  = req.session.user.id;
  const role    = req.session.user.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  try {
    const order = isAdmin
      ? db.prepare(`
          SELECT o.*, u.full_name as customer_name, u.email as customer_email
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.id = ?
        `).get(id)
      : db.prepare(`
          SELECT o.*, u.full_name as customer_name, u.email as customer_email
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.id = ? AND o.user_id = ?
        `).get(id, userId);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Parse shipping address
    if (order.shipping_address_snapshot) {
      try   { order.shipping_address = JSON.parse(order.shipping_address_snapshot); }
      catch { order.shipping_address = { address: order.shipping_address_snapshot }; }
    }

    // Attach items with product names
    order.items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.image_path as product_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(id);

    res.json(order);
  } catch (err) {
    console.error('Error fetching order detail:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { items, shipping_address, payment_method, guest_email, guest_name, guest_phone } = req.body;
  let userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    if (!guest_email || !guest_name) {
      return res.status(400).json({ error: 'Name and email are required for guest checkout' });
    }

    const email = guest_email.toLowerCase().trim();
    const phone = guest_phone ? guest_phone.replace(/^\+20/, '').replace(/\s/g, '').trim() : null;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      userId = existing.id;
      db.prepare('UPDATE users SET full_name = COALESCE(full_name, ?), phone = COALESCE(phone, ?) WHERE id = ?').run(guest_name, phone, userId);
    } else {
      const info = db.prepare(`INSERT INTO users (full_name, email, phone, role, is_guest, password_hash) VALUES (?, ?, ?, 'client', 1, '')`).run(guest_name, email, phone);
      userId = info.lastInsertRowid;
    }
  }

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Order must contain items' });
  }

  const validMethods = ['cod', 'online'];
  const method = validMethods.includes(payment_method) ? payment_method : 'cod';

  try {
    const createOrderTx = db.transaction(() => {
      let totalEgp = 0;

      for (const item of items) {
        const product = db.prepare('SELECT price_egp, stock_qty FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw new Error(`Product ${item.product_id} not found`);
        if (product.stock_qty < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id}`);
        totalEgp += product.price_egp * item.quantity;
      }

      const addressSnapshot = typeof shipping_address === 'object'
        ? JSON.stringify(shipping_address)
        : shipping_address;

      const orderInfo = db.prepare(`
        INSERT INTO orders (user_id, status, payment_method, shipping_address_snapshot, total_egp)
        VALUES (?, 'Pending', ?, ?, ?)
      `).run(userId, method, addressSnapshot || '{}', totalEgp);

      const orderId     = orderInfo.lastInsertRowid;
      const itemInsert  = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase_egp) VALUES (?, ?, ?, ?)`);
      const updateStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');

      for (const item of items) {
        const product = db.prepare('SELECT price_egp FROM products WHERE id = ?').get(item.product_id);
        itemInsert.run(orderId, item.product_id, item.quantity, product.price_egp);
        updateStock.run(item.quantity, item.product_id);
      }

      return orderId;
    });

    const newOrderId = createOrderTx();
    res.status(201).json({ success: true, order_id: newOrderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// ── PUT /api/orders/:id/status (Admin only) ───────────────────────────────────
router.put('/:id/status', adminGuard, (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      restoreStock(id);
    }

    if (order.status === 'Cancelled' && status !== 'Cancelled') {
      const items  = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id);
      const deduct = db.prepare('UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?');
      for (const item of items) deduct.run(item.quantity, item.product_id);
    }

    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── PUT /api/orders/:id/cancel (Client cancels their own order) ───────────────
router.put('/:id/cancel', auth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    const order = db.prepare('SELECT status, user_id FROM orders WHERE id = ?').get(id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ error: 'You do not have permission to cancel this order' });
    if (order.status !== 'Pending' && order.status !== 'Processing') {
      return res.status(400).json({ error: 'Only Pending or Processing orders can be cancelled' });
    }

    restoreStock(id);
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Cancelled', id);
    res.json({ success: true, status: 'Cancelled' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
