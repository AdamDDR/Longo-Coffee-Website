/**
 * support.js — Admin Support Ticket Panel
 * Handles: ticket list, thread view, reply, status change, polling
 */

let allTickets     = [];
let currentTicketId = null;
let pollInterval   = null;

const CLOSED_STATUSES = ['Closed', 'Resolved'];

document.addEventListener('DOMContentLoaded', async () => {
  await loadTickets();
  bindFilterButtons();
  bindStatusChange();
  bindReplyForm();
  startPolling();
});

// ── Filter buttons ───────────────────────────────────────────────
function bindFilterButtons() {
  document.querySelectorAll('.ticket-list-header [data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.ticket-list-header [data-filter]')
        .forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      renderTicketList();
    });
  });
}

// ── Status change dropdown ───────────────────────────────────────
function bindStatusChange() {
  document.getElementById('view-status')?.addEventListener('change', async (e) => {
    if (!currentTicketId) return;
    const newStatus = e.target.value;
    try {
      await fetch(`/api/tickets/${currentTicketId}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus })
      });
      // Update local cache immediately so UI is snappy
      const t = allTickets.find(t => t.id === currentTicketId);
      if (t) t.status = newStatus;
      renderTicketList();
      updateReplyVisibility(newStatus);
    } catch (err) {
      console.error('Status update failed', err);
    }
  });
}

// ── Reply form ───────────────────────────────────────────────────
function bindReplyForm() {
  document.getElementById('reply-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentTicketId) return;

    const btn          = document.getElementById('reply-submit');
    const textInput    = document.getElementById('reply-text');
    const internalChk  = document.getElementById('reply-internal');

    btn.disabled     = true;
    btn.innerHTML    = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">hourglass_top</span> Sending…';

    try {
      const res = await fetch(`/api/tickets/${currentTicketId}/reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:          textInput.value,
          is_internal_note: internalChk.checked
        })
      });

      if (res.ok) {
        textInput.value      = '';
        internalChk.checked  = false;
        await openTicket(currentTicketId);
        await loadTickets();
      } else {
        showAdminToast('Failed to send reply', true);
      }
    } catch {
      showAdminToast('Connection error', true);
    }

    btn.disabled  = false;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">send</span> Send Reply';
  });
}

// ── Load all tickets ─────────────────────────────────────────────
async function loadTickets() {
  try {
    const res  = await fetch('/api/tickets');
    allTickets = await res.json();
    renderTicketList();
  } catch {
    document.getElementById('ticket-list-container').innerHTML =
      '<div class="p-4 text-center text-negative">Failed to load tickets.</div>';
  }
}

