/**
 * orders.js — Admin Orders Page
 * Fixes: items + shipping address via /api/orders/:id · stats sidebar · auto-open from ?id=
 */
'use strict';

let allOrders      = [];
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadOrders();

  // Auto-open modal if ?id= is in the URL (e.g. from dashboard click)
  const urlParams = new URLSearchParams(window.location.search);
  const idParam   = urlParams.get('id');
  if (idParam) viewOrder(parseInt(idParam));

  document.getElementById('search-orders').addEventListener('input', renderOrders);
  document.getElementById('filter-status').addEventListener('change', renderOrders);
  document.getElementById('update-status-btn').addEventListener('click', handleStatusUpdate);
  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

  // Stat cards filter the table when clicked
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      document.getElementById('filter-status').value = filter;
      renderOrders();
      // Highlight active card
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-card--active'));
      card.classList.add('stat-card--active');
    });
  });
});

// ── Load all orders ───────────────────────────────────────────────
async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  try {
    const res = await fetch('/api/orders');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-negative py-8">Server error (${res.status}).</td></tr>`;
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-negative py-8">Unexpected data format.</td></tr>';
      return;
    }
    allOrders = data;
    renderOrders();
    renderStats();
  } catch (err) {
    console.error('[Orders] loadOrders failed:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-negative py-8">Failed to load orders.</td></tr>';
  }
}

// ── Render stats sidebar ──────────────────────────────────────────
function renderStats() {
  const count = status => allOrders.filter(o => o.status === status).length;
  document.getElementById('stat-total').textContent     = allOrders.length;
  document.getElementById('stat-pending').textContent   = count('Pending');
  document.getElementById('stat-processing').textContent= count('Processing');
  document.getElementById('stat-shipped').textContent   = count('Shipped');
  document.getElementById('stat-delivered').textContent = count('Delivered');
  document.getElementById('stat-cancelled').textContent = count('Cancelled');
}

