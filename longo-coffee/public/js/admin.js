/**
 * admin.js — Longo Admin Panel Core
 * Shared across ALL admin pages.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Sidebar active state ────────────────────────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) link.classList.add('active');
  });

  // ── Super Admin section visibility ──────────────────────────────
  (async () => {
    try {
      const res  = await fetch('/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user.role === 'super_admin') {
        // Show the users sidebar link (hidden by default)
        const usersLink = document.getElementById('users-link');
        if (usersLink) usersLink.style.display = 'flex';

        // Legacy support for any page still using sidebar-super-section
        const superSection = document.getElementById('sidebar-super-section');
        if (superSection) superSection.style.display = 'block';
      }
    } catch { /* silent */ }
  })();

  // ── Global fetch 401 guard ──────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function () {
    const response = await originalFetch.apply(this, arguments);
    if (response.status === 401 && response.url.includes('/api/admin')) {
      window.location.href = '/auth';
    }
    return response;
  };

  // ── Logout ──────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.href = '/auth';
    });
  }

  // ── Modals ──────────────────────────────────────────────────────
  window.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  };

  window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };

  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // ── Toast ───────────────────────────────────────────────────────
  window.showAdminToast = function (msg, isError = false) {
    const toast = document.querySelector('.admin-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = 'admin-toast show' + (isError ? ' error' : '');
    setTimeout(() => toast.classList.remove('show'), 3500);
  };

  // ── Password visibility toggles ─────────────────────────────────
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      const icon  = btn.querySelector('.material-symbols-outlined');
      if (!input) return;
      const isHidden   = input.type === 'password';
      input.type       = isHidden ? 'text'        : 'password';
      icon.textContent = isHidden ? 'visibility'  : 'visibility_off';
    });
  });

  // ── Page-specific init ──────────────────────────────────────────
  if (currentPath === '/admin/settings') initSettingsPage();
});



// ════════════════════════════════════════════════════════════════
//  SETTINGS PAGE
// ════════════════════════════════════════════════════════════════
async function initSettingsPage() {
  try {
    const res  = await fetch('/api/admin/settings');
    const user = await res.json();
    document.getElementById('setting-name').value  = user.full_name || '';
    document.getElementById('setting-email').value = user.email     || '';
    document.getElementById('setting-phone').value = user.phone
      ? user.phone.replace('+20 ', '').replace('+20', '') : '';
    document.getElementById('setting-role').value  = (user.role || '').replace('_', ' ');
  } catch (err) {
    console.error('Error loading settings', err);
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force_password_change') === 'true') {
    setTimeout(() => showAdminToast('For security, please change your password before continuing.', true), 500);
  }

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName   = document.getElementById('setting-name').value.trim();
    const phoneInput = document.getElementById('setting-phone').value.trim();
    if (!fullName.includes(' '))       return showAdminToast('Please enter your full name (first and last)', true);
    if (!/^\d{10}$/.test(phoneInput)) return showAdminToast('Please enter a valid 10-digit phone number', true);
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res  = await fetch('/api/admin/settings/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone: document.getElementById('setting-country-code').value + ' ' + phoneInput
        })
      });
      const data = await res.json();
      data.success
        ? showAdminToast('Profile updated successfully')
        : showAdminToast(data.error || 'Failed to save', true);
    } catch { showAdminToast('Connection error', true); }
    btn.disabled = false; btn.textContent = 'Save Changes';
  });

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById('current-password').value;
    const newPw     = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;
    if (!currentPw || !newPw || !confirmPw)  return showAdminToast('Please fill in all password fields', true);
    if (newPw.length < 8)                    return showAdminToast('New password must be at least 8 characters', true);
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPw))
                                             return showAdminToast('Password needs at least 1 special character', true);
    if (newPw !== confirmPw)                 return showAdminToast('Passwords do not match', true);
    const btn = document.getElementById('update-password-btn');
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
      const res  = await fetch('/api/admin/settings/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast('Password updated successfully');
        ['current-password', 'new-password', 'confirm-password'].forEach(id => {
          document.getElementById(id).value = '';
        });
        if (new URLSearchParams(window.location.search).get('force_password_change') === 'true') {
          setTimeout(() => { window.location.href = '/admin/dashboard'; }, 1500);
        }
      } else {
        showAdminToast(data.error || 'Failed to update password', true);
      }
    } catch { showAdminToast('Connection error', true); }
    btn.disabled = false; btn.textContent = 'Update Password';
  });
}
