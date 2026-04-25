const express  = require('express');
const crypto   = require('crypto');
const db       = require('../database/db');
const adminGuard = require('../middleware/adminGuard');
const { superAdminGuard } = require('../middleware/adminGuard');

const router = express.Router();
router.use(adminGuard);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ── GET /api/admin/finance ────────────────────────────────────────────────────
router.get('/finance', (req, res) => {
  try {
    const { discount_rate, horizon_years, annual_fixed_costs } = req.query;
    const r         = parseFloat(discount_rate)     || 0.10;
    const years     = parseInt(horizon_years)        || 3;
    const fixedCost = parseFloat(annual_fixed_costs) || 0;

    const revenueRow = db.prepare(`
      SELECT COALESCE(SUM(total_egp), 0) as revenue FROM orders WHERE status != 'Cancelled'
    `).get();

    const costRow = db.prepare(`
      SELECT COALESCE(SUM(p.cost_egp * oi.quantity), 0) as cost
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o   ON oi.order_id   = o.id
      WHERE o.status != 'Cancelled'
    `).get();

    const revenue = revenueRow.revenue || 0;
    const cost    = costRow.cost       || 0;
    const profit  = revenue - cost;

    const avgRow       = db.prepare(`SELECT COALESCE(AVG(total_egp), 0) as avg FROM orders WHERE status != 'Cancelled'`).get();
    const customersRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'client'`).get();
    const soldRow      = db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as total
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'Cancelled'
    `).get();

    const byMonth = db.prepare(`
      SELECT
        strftime('%Y-%m', o.created_at) as month,
        COALESCE(SUM(o.total_egp), 0) as revenue,
        COALESCE(SUM(p.cost_egp * oi.quantity), 0) as cost,
        COUNT(DISTINCT o.id) as order_count
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p     ON p.id = oi.product_id
      WHERE o.status != 'Cancelled'
      GROUP BY month ORDER BY month ASC
    `).all();

    const monthlyFixedCost = fixedCost / 12;
    byMonth.forEach(m => {
      m.gross_profit = m.revenue - m.cost;
      m.fixed_cost   = Math.round(monthlyFixedCost);
      m.net_cf       = m.gross_profit - monthlyFixedCost;
    });

    const byPayment = db.prepare(`
      SELECT payment_method, COALESCE(SUM(total_egp), 0) as revenue, COUNT(*) as count
      FROM orders WHERE status != 'Cancelled' GROUP BY payment_method
    `).all();

    const salesTrend = db.prepare(`
      SELECT DATE(o.created_at) as day,
             COALESCE(SUM(oi.quantity), 0) as units_sold,
             COALESCE(SUM(o.total_egp), 0) as revenue
      FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'Cancelled'
      GROUP BY day ORDER BY day ASC
    `).all();

    const capexRow   = db.prepare(`SELECT COALESCE(SUM(capex_egp), 0) as total FROM projects`).get();
    const totalCapex = capexRow.total || 0;

    const annualNCF     = profit - fixedCost;
    const monthlyNCF    = annualNCF / 12;
    const paybackMonths = monthlyNCF > 0 ? Math.ceil(totalCapex / monthlyNCF) : null;
    const roi           = totalCapex > 0 ? ((annualNCF - totalCapex) / totalCapex * 100) : 0;

    let npv = -totalCapex;
    for (let y = 1; y <= years; y++) {
      npv += annualNCF / Math.pow(1 + r, y);
    }

    res.json({
      revenue,
      cost,
      profit,
      avg_order_value:     avgRow.avg         || 0,
      total_customers:     customersRow.count  || 0,
      total_products_sold: soldRow.total       || 0,
      revenue_by_month:    byMonth,
      revenue_by_payment:  byPayment,
      sales_trend:         salesTrend,
      monthly_ncf:         byMonth,
      annual: {
        net_cash_flow:  annualNCF,
        npv,
        roi,
        payback_months: paybackMonths,
        total_capex:    totalCapex,
        fixed_costs:    fixedCost,
        discount_rate:  r,
        horizon_years:  years
      }
    });
  } catch (err) {
    console.error('Finance error:', err);
    res.status(500).json({ error: 'Failed to load finance data' });
  }
});

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
router.get('/analytics', (req, res) => {
  try {
    const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders`).get();
    const avgOrderVal = db.prepare(`SELECT COALESCE(AVG(total_egp), 0) as avg FROM orders WHERE status != 'Cancelled'`).get();

    const ordersByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`).all();

    const revenueByCategory = db.prepare(`
      SELECT p.category, COALESCE(SUM(oi.quantity * oi.price_at_purchase_egp), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o   ON oi.order_id   = o.id
      WHERE o.status != 'Cancelled'
      GROUP BY p.category
    `).all();

    const topProducts = db.prepare(`
      SELECT p.name, p.image_path, SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o   ON oi.order_id   = o.id
      WHERE o.status = 'Delivered'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `).all();

    const salesTrend = db.prepare(`
      SELECT DATE(o.created_at) as day,
             COALESCE(SUM(oi.quantity), 0) as units_sold,
             COALESCE(SUM(o.total_egp), 0) as revenue,
             COUNT(DISTINCT o.id) as orders
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'Cancelled'
      GROUP BY day ORDER BY day ASC
    `).all();

    const usersDay   = db.prepare(`SELECT COUNT(*) as added FROM users WHERE role = 'client' AND DATE(created_at) = DATE('now')`).get();
    const usersMonth = db.prepare(`SELECT COUNT(*) as added FROM users WHERE role = 'client' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`).get();
    const usersYear  = db.prepare(`SELECT COUNT(*) as added FROM users WHERE role = 'client' AND strftime('%Y', created_at) = strftime('%Y', 'now')`).get();

    const removedDay   = db.prepare(`SELECT COUNT(*) as removed FROM users WHERE role = 'client' AND is_active = 0 AND DATE(updated_at) = DATE('now')`).get();
    const removedMonth = db.prepare(`SELECT COUNT(*) as removed FROM users WHERE role = 'client' AND is_active = 0 AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')`).get();
    const removedYear  = db.prepare(`SELECT COUNT(*) as removed FROM users WHERE role = 'client' AND is_active = 0 AND strftime('%Y', updated_at) = strftime('%Y', 'now')`).get();

    res.json({
      kpis: {
        total_orders:    totalOrders.count || 0,
        avg_order_value: avgOrderVal.avg   || 0
      },
      orders_by_status:    ordersByStatus,
      revenue_by_category: revenueByCategory,
      top_products:        topProducts,
      sales_trend:         salesTrend,
      users: {
        day:   { added: usersDay.added   || 0, removed: removedDay.removed   || 0 },
        month: { added: usersMonth.added || 0, removed: removedMonth.removed || 0 },
        year:  { added: usersYear.added  || 0, removed: removedYear.removed  || 0 }
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
});

// ── Projects CRUD ─────────────────────────────────────────────────────────────
router.get('/projects', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()); }
  catch { res.status(500).json({ error: 'Failed to load projects' }); }
});