// ── Render table ──────────────────────────────────────────────────
function renderOrders() {
  const tbody        = document.getElementById('orders-tbody');
  const rawSearch    = document.getElementById('search-orders').value.trim().toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const searchId     = rawSearch.replace(/^#?0*/, '');

  const filtered = allOrders.filter(o => {
    const idStr   = o.id.toString();
    const padded  = idStr.padStart(4, '0');
    const nameStr = (o.customer_name || '').toLowerCase();
    const matchSearch = !rawSearch ||
      idStr === searchId ||
      padded.includes(rawSearch.replace('#', '')) ||
      nameStr.includes(rawSearch);
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="orders-empty-state">
          <span class="material-symbols-outlined">inventory_2</span>
          <p class="orders-empty-state__title">No orders found</p>
          <p class="orders-empty-state__sub">Try adjusting your search or filter</p>
        </div>
      </td></tr>`;
    return;
  }

  const statusMap = {
    pending: 'badge--pending', processing: 'badge--processing',
    shipped: 'badge--shipped', delivered: 'badge--delivered',
    cancelled: 'badge--cancelled'
  };

  tbody.innerHTML = filtered.map(o => {
    const date     = new Date(o.created_at).toLocaleDateString('en-EG', { month: 'short', day: 'numeric', year: 'numeric' });
    const initial  = o.customer_name ? o.customer_name.charAt(0).toUpperCase() : '?';
    const badgeCls = statusMap[o.status.toLowerCase()] || 'badge--pending';
    return `
      <tr>
        <td class="font-medium">#${o.id.toString().padStart(4,'0')}</td>
        <td class="text-muted">${date}</td>
        <td>
          <div class="table-avatar-cell">
            <div class="table-avatar">${initial}</div>
            <span>${escHtml(o.customer_name || 'Guest')}</span>
          </div>
        </td>
        <td class="font-medium">EGP ${Number(o.total_egp).toLocaleString()}</td>
        <td><span class="badge ${badgeCls}">${o.status}</span></td>
        <td class="text-right">
          <button class="btn btn-ghost text-xs py-1 px-3" onclick="viewOrder(${o.id})">View</button>
        </td>
      </tr>`;
  }).join('');
}

// ── Open modal — fetches full details from /api/orders/:id ────────
window.viewOrder = async function(id) {
  currentOrderId = id;

  // Show modal immediately with loading state
  document.getElementById('modal-order-id').textContent  = `Order #${id.toString().padStart(4,'0')}`;
  document.getElementById('modal-order-date').textContent = '';
  document.getElementById('order-modal-body').innerHTML  = '<p class="text-center text-muted py-6">Loading…</p>';
  document.getElementById('update-status-select').value  = 'Pending';
  openModal('order-modal');

  try {
    const res   = await fetch(`/api/orders/${id}`);
    if (!res.ok) throw new Error('Not found');
    const order = await res.json();

    document.getElementById('modal-order-date').textContent =
      new Date(order.created_at).toLocaleString('en-EG', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    document.getElementById('update-status-select').value = order.status;

    // Items
    const itemsHtml = (order.items || []).length
      ? (order.items).map(i => `
          <div class="order-item-row">
            <div>
              <div class="text-sm font-medium">${escHtml(i.product_name || 'Unknown product')}</div>
              <div class="text-xs text-muted">Qty: ${i.quantity}</div>
            </div>
            <div class="text-sm font-medium">EGP ${Number(i.price_at_purchase_egp * i.quantity).toLocaleString()}</div>
          </div>`).join('')
      : '<p class="text-sm text-muted">No items found.</p>';

    // Shipping address
    let addressHtml = '<p class="text-sm text-muted">No address provided</p>';
    const a = order.shipping_address;
    if (a && typeof a === 'object') {
      const parts = [
        a.name    ? `<p class="text-sm font-medium">${escHtml(a.name)}</p>`    : '',
        a.address ? `<p class="text-sm text-muted">${escHtml(a.address)}</p>`  : '',
        a.city    ? `<p class="text-sm text-muted">${escHtml(a.city)}</p>`     : '',
        a.phone   ? `<p class="text-sm text-muted">${escHtml(a.phone)}</p>`    : '',
      ].filter(Boolean).join('');
      if (parts) addressHtml = parts;
    } else if (a && typeof a === 'string' && a.trim()) {
      addressHtml = `<p class="text-sm text-muted">${escHtml(a)}</p>`;
    }

    document.getElementById('order-modal-body').innerHTML = `
      <div class="order-modal-grid">
        <div class="order-modal-section">
          <h4 class="modal-section-label">Customer</h4>
          <p class="text-sm font-medium">${escHtml(order.customer_name || 'Guest')}</p>
          <p class="text-sm text-muted">${escHtml(order.customer_email || '')}</p>
        </div>
        <div class="order-modal-section">
          <h4 class="modal-section-label">Shipping Address</h4>
          ${addressHtml}
        </div>
      </div>
      <h4 class="modal-section-label mt-4 mb-2">Order Items</h4>
      <div class="order-items-box">
        ${itemsHtml}
        <div class="order-items-total">
          <span class="font-bold">Total</span>
          <span class="font-bold text-primary">EGP ${Number(order.total_egp).toLocaleString()}</span>
        </div>
      </div>
      ${order.notes ? `<h4 class="modal-section-label mt-4 mb-1">Notes</h4>
        <p class="text-sm text-muted">${escHtml(order.notes)}</p>` : ''}
    `;
  } catch (err) {
    document.getElementById('order-modal-body').innerHTML =
      '<p class="text-center text-negative py-6">Failed to load order details.</p>';
  }
};

// ── Status update ─────────────────────────────────────────────────
async function handleStatusUpdate() {
  if (!currentOrderId) return;
  const btn       = document.getElementById('update-status-btn');
  const newStatus = document.getElementById('update-status-select').value;
  btn.disabled    = true;
  btn.innerHTML   = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">hourglass_top</span> Saving…';
  try {
    const res = await fetch(`/api/orders/${currentOrderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      closeModal('order-modal');
      await loadOrders();
      showAdminToast('Order status updated');
    } else {
      showAdminToast('Failed to update status', true);
    }
  } catch { showAdminToast('Connection error', true); }
  btn.disabled  = false;
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">check</span> Save Status';
}

// ── Export CSV ────────────────────────────────────────────────────
function exportCSV() {
  if (!allOrders.length) { showAdminToast('No orders to export', true); return; }
  const rows = [['Order ID','Date','Customer','Email','Total (EGP)','Status']];
  allOrders.forEach(o => rows.push([
    '#' + o.id.toString().padStart(4,'0'),
    new Date(o.created_at).toLocaleDateString('en-EG'),
    o.customer_name || '', o.customer_email || '', o.total_egp, o.status
  ]));
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `orders-${new Date().toISOString().slice(0,10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('CSV exported');
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
