/* admin-dashboard.js — Phase 5 */
'use strict';

const STATUS_ACTIVE = ['Pending', 'Processing', 'Shipped'];

const STATUS_BADGE = {
  Pending:    'badge--warning',
  Processing: 'badge--info',
  Shipped:    'badge--primary',
  Delivered:  'badge--success',
  Cancelled:  'badge--danger',
};

function egp(n) {
  return 'EGP ' + Number(n || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ── Fetch dashboard data ──────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [dashRes, meRes] = await Promise.all([
      fetch('/api/admin/dashboard'),
      fetch('/auth/me'),
    ]);

    if (!dashRes.ok) throw new Error('Dashboard fetch failed');
    const data   = await dashRes.json();
    const meData = meRes.ok ? await meRes.json() : {};
    const role   = meData?.user?.role || null;

    renderKPIs(data);
    renderMonthlyChart(data.monthly_trend || data.revenue_trend || []);
    renderRecentOrders(data.recent_orders || []);
    renderLowStock(data.low_stock_alerts || []);

    if (role === 'super_admin') loadResetNotice();
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function renderKPIs(data) {
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayRevenue = data.daily_revenue ?? 0;
  if (!data.daily_revenue && data.monthly_trend) {
    const entry = data.monthly_trend.find(d => d.day === todayStr);
    todayRevenue = entry ? entry.revenue : 0;
  }
  document.getElementById('kpi-today-revenue').textContent = egp(todayRevenue);
  document.getElementById('kpi-active-orders').textContent = data.kpis?.active_orders ?? '—';
  document.getElementById('kpi-new-customers').textContent = data.kpis?.new_customers ?? '—';
}

// ── Monthly Revenue Chart ─────────────────────────────────────────────────────
let revenueChart = null;

function renderMonthlyChart(trend) {
  const now   = new Date();
  document.getElementById('trend-month-label').textContent =
    now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const year  = now.getFullYear();
  const month = now.getMonth();
  const days  = new Date(year, month + 1, 0).getDate();
  const dataMap = {};
  trend.forEach(r => { dataMap[r.day] = r.revenue; });

  const labels = [], values = [];
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    labels.push(d);
    values.push(dataMap[key] ?? 0);
  }

  const ctx = document.getElementById('monthlyRevenueChart').getContext('2d');
  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (EGP)',
        data: values,
        borderColor: '#6b4c35',
        backgroundColor: 'rgba(107,76,53,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => egp(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 }, color: '#888', callback: v => 'EGP ' + Number(v).toLocaleString('en-EG') }
        }
      }
    }
  });
}

// ── Recent Orders ─────────────────────────────────────────────────────────────
function renderRecentOrders(orders) {
  const active = orders.filter(o => STATUS_ACTIVE.includes(o.status));
  const tbody  = document.getElementById('recent-orders-body');
  const empty  = document.getElementById('recent-orders-empty');
  const table  = document.getElementById('recent-orders-table');

  if (!active.length) {
    table.style.display = 'none';
    empty.style.display = '';
    return;
  }

  table.style.display = '';
  empty.style.display = 'none';

  tbody.innerHTML = active.map(o => `
    <tr class="order-row" data-id="${o.id}" title="Click to view order #${o.id}" style="cursor:pointer;">
      <td class="font-mono text-sm">#${o.id}</td>
      <td>${o.customer_name || '—'}</td>
      <td class="font-semibold">${egp(o.total_egp)}</td>
      <td class="text-capitalize">${o.payment_method || '—'}</td>
      <td><span class="badge ${STATUS_BADGE[o.status] || ''}">${o.status}</span></td>
      <td class="text-muted text-sm">${shortDate(o.created_at)}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.order-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.href = `/admin/orders?id=${row.dataset.id}`;
    });
  });
}

// ── Low Stock ─────────────────────────────────────────────────────────────────
function renderLowStock(alerts) {
  const list  = document.getElementById('stock-alert-list');
  const empty = document.getElementById('stock-alert-empty');

  if (!alerts.length) {
    list.style.display  = 'none';
    empty.style.display = '';
    return;
  }

  list.style.display  = '';
  empty.style.display = 'none';

  list.innerHTML = alerts.map(p => {
    const pct     = Math.min(100, Math.round((p.stock_qty / 20) * 100));
    const urgency = p.stock_qty <= 5 ? 'danger' : p.stock_qty <= 10 ? 'warning' : 'caution';
    return `
      <li class="stock-alert-item stock-alert-item--${urgency}"
          onclick="window.location.href='/admin/products?edit=${p.id}'"
          style="cursor:pointer;" title="Edit ${p.name}">
        <div class="stock-alert-item__info">
          <span class="stock-alert-item__name">${p.name}</span>
          <span class="stock-alert-item__qty">${p.stock_qty} left</span>
        </div>
        <div class="stock-alert-bar">
          <div class="stock-alert-bar__fill stock-alert-bar__fill--${urgency}" style="width:${pct}%"></div>
        </div>
      </li>`;
  }).join('');
}

// ── Super-admin: Password Reset Notice ────────────────────────────────────────
async function loadResetNotice() {
  try {
    const res  = await fetch('/api/admin/reset-requests');
    if (!res.ok) return;
    const requests = await res.json();
    if (!requests.length) return;

    const notice = document.getElementById('reset-notice');
    const text   = document.getElementById('reset-notice-text');

    // Build one clickable name per request
    const nameLinks = requests.map(r => `
      <a href="/admin/users"
         class="reset-notice__name"
         title="Go to Users page to resolve ${r.full_name}'s request">
        ${r.full_name}
      </a>`).join(', ');

    text.innerHTML = requests.length === 1
      ? `<strong>${nameLinks}</strong> has requested a password reset. <span class="reset-notice__action">Set a temporary password →</span>`
      : `<strong>${requests.length} admins</strong> requested a password reset: ${nameLinks} <span class="reset-notice__action">Resolve in Users →</span>`;

    notice.style.display = 'flex';

    document.getElementById('reset-notice-close').addEventListener('click', () => {
      notice.style.display = 'none';
    });
  } catch (_) {}
}

// ── Auto-refresh every 60s ────────────────────────────────────────────────────
function startAutoRefresh() {
  setInterval(async () => {
    try {
      const res  = await fetch('/api/admin/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      renderRecentOrders(data.recent_orders || []);
      renderKPIs(data);
    } catch (_) {}
  }, 60_000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  startAutoRefresh();
});