router.post('/projects', (req, res) => {
  const { name, capex_egp, projected_roi_pct, status, notes } = req.body;
  if (!name || capex_egp == null) return res.status(400).json({ error: 'Project name and CapEx are required' });
  try {
    const info = db.prepare(`INSERT INTO projects (name, capex_egp, projected_roi_pct, status, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(name.trim(), parseFloat(capex_egp) || 0, parseFloat(projected_roi_pct) || 0, status || 'Planned', notes || '');
    res.status(201).json({ success: true, project: db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid) });
  } catch { res.status(500).json({ error: 'Failed to create project' }); }
});

router.put('/projects/:id', (req, res) => {
  const { name, capex_egp, projected_roi_pct, status, notes } = req.body;
  if (!name || capex_egp == null) return res.status(400).json({ error: 'Project name and CapEx are required' });
  try {
    db.prepare(`UPDATE projects SET name=?, capex_egp=?, projected_roi_pct=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(name.trim(), parseFloat(capex_egp)||0, parseFloat(projected_roi_pct)||0, status||'Planned', notes||'', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update project' }); }
});

router.delete('/projects/:id', (req, res) => {
  try { db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete project' }); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  try { res.json(db.prepare('SELECT id, full_name, email, role, phone FROM users WHERE id = ?').get(req.session.user.id)); }
  catch { res.status(500).json({ error: 'Failed to load settings' }); }
});

router.post('/settings/profile', (req, res) => {
  const { fullName, phone } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: 'Full name and phone are required' });
  if (!fullName.trim().includes(' ')) return res.status(400).json({ error: 'Please provide first and last name' });
  try {
    db.prepare('UPDATE users SET full_name = ?, phone = ? WHERE id = ?').run(fullName, phone, req.session.user.id);
    req.session.user.name = fullName;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update profile' }); }
});

router.post('/settings/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.user.id);
    if (user.password_hash !== sha256(currentPassword)) return res.status(401).json({ error: 'Current password is incorrect' });
    db.prepare('UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?').run(sha256(newPassword), req.session.user.id);
    req.session.user.force_password_change = false;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to change password' }); }
});

// ── Reset Requests (super_admin only) ─────────────────────────────────────────
router.get('/reset-requests', superAdminGuard, (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT id as user_id, full_name, email, role, created_at
      FROM users
      WHERE force_password_change = 1
        AND role IN ('admin', 'super_admin')
      ORDER BY created_at DESC
    `).all());
  } catch (err) {
    console.error('RESET REQUESTS ERROR:', err.message);
    res.status(500).json({ error: 'Failed to load reset requests' });
  }
});

router.post('/reset-requests/:id/resolve', superAdminGuard, (req, res) => {
  const { tempPassword } = req.body;
  if (!tempPassword || tempPassword.length < 6) return res.status(400).json({ error: 'Temp password must be at least 6 characters' });
  try {
    const request = db.prepare('SELECT user_id FROM admin_reset_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Reset request not found' });
    const h = sha256(tempPassword);
    db.prepare('UPDATE users SET password_hash = ?, temp_password = ?, force_password_change = 1 WHERE id = ?').run(h, tempPassword, request.user_id);
    db.prepare('UPDATE admin_reset_requests SET resolved = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to resolve reset request' }); }
});

// ── Policies ──────────────────────────────────────────────────────────────────
router.get('/policies', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM policies').all();
    const result = {};
    rows.forEach(r => { result[r.key] = r; });
    res.json(result);
  } catch { res.status(500).json({ error: 'Failed to fetch policies' }); }
});

router.put('/policies/:key', (req, res) => {
  const { key } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  try {
    const existing = db.prepare('SELECT key FROM policies WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE policies SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(content, key);
    } else {
      db.prepare('INSERT INTO policies (key, content) VALUES (?, ?)').run(key, content);
    }
    res.json({ success: true, key });
  } catch { res.status(500).json({ error: 'Failed to update policy' }); }
});

// ── Word Report Exports ───────────────────────────────────────────────────────
router.get('/export/finance', async (req, res) => {
  try {
    const { generateFinanceReport } = require('../scripts/report-finance');
    const buf = await generateFinanceReport();
    const filename = `longo-finance-${new Date().toISOString().slice(0,10)}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) { res.status(500).json({ error: 'Failed to generate report: ' + err.message }); }
});

router.get('/export/analytics', async (req, res) => {
  try {
    const { generateAnalyticsReport } = require('../scripts/report-analytics');
    const buf = await generateAnalyticsReport();
    const filename = `longo-analytics-${new Date().toISOString().slice(0,10)}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) { res.status(500).json({ error: 'Failed to generate report: ' + err.message }); }
});

module.exports = router;
