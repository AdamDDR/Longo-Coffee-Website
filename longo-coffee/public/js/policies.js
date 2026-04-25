/**
 * policies.js — Admin Policies Page
 * Uses Quill.js rich-text editor (loaded from CDN in HTML)
 */

const POLICY_KEYS = ['shipping', 'payment', 'returns', 'privacy'];

// Quill toolbar config — friendly for non-technical admins
const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean']
];

// Fallback content if API returns nothing
const DEFAULTS = {
  shipping: `<h2>Processing Times</h2><p>All orders are processed within 1–2 business days after payment is confirmed.</p><h2>Delivery Areas</h2><p>We currently ship to all governorates in Egypt.</p><h2>Shipping Fees</h2><ul><li>Cairo &amp; Giza: EGP 35</li><li>All other governorates: EGP 60</li><li>Orders over EGP 500: Free shipping</li></ul>`,
  payment:  `<h2>Accepted Payment Methods</h2><ul><li><strong>Cash on Delivery (COD)</strong> — Available for all orders within Egypt.</li><li><strong>Credit / Debit Card</strong> — Visa and Mastercard accepted.</li><li><strong>Instapay</strong> — Egyptian instant payment accepted.</li></ul><h2>Payment Security</h2><p>Online payments are processed through encrypted, PCI-compliant systems.</p>`,
  returns:  `<h2>Return Window</h2><p>Returns are accepted within <strong>7 days</strong> of delivery for unopened, undamaged products.</p><h2>How to Request a Return</h2><p>Contact us via the support page with your order number and reason for return.</p>`,
  privacy:  `<h2>Information We Collect</h2><p>When you place an order or create an account, we collect your name, email, phone number, and shipping address.</p><h2>Data Sharing</h2><p>We do not sell, rent, or share your personal information with third parties.</p>`
};

const editors = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Initialise one Quill editor per policy card
  POLICY_KEYS.forEach(key => {
    editors[key] = new Quill(`#editor-${key}`, {
      theme:   'snow',
      modules: { toolbar: TOOLBAR },
      placeholder: `Write the ${key} policy here…`
    });
  });

  // Load saved content from API
  await loadPolicies();

  // Wire up Save buttons
  document.querySelectorAll('.policy-save-btn').forEach(btn => {
    btn.addEventListener('click', () => savePolicy(btn.dataset.key, btn));
  });
});

// ── Load ─────────────────────────────────────────────────────────
async function loadPolicies() {
  try {
    const res  = await fetch('/api/policies');
    const data = await res.json();

    POLICY_KEYS.forEach(key => {
      const html = (data[key] && data[key].content) ? data[key].content : DEFAULTS[key];
      editors[key].root.innerHTML = html;
    });
  } catch {
    showAdminToast('Failed to load policies — showing defaults', true);
    POLICY_KEYS.forEach(key => {
      editors[key].root.innerHTML = DEFAULTS[key];
    });
  }
}

// ── Save ──────────────────────────────────────────────────────────
async function savePolicy(key, btn) {
  const content   = editors[key].root.innerHTML;
  const savedEl   = document.getElementById(`saved-${key}`);
  const origInner = btn.innerHTML;

  btn.disabled  = true;
  btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Saving…';

  try {
    const res  = await fetch(`/api/admin/policies/${key}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content })
    });
    const data = await res.json();

    if (data.success) {
      savedEl.textContent = 'Saved ✓';
      savedEl.classList.add('visible');
      setTimeout(() => savedEl.classList.remove('visible'), 3000);
      showAdminToast('Policy updated');
    } else {
      showAdminToast(data.error || 'Failed to save', true);
    }
  } catch {
    showAdminToast('Connection error', true);
  }

  btn.disabled  = false;
  btn.innerHTML = origInner;
}
