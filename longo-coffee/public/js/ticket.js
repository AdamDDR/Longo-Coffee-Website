/**
 * ticket.js — Support Ticket Thread Page
 * Loaded only on /ticket/:id
 */

(async function () {
  // Get ticket ID from URL: /ticket/5
  const ticketId = window.location.pathname.split('/').pop();
  if (!ticketId || isNaN(ticketId)) {
    window.location.href = '/profile';
    return;
  }

  const threadEl      = document.getElementById('ticket-thread');
  const headerEl      = document.getElementById('ticket-header');
  const actionsEl     = document.getElementById('ticket-actions');
  const replyBox      = document.getElementById('ticket-reply-box');
  const closedNotice  = document.getElementById('ticket-closed-notice');
  const replyInput    = document.getElementById('reply-input');
  const replySendBtn  = document.getElementById('reply-send-btn');

  let pollTimer      = null;
  let lastMessageId  = 0;
  let ticketStatus   = '';
  let currentUser    = null;

  // ── Auth check ───────────────────────────────────────────────────
  try {
    const res  = await fetch('/auth/me');
    const data = await res.json();
    if (!data.authenticated) { window.location.href = '/auth'; return; }
    currentUser = data.user;
  } catch {
    window.location.href = '/auth';
    return;
  }

  // ── Load ticket ──────────────────────────────────────────────────
  async function loadTicket() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (res.status === 401) { window.location.href = '/auth'; return; }
      if (res.status === 403 || res.status === 404) { window.location.href = '/profile'; return; }
      const ticket = await res.json();

      ticketStatus = ticket.status || 'Open';
      renderHeader(ticket);
      renderThread(ticket);
      renderActions(ticket);
      updateReplyVisibility(ticket);

    } catch (err) {
      threadEl.innerHTML = '<p class="text-negative" style="text-align:center;padding:2rem;">Failed to load ticket.</p>';
      console.error(err);
    }
  }

  // ── Render header ────────────────────────────────────────────────
  function renderHeader(ticket) {
    const date      = new Date(ticket.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const statusCls = (ticket.status || 'open').toLowerCase().replace(/\s/g, '-');
    document.title  = `Ticket #${ticket.id.toString().padStart(4,'0')} | Longo`;

    document.getElementById('ticket-header').innerHTML = `
      <div class="ticket-header__left">
        <p class="ticket-header__id">Ticket #${ticket.id.toString().padStart(4,'0')}</p>
        <h1 class="ticket-header__subject">${ticket.subject || 'Support Request'}</h1>
        <div class="ticket-header__meta">
          <span class="badge badge--${statusCls}">${ticket.status || 'Open'}</span>
          <span class="ticket-header__date">Opened ${date}</span>
        </div>
      </div>
      <div class="ticket-header__actions" id="ticket-actions"></div>`;

    // Re-assign refs after innerHTML replacement
    renderActions(ticket);
  }

  // ── Render action buttons ────────────────────────────────────────
  function renderActions(ticket) {
    const el = document.getElementById('ticket-actions');
    if (!el) return;
    const isOpen = ticket.status !== 'Closed' && ticket.status !== 'Resolved';
    if (!isOpen) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-resolved"
        style="color:var(--color-positive);border-color:var(--color-positive);">
        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">check_circle</span>
        Problem Fixed
      </button>
      <button class="btn btn-ghost btn-sm" id="btn-close"
        style="color:var(--color-negative);border-color:var(--color-negative);">
        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">cancel</span>
        Close Ticket
      </button>`;

    document.getElementById('btn-resolved').addEventListener('click', () => changeStatus('Resolved'));
    document.getElementById('btn-close').addEventListener('click',    () => changeStatus('Closed'));
  }

  // ── Render thread ────────────────────────────────────────────────
  function renderThread(ticket) {
    const messages = ticket.messages || [];

    // Always show the original contact message as the first bubble
    const rawBody  = ticket.message || '';
    // Strip the metadata header (From:/Email:/Phone: lines above the ─── divider)
    const divIdx   = rawBody.indexOf('─');
    const origBody = (divIdx > -1 ? rawBody.slice(divIdx).replace(/^─+\n*/, '') : rawBody).trim();

    let html = '';

    // Opening divider
    const openDate = new Date(ticket.created_at).toLocaleDateString('en-EG', { weekday: 'short', month: 'short', day: 'numeric' });
    html += `<div class="thread-divider">${openDate}</div>`;

    // Original message bubble (from client)
    html += messageBubble({
      sender_role:  'client',
      message_text: origBody,
      created_at:   ticket.created_at,
      is_original:  true
    }, ticket);

    // Subsequent messages
    let lastDate = openDate;
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toLocaleDateString('en-EG', { weekday: 'short', month: 'short', day: 'numeric' });
      if (msgDate !== lastDate) {
        html += `<div class="thread-divider">${msgDate}</div>`;
        lastDate = msgDate;
      }
      html += messageBubble(msg, ticket);
      if (msg.id > lastMessageId) lastMessageId = msg.id;
    });

    threadEl.innerHTML = html;
    threadEl.scrollTop = threadEl.scrollHeight;
    // Smooth scroll to bottom
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  }

  function messageBubble(msg, ticket) {
    const isClient  = msg.sender_role === 'client';
    const sideClass = isClient ? 'thread-message--client' : 'thread-message--admin';
    const sender    = isClient
      ? (ticket.customer_name || 'You')
      : 'Longo Support';
    const time      = new Date(msg.created_at).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="thread-message ${sideClass}">
        <div class="thread-message__bubble">${escHtml(msg.message_text)}</div>
        <div class="thread-message__meta">
          <span class="thread-message__sender">${escHtml(sender)}</span>
          <span>${time}</span>
        </div>
      </div>`;
  }

  function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Show / hide reply box ────────────────────────────────────────
  function updateReplyVisibility(ticket) {
    const isOpen = ticket.status !== 'Closed' && ticket.status !== 'Resolved';
    replyBox.style.display     = isOpen ? 'block' : 'none';
    closedNotice.style.display = isOpen ? 'none'  : 'flex';
  }

  // ── Send reply ───────────────────────────────────────────────────
  async function sendReply() {
    const text = replyInput.value.trim();
    if (!text) return;

    replySendBtn.disabled    = true;
    replySendBtn.textContent = 'Sending…';

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text })
      });
      const data = await res.json();

      if (data.success) {
        replyInput.value = '';
        await loadTicket(); // Refresh thread
      } else {
        alert(data.error || 'Failed to send reply.');
      }
    } catch {
      alert('Connection error. Please try again.');
    }

    replySendBtn.disabled    = false;
    replySendBtn.textContent = 'Send Reply';
    replySendBtn.innerHTML   = '<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">send</span> Send Reply';
  }

  // ── Change ticket status ─────────────────────────────────────────
  async function changeStatus(newStatus) {
    const label = newStatus === 'Resolved' ? 'mark this as Problem Fixed' : 'close this ticket';
    if (!confirm(`Are you sure you want to ${label}?`)) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        clearInterval(pollTimer);
        await loadTicket();
      } else {
        alert(data.error || 'Failed to update ticket.');
      }
    } catch {
      alert('Connection error. Please try again.');
    }
  }

  // ── Poll for new messages every 5 seconds ────────────────────────
  function startPolling() {
    pollTimer = setInterval(async () => {
      if (ticketStatus === 'Closed' || ticketStatus === 'Resolved') {
        clearInterval(pollTimer);
        return;
      }
      try {
        const res    = await fetch(`/api/tickets/${ticketId}`);
        const ticket = await res.json();
        const msgs   = ticket.messages || [];
        const latest = msgs.length ? msgs[msgs.length - 1].id : 0;
        if (latest > lastMessageId || ticket.status !== ticketStatus) {
          ticketStatus = ticket.status;
          renderHeader(ticket);
          renderThread(ticket);
          updateReplyVisibility(ticket);
        }
      } catch { /* silent */ }
    }, 5000);
  }

  // ── Wire reply button ────────────────────────────────────────────
  replySendBtn.addEventListener('click', sendReply);
  replyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
  });

  // ── Init ─────────────────────────────────────────────────────────
  await loadTicket();
  startPolling();

  // Stop polling when tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(pollTimer);
    else startPolling();
  });

})();
