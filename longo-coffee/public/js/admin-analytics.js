/* admin-analytics.js — Analytics page */

const CHART_COLORS = {
  primary:  '#4B2E2B', secondary: '#8B7355', tertiary: '#C4A882',
  positive: '#4A7C59', negative:  '#C17B6B', blue:     '#5B8DB8', gold: '#D4A853'
};

if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Work Sans', sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = '#8B7355';
  Chart.defaults.plugins.tooltip.backgroundColor = '#4B2E2B';
  Chart.defaults.plugins.tooltip.titleColor      = '#FFF8F0';
  Chart.defaults.plugins.tooltip.bodyColor       = '#FFF8F0';
  Chart.defaults.plugins.tooltip.cornerRadius    = 8;
  Chart.defaults.plugins.tooltip.padding         = 10;
}

const noGrid = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, border: { display: false } },
    y: { grid: { color: 'rgba(75,46,43,0.06)' }, border: { display: false } }
  }
};

// ── Charts ────────────────────────────────────────────────────────────────────
function renderSalesTrend(data) {
  const ctx = document.getElementById('salesTrendChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Units Sold',
        data:  data.map(d => d.units_sold),
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(75,46,43,0.1)',
        fill: true, tension: 0.4
      }]
    },
    options: noGrid
  });
}

function renderTopProducts(data) {
  const ctx = document.getElementById('topProductsChart');
  if (!ctx) return;
  if (!data.length) {
    ctx.parentElement.innerHTML = '<p class="text-center text-muted" style="padding:40px 0;">No delivered orders yet.</p>';
    return;
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        label: 'Units Sold',
        data:  data.map(d => d.total_sold),
        backgroundColor: CHART_COLORS.tertiary,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      scales: { x: { grid: { color: 'rgba(75,46,43,0.06)' } }, y: { grid: { display: false } } }
    }
  });
}

function renderOrdersByStatus(data) {
  const ctx = document.getElementById('ordersStatusChart');
  if (!ctx) return;
  const colors = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.gold, CHART_COLORS.positive, CHART_COLORS.negative];
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.status),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } }
  });
}

function renderRevenueByCategory(data) {
  const ctx = document.getElementById('revenueCategoryChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.category),
      datasets: [{
        label: 'Revenue (EGP)',
        data:  data.map(d => d.revenue),
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4
      }]
    },
    options: {
      ...noGrid,
      plugins: { tooltip: { callbacks: { label: c => `EGP ${c.raw.toLocaleString()}` } } }
    }
  });
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function renderKPIs(data) {
  const { kpis, orders_by_status, users } = data;

  document.getElementById('kpi-total-orders').textContent = kpis.total_orders.toLocaleString();
  document.getElementById('kpi-avg-order').textContent    = `EGP ${Math.round(kpis.avg_order_value).toLocaleString()}`;

  // Orders breakdown by status under total orders
  const byStatus = {};
  orders_by_status.forEach(s => { byStatus[s.status] = s.count; });
  document.getElementById('kpi-orders-breakdown').textContent =
    `${byStatus['Pending'] || 0} pending · ${byStatus['Processing'] || 0} processing · ${byStatus['Delivered'] || 0} delivered`;

  // Users: day / month / year
  [
    ['day',   users.day],
    ['month', users.month],
    ['year',  users.year]
  ].forEach(([period, u]) => {
    const net = u.added - u.removed;
    const netEl = document.getElementById(`users-${period}-net`);
    netEl.textContent  = (net >= 0 ? '+' : '') + net;
    netEl.style.color  = net >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
    document.getElementById(`users-${period}-added`).textContent   = `+${u.added} added`;
    document.getElementById(`users-${period}-removed`).textContent = `−${u.removed} removed`;
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res  = await fetch('/api/admin/analytics');
    const data = await res.json();

    renderKPIs(data);
    if (data.sales_trend?.length)        renderSalesTrend(data.sales_trend);
    if (data.top_products !== undefined)  renderTopProducts(data.top_products);
    if (data.orders_by_status?.length)   renderOrdersByStatus(data.orders_by_status);
    if (data.revenue_by_category?.length) renderRevenueByCategory(data.revenue_by_category);

  } catch (err) {
    console.error('Analytics load error:', err);
  }

  document.getElementById('export-analytics-word').addEventListener('click', async () => {
    const btn = document.getElementById('export-analytics-word');
    btn.disabled = true; btn.textContent = 'Generating...';
    try {
      const res = await fetch('/api/admin/export/analytics');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `Longo_Analytics_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { showAdminToast('Export failed', true); }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;">download</span> Export Report';
  });
});
