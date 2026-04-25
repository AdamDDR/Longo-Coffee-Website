/* ============================================================
   admin-users.js — User Management page logic
   ============================================================ */

let _pendingTmpUserId = null;
let _pendingDelUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  bindModals();
});

// ── Load & Render ──────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');

    if (res.status === 403) {
      document.getElementById('users-table').innerHTML =
        '<tr><td colspan="7" class="text-center text-negative">Access denied. Super Admin only.</td></tr>';
      return;
    }

    if (!res.ok) {
      document.getElementById('users-table').innerHTML =
        `<tr><td colspan="7" class="text-center text-negative">Error ${res.status} loading users.</td></tr>`;
      return;
    }

    const users = await res.json();
    document.getElementById('user-count').textContent = `${users.length} users`;
    document.getElementById('users-table').innerHTML = users.map(renderUserRow).join('');
  } catch (err) {
    console.error('Error loading users:', err);
    document.getElementById('users-table').innerHTML =
      '<tr><td colspan="7" class="text-center text-negative">Connection error loading users.</td></tr>';
  }
}

function renderUserRow(user) {
  const date         = new Date(user.created_at).toLocaleDateString();
  const isSuperAdmin = user.role === 'super_admin';
  const isClient     = user.role === 'client';

  // Pending = requested reset but admin hasn't set temp password yet
  const pwdPending = user.force_password_change === 1 && !user.temp_password;

  /* Status */
  let statusHtml = '';
  if (user.is_flagged) {
    statusHtml = '<span class="flag-badge"><span class="material-symbols-outlined" style="font-size:14px">flag</span> Flagged</span>';
  } else if (!user.is_active) {
    statusHtml = '<span class="badge badge--delayed">Inactive</span>';
  } else {
    statusHtml = '<span class="badge badge--shipped">Active</span>';
  }

  if (pwdPending) {
    statusHtml += '<br><span class="pwd-request-badge"><span class="material-symbols-outlined" style="font-size:13px">lock_reset</span> Pwd Reset Requested</span>';
  }

  /* Actions */
  let actionsHtml = '';
  if (isSuperAdmin) {
    actionsHtml = '<span class="text-xs text-muted">Protected</span>';
  } else {
    actionsHtml = `
      <div class="user-actions-cell">
        <select onchange="changeRole(${user.id}, this.value)">
          <option value="client" ${user.role === 'client' ? 'selected' : ''}>Client</option>
          <option value="admin"  ${user.role === 'admin'  ? 'selected' : ''}>Admin</option>
        </select>

        ${isClient ? `
        <button class="icon-btn ${user.is_flagged ? 'flagged' : ''}"
                onclick="toggleFlag(${user.id}, ${user.is_flagged ? 0 : 1})"
                title="${user.is_flagged ? 'Unflag' : 'Flag for fraud'}">
          <span class="material-symbols-outlined">${user.is_flagged ? 'flag' : 'outlined_flag'}</span>
        </button>` : ''}

        <button class="icon-btn ${!user.is_active ? 'inactive' : ''}"
                onclick="toggleActive(${user.id}, ${user.is_active ? 0 : 1})"
                title="${user.is_active ? 'Deactivate' : 'Activate'}">
          <span class="material-symbols-outlined">${user.is_active ? 'person_off' : 'person'}</span>
        </button>

        ${pwdPending ? `
        <button class="icon-btn pwd-action"
                onclick="openTmpModal(${user.id}, '${escapeAttr(user.full_name)}')"
                title="Set temporary password">
          <span class="material-symbols-outlined">key</span>
        </button>` : ''}

        <button class="icon-btn danger"
                onclick="openDelModal(${user.id}, '${escapeAttr(user.full_name)}')"
                title="Delete user">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
  }

  const rowClass = pwdPending ? 'class="row-pwd-request"' : '';
  return `
    <tr ${rowClass}>
      <td class="text-xs text-muted">#${user.id}</td>
      <td class="font-medium">${user.full_name}</td>
      <td class="text-sm">${user.email}</td>
      <td><span class="user-role-badge role-${user.role}">${user.role.replace('_', ' ')}</span></td>
      <td>${statusHtml}</td>
      <td class="text-xs text-muted">${date}</td>
      <td>${actionsHtml}</td>
    </tr>
  `;
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── API calls ──────────────────────────────────────────────────
async function changeRole(userId, newRole) {
  const res  = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole })
  });
  const data = await res.json();
  data.success ? loadUsers() : showAdminToast(data.error || 'Failed to change role', true);
}

async function toggleFlag(userId, flagValue) {
  const res  = await fetch(`/api/admin/users/${userId}/flag`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_flagged: flagValue })
  });
  const data = await res.json();
  data.success ? loadUsers() : showAdminToast(data.error || 'Failed to update flag', true);
}

async function toggleActive(userId, activeValue) {
  const res  = await fetch(`/api/admin/users/${userId}/active`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: activeValue })
  });
  const data = await res.json();
  data.success ? loadUsers() : showAdminToast(data.error || 'Failed to update status', true);
}

// ── Temp Password Modal ────────────────────────────────────────
function openTmpModal(userId, userName) {
  _pendingTmpUserId = userId;
  document.getElementById('tmp-modal-desc').textContent =
    `Enter a temporary password for ${userName}. They will be required to change it on next login.`;
  document.getElementById('tmp-password-input').value = '';
  document.getElementById('tmp-modal-backdrop').classList.add('open');
}

function closeTmpModal() {
  _pendingTmpUserId = null;
  document.getElementById('tmp-modal-backdrop').classList.remove('open');
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('tmp-password-input').value = pwd;
}

async function confirmTmpPassword() {
  const pwd = document.getElementById('tmp-password-input').value.trim();
  if (!pwd) { showAdminToast('Please enter a temporary password.', true); return; }

  const res  = await fetch(`/api/admin/users/${_pendingTmpUserId}/temp-password`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_password: pwd })
  });
  const data = await res.json();
  if (data.success) {
    closeTmpModal();
    showAdminToast('Temporary password set successfully.');
    loadUsers();
  } else {
    showAdminToast(data.error || 'Failed to set temporary password', true);
  }
}

// ── Delete Modal ───────────────────────────────────────────────
function openDelModal(userId, userName) {
  _pendingDelUserId = userId;
  document.getElementById('del-modal-desc').textContent =
    `Are you sure you want to permanently delete "${userName}"? This cannot be undone.`;
  document.getElementById('del-modal-backdrop').classList.add('open');
}

function closeDelModal() {
  _pendingDelUserId = null;
  document.getElementById('del-modal-backdrop').classList.remove('open');
}

async function confirmDelete() {
  const res  = await fetch(`/api/admin/users/${_pendingDelUserId}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) {
    closeDelModal();
    showAdminToast('User deleted.');
    loadUsers();
  } else {
    showAdminToast(data.error || 'Failed to delete user', true);
  }
}

// ── Modal Bindings ─────────────────────────────────────────────
function bindModals() {
  document.getElementById('tmp-modal-close').addEventListener('click', closeTmpModal);
  document.getElementById('tmp-modal-cancel').addEventListener('click', closeTmpModal);
  document.getElementById('tmp-modal-confirm').addEventListener('click', confirmTmpPassword);
  document.getElementById('tmp-generate-btn').addEventListener('click', generateTempPassword);
  document.getElementById('tmp-modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('tmp-modal-backdrop')) closeTmpModal();
  });

  document.getElementById('del-modal-close').addEventListener('click', closeDelModal);
  document.getElementById('del-modal-cancel').addEventListener('click', closeDelModal);
  document.getElementById('del-modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('del-modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('del-modal-backdrop')) closeDelModal();
  });
}
