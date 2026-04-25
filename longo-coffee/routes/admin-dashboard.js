const express    = require('express');
const db         = require('../database/db');
const adminGuard = require('../middleware/adminGuard');

const router = express.Router();
router.use(adminGuard);

// GET /api/admin/dashboard
router.get('/', (req, res) => {
  try {
    const totalSalesRow   = db.prepare("SELECT SUM(total_egp) as sum FROM orders WHERE status != 'Cancelled'").get();
    const activeOrdersRow = db.prepare("SELECT COUNT(id) as count FROM orders WHERE status IN ('Pending', 'Processing', 'Shipped')").get();
    const newCustomersRow = db.prepare("SELECT COUNT(id) as count FROM users WHERE role = 'client' AND is_guest = 0 AND created_at >= DATE('now', 'start of month')").get();

    // Today's revenue
    const dailyRevenueRow = db.prepare(`
      SELECT SUM(total_egp) as revenue FROM orders
      WHERE status != 'Cancelled'
        AND DATE(created_at) = DATE('now')
    `).get();

    // Monthly trend — every day in the current calendar month
    const monthlyTrend = db.prepare(`
      SELECT DATE(created_at) as day, SUM(total_egp) as revenue
      FROM orders
      WHERE status != 'Cancelled'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `).all();

    // Recent orders — active statuses only, latest 8
    const recentOrders = db.prepare(`
      SELECT o.id, o.status, o.total_egp, o.payment_method, o.created_at,
             u.full_name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status IN ('Pending', 'Processing', 'Shipped')
      ORDER BY o.created_at DESC
      LIMIT 8
    `).all();

    // Low stock alerts
    const lowStockAlerts = db.prepare(
      'SELECT * FROM products WHERE stock_qty < 20 AND is_active = 1 ORDER BY stock_qty ASC'
    ).all();

    res.json({
      kpis: {
        total_sales:   totalSalesRow.sum    || 0,
        active_orders: activeOrdersRow.count || 0,
        new_customers: newCustomersRow.count || 0,
      },
      daily_revenue:    dailyRevenueRow.revenue || 0,
      monthly_trend:    monthlyTrend,
      recent_orders:    recentOrders,
      low_stock_alerts: lowStockAlerts,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