// ── Render ticket list ───────────────────────────────────────────
function renderTicketList() {
  const container     = document.getElementById('ticket-list-container');
  const activeBtn     = document.querySelector('.ticket-list-header [data-filter].active');
  const filterValue   = activeBtn ? activeBtn.dataset.filter : '';
  const filtered      = filterValue
    ? allTickets.filter(t => t.status === filterValue)
    : allTickets;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="support-empty-state">No tickets found.</div>';
    return;
  }

  const statusClass = {
    'Open':        'badge--open',
    'In Progress': 'badge--pending',
    'Resolved':    'badge--resolved',
    'Closed':      'badge--closed'
  };

  container.innerHTML = filtered.map(t => {
    const date        = new Date(t.created_at).toLocaleDateString('en-EG', { month: 'short', day: 'numeric' });
    const activeClass = t.id === currentTicketId ? 'active' : '';
    const badgeCls    = statusClass[t.status] || 'badge--pending';

    return `
      <div class="ticket-item ${activeClass}" onclick="openTicket(${t.id})">
        <div class="ticket-item__header">
          <span class="ticket-item__id">#${t.id.toString().padStart(4,'0')}</span>
          <span class="ticket-item__time">${date}</span>
        </div>
        <div class="ticket-item__subject">${escHtml(t.subject)}</div>
        ${t.category ? `<div class="ticket-item__category">${escHtml(t.category)}</div>` : ''}
        <div class="ticket-item__footer">
          <span class="text-xs text-muted">${escHtml(t.customer_name || '')}</span>
          <span class="badge ${badgeCls}">${t.status}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Open & render ticket thread ──────────────────────────────────
window.openTicket = async function (id) {
  currentTicketId = id;
  renderTicketList();

  try {
    const res    = await fetch(`/api/tickets/${id}`);
    const ticket = await res.json();

    // Header
    document.getElementById('view-subject').textContent = ticket.subject || 'Support Request';
    document.getElementById('view-meta').innerHTML = `
      <span>Ticket #${ticket.id.toString().padStart(4,'0')}</span>
      <span>•</span>
      <span>${escHtml(ticket.customer_name || '')}
        ${ticket.customer_email ? '(' + escHtml(ticket.customer_email) + ')' : ''}
      </span>`;

    // Show status selector
    const actionsEl = document.getElementById('view-actions');
    actionsEl.style.cssText = 'display:flex;'; // override the !important none
    document.getElementById('view-status').value = ticket.status;

    // Render messages
    const msgs = ticket.messages || [];

    // Build original message bubble from ticket.message body
    const rawBody  = ticket.message || '';
    const divIdx   = rawBody.indexOf('─');
    const origBody = (divIdx > -1 ? rawBody.slice(divIdx).replace(/^─+\n*/,'') : rawBody).trim();

    const openDate = new Date(ticket.created_at).toLocaleString('en-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let threadHtml = messageBubble({
      sender_role:  'client',
      message_text: origBody,
      created_at:   ticket.created_at,
      is_internal_note: false
    }, ticket);

    msgs.forEach(m => {
      threadHtml += messageBubble(m, ticket);
    });

    const msgsContainer = document.getElementById('view-messages');
    msgsContainer.innerHTML = threadHtml || '<p class="text-muted text-center">No messages yet.</p>';
    setTimeout(() => { msgsContainer.scrollTop = msgsContainer.scrollHeight; }, 50);

    // Reply box vs closed notice
    updateReplyVisibility(ticket.status);

  } catch (err) {
    document.getElementById('view-messages').innerHTML =
      '<p class="text-negative text-center p-8">Error loading thread.</p>';
    console.error(err);
  }
};

function messageBubble(m, ticket) {
  const isClient     = m.sender_role === 'client';
  const isInternal   = m.is_internal_note;
  const msgClass     = isClient ? 'client-reply' : 'admin-reply';
  const internalCls  = isInternal ? 'internal-note' : '';
  const initial      = isClient
    ? (ticket.customer_name ? ticket.customer_name[0].toUpperCase() : '?')
    : 'A';
  const roleLabel    = isInternal
    ? '🔒 Internal Note'
    : (isClient ? escHtml(ticket.customer_name || 'Client') : 'Support Agent');
  const time         = new Date(m.created_at).toLocaleString('en-EG', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
    <div class="ticket-message ${msgClass} ${internalCls}">
      <div class="ticket-message__avatar">${initial}</div>
      <div class="ticket-message__content">
        <div class="ticket-message__meta">${roleLabel} · ${time}</div>
        <div class="ticket-message__bubble">${escHtml(m.message_text).replace(/\n/g,'<br>')}</div>
      </div>
    </div>`;
}

// ── Show reply box OR closed notice based on status ──────────────
function updateReplyVisibility(status) {
  const isClosed    = CLOSED_STATUSES.includes(status);
  const replyBox    = document.getElementById('view-reply-box');
  const closedNote  = document.getElementById('view-closed-notice');
  const statusLabel = document.getElementById('view-closed-status');

  replyBox.style.display   = isClosed ? 'none'  : 'block';
  closedNote.style.display = isClosed ? 'flex'  : 'none';
  if (statusLabel) statusLabel.textContent = status.toLowerCase();
}

// ── Polling ──────────────────────────────────────────────────────
function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const res        = await fetch('/api/tickets');
      const newTickets = await res.json();
      allTickets       = newTickets;
      renderTicketList();

      // Check for new messages on open ticket
      if (currentTicketId) {
        const tRes    = await fetch(`/api/tickets/${currentTicketId}`);
        const updated = await tRes.json();
        const msgsEl  = document.getElementById('view-messages');
        const current = msgsEl.querySelectorAll('.ticket-message').length;
        // +1 because we always render the original message as bubble #1
        if ((updated.messages?.length + 1) > current) {
          await openTicket(currentTicketId);
        }
        // Also update reply visibility if status changed externally (e.g. client closed)
        const statusSelect = document.getElementById('view-status');
        if (statusSelect && statusSelect.value !== updated.status) {
          statusSelect.value = updated.status;
          updateReplyVisibility(updated.status);
        }
      }

      // Update live indicator
      const pollEl = document.getElementById('poll-status');
      if (pollEl) {
        pollEl.textContent = `Live · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
      }
    } catch { /* silent */ }
  }, 4000);

  // Pause when tab hidden, resume on visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(pollInterval);
    else startPolling();
  });
}

// ── Helpers ──────────────────────────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
