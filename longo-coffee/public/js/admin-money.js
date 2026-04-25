/* admin-money.js — Finance page */

let allProjects = [];
let financeData = {};

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function EGP(n) { return `EGP ${Math.round(n).toLocaleString()}`; }

// ── Charts ────────────────────────────────────────────────────────────────────
let cashFlowChartInst = null;
let paymentChartInst  = null;
let salesChartInst    = null;

function renderCashFlowChart(data) {
  const ctx = document.getElementById('cashFlowChart');
  if (!ctx) return;
  if (cashFlowChartInst) cashFlowChartInst.destroy();
  cashFlowChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [
        { label: 'Revenue',      data: data.map(d => d.revenue),      backgroundColor: 'rgba(90,50,30,0.75)' },
        { label: 'Cost',         data: data.map(d => d.cost),         backgroundColor: 'rgba(200,80,80,0.65)' },
        { label: 'Gross Profit', data: data.map(d => d.gross_profit), backgroundColor: 'rgba(80,160,110,0.75)' },
        { label: 'Net CF',       data: data.map(d => d.net_cf),       backgroundColor: 'rgba(90,140,190,0.75)' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
  });
}

function renderPaymentChart(data) {
  const ctx = document.getElementById('paymentMethodChart');
  if (!ctx) return;
  if (paymentChartInst) paymentChartInst.destroy();
  paymentChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'),
      datasets: [{ data: data.map(d => d.revenue), backgroundColor: ['rgba(90,50,30,0.8)', 'rgba(180,130,80,0.8)'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderSalesTrendChart(data) {
  const ctx = document.getElementById('salesTrendChart');
  if (!ctx) return;
  if (salesChartInst) salesChartInst.destroy();
  salesChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.day),
      datasets: [{
        label: 'Units Sold',
        data: data.map(d => d.units_sold),
        borderColor: 'rgba(90,50,30,1)',
        backgroundColor: 'rgba(90,50,30,0.1)',
        fill: true, tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// ── KPIs + Calculations ───────────────────────────────────────────────────────
function renderKPIs(d) {
  document.getElementById('kpi-revenue').textContent   = EGP(d.revenue);
  document.getElementById('kpi-cost').textContent      = EGP(d.cost);
  document.getElementById('kpi-profit').textContent    = EGP(d.profit);
  document.getElementById('kpi-aov').textContent       = EGP(d.avg_order_value);
  document.getElementById('kpi-customers').textContent = d.total_customers.toLocaleString();
  document.getElementById('kpi-sold').textContent      = d.total_products_sold.toLocaleString();

  const a = d.annual;
  const rPct  = (a.discount_rate * 100).toFixed(1);
  const years = a.horizon_years;

  document.getElementById('calc-ncf').textContent          = EGP(a.net_cash_flow);
  document.getElementById('calc-ncf-formula').textContent  = `Gross Profit (${EGP(d.profit)}) − Fixed Costs (${EGP(a.fixed_costs)})`;
  document.getElementById('calc-npv').textContent          = EGP(a.npv);
  document.getElementById('calc-npv-formula').textContent  = `−CapEx (${EGP(a.total_capex)}) + Σ NCF ÷ (1 + ${rPct}%)ⁿ over ${years} yrs`;
  document.getElementById('calc-payback').textContent      = a.payback_months ? `${a.payback_months} months` : 'N/A';
  document.getElementById('calc-payback-formula').textContent = `${EGP(a.total_capex)} ÷ ${EGP(Math.round(a.net_cash_flow / 12))}/mo`;
  document.getElementById('fin-calc-subtitle').textContent =
    `Discount rate: ${rPct}% · Horizon: ${years} years · Fixed costs: ${EGP(a.fixed_costs)}/yr`;

  const roi = a.roi || 0;
  document.getElementById('roi-value').textContent = `${roi.toFixed(1)}%`;
  document.getElementById('roi-trend').innerHTML =
    `<span class="material-symbols-outlined" style="font-size:16px">${roi >= 0 ? 'trending_up' : 'trending_down'}</span>
     ${roi >= 0 ? 'Positive Return' : 'Negative Return'}`;
}

// ── Monthly NCF Table ─────────────────────────────────────────────────────────
function renderMonthlyTable(data) {
  const tbody = document.getElementById('monthly-ncf-table');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No order data yet.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(m => {
    const ncfColor = m.net_cf >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
    return `
      <tr>
        <td class="font-medium">${m.month}</td>
        <td>${EGP(m.revenue)}</td>
        <td style="color:var(--color-negative)">${EGP(m.cost)}</td>
        <td>${EGP(m.gross_profit)}</td>
        <td class="text-muted">${EGP(m.fixed_cost)}</td>
        <td style="font-weight:600;color:${ncfColor}">${EGP(m.net_cf)}</td>
      </tr>`;
  }).join('');
}

// ── Load Finance ──────────────────────────────────────────────────────────────
async function loadFinance() {
  const discountRate = parseFloat(document.getElementById('fin-discount-rate').value) / 100 || 0.10;
  const horizon      = parseInt(document.getElementById('fin-horizon').value)                || 3;
  const fixedCosts   = parseFloat(document.getElementById('fin-fixed-costs').value)          || 0;
  const params       = new URLSearchParams({ discount_rate: discountRate, horizon_years: horizon, annual_fixed_costs: fixedCosts });

  try {
    const res   = await fetch(`/api/admin/finance?${params}`);
    financeData = await res.json();
    renderKPIs(financeData);
    if (financeData.revenue_by_month?.length)   renderCashFlowChart(financeData.revenue_by_month);
    if (financeData.revenue_by_payment?.length)  renderPaymentChart(financeData.revenue_by_payment);
    if (financeData.sales_trend?.length)         renderSalesTrendChart(financeData.sales_trend);
    renderMonthlyTable(financeData.monthly_ncf);
  } catch (err) {
    console.error('Finance load error:', err);
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────
async function loadProjects() {
  const res   = await fetch('/api/admin/projects');
  allProjects = await res.json();
  renderProjects();
  const totalCapex = allProjects.reduce((s, p) => s + (p.capex_egp || 0), 0);
  document.getElementById('total-capex').textContent = EGP(totalCapex);
}

function renderProjects() {
  const tbody = document.getElementById('projects-table');
  if (!allProjects.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No initiatives yet.</td></tr>';
    return;
  }
  tbody.innerHTML = allProjects.map(p => `
    <tr>
      <td class="font-medium">${escHtml(p.name)}</td>
      <td>${EGP(p.capex_egp)}</td>
      <td class="${p.projected_roi_pct >= 15 ? 'text-positive' : 'text-muted'}">${p.projected_roi_pct.toFixed(1)}%</td>
      <td><span class="status-badge status-${p.status}">${p.status}</span></td>
      <td class="text-xs text-muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(p.notes || '—')}</td>
      <td>
        <div class="project-actions">
          <button class="btn btn-ghost" onclick="openEditModal(${p.id})">
            <span class="material-symbols-outlined" style="font-size:16px">edit</span>
          </button>
          <button class="btn btn-ghost" style="color:var(--color-negative);" onclick="deleteProject(${p.id},'${escHtml(p.name)}')">
            <span class="material-symbols-outlined" style="font-size:16px">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
window.closeProjModal = function () {
  document.getElementById('project-modal').classList.remove('show');
};

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add Initiative';
  document.getElementById('project-id').value = '';
  document.getElementById('project-form').reset();
  document.getElementById('project-modal').classList.add('show');
}

window.openEditModal = function (id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-title').textContent   = 'Edit Initiative';
  document.getElementById('project-id').value          = p.id;
  document.getElementById('proj-name').value           = p.name;
  document.getElementById('proj-capex').value          = p.capex_egp;
  document.getElementById('proj-roi').value            = p.projected_roi_pct;
  document.getElementById('proj-status').value         = p.status;
  document.getElementById('proj-notes').value          = p.notes || '';
  document.getElementById('project-modal').classList.add('show');
};

window.deleteProject = async function (id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const res  = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { showAdminToast('Initiative deleted'); await loadProjects(); await loadFinance(); }
  else showAdminToast(data.error || 'Failed to delete', true);
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadFinance();
  await loadProjects();

  document.getElementById('recalculate-btn').addEventListener('click', loadFinance);

  document.getElementById('add-project-btn').addEventListener('click', openAddModal);
  document.getElementById('project-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('project-modal')) closeProjModal();
  });

  document.getElementById('project-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id  = document.getElementById('project-id').value;
    const btn = document.getElementById('submit-project-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const res  = await fetch(id ? `/api/admin/projects/${id}` : '/api/admin/projects', {
        method:  id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              document.getElementById('proj-name').value.trim(),
          capex_egp:         parseFloat(document.getElementById('proj-capex').value) || 0,
          projected_roi_pct: parseFloat(document.getElementById('proj-roi').value)   || 0,
          status:            document.getElementById('proj-status').value,
          notes:             document.getElementById('proj-notes').value.trim()
        })
      });
      const data = await res.json();
      if (data.success || data.project) {
        showAdminToast(id ? 'Initiative updated' : 'Initiative added');
        closeProjModal();
        await loadProjects();
        await loadFinance();
      } else { showAdminToast(data.error || 'Failed to save', true); }
    } catch { showAdminToast('Connection error', true); }
    btn.disabled = false; btn.textContent = 'Save Initiative';
  });

  document.getElementById('export-finance-word').addEventListener('click', async () => {
    const btn = document.getElementById('export-finance-word');
    btn.disabled = true; btn.textContent = 'Generating...';
    try {
      const res = await fetch('/api/admin/export/finance');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `Longo_Finance_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { showAdminToast('Export failed', true); }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;">download</span> Export Report';
  });
});
