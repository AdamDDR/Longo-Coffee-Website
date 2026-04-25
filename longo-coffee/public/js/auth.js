/**
 * Longo Coffee — auth.js
 * Handles: Login/Signup tabs, Forgot Password, Reset Password
 */

document.addEventListener('DOMContentLoaded', () => {
  initAuthPage();
  initForgotPassword();
  initResetPassword();
});


/* ============================================================
   Login & Sign Up (auth.html)
   ============================================================ */
function initAuthPage() {
  const loginTab    = document.getElementById('tab-login');
  const signupTab   = document.getElementById('tab-signup');
  const loginForm   = document.getElementById('form-login');
  const signupForm  = document.getElementById('form-signup');
  const tabIndicator = document.getElementById('tab-indicator');
  const errorBox    = document.getElementById('auth-error');

  if (!loginTab || !signupTab || !loginForm || !signupForm) return;

  // ---- Error helpers ----
  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function hideError() {
    errorBox?.classList.remove('show');
  }

  // ---- Tab switching ----
  function switchTab(tab) {
    hideError();
    if (tab === 'login') {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      tabIndicator.style.left  = '0';
      tabIndicator.style.width = '50%';
    } else {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      tabIndicator.style.left  = '50%';
      tabIndicator.style.width = '50%';
    }
  }

  loginTab.addEventListener('click',  () => switchTab('login'));
  signupTab.addEventListener('click', () => switchTab('signup'));
  switchTab('login');

  // ---- Password toggles ----
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon  = btn.querySelector('.material-symbols-outlined');
      if (!input) return;
      input.type     = input.type === 'password' ? 'text' : 'password';
      icon.textContent = input.type === 'password' ? 'visibility_off' : 'visibility';
    });
  });

  // ---- Password strength (sign-up) ----
  const SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  const signupPw  = document.getElementById('signup-password');
  const reqLength = document.getElementById('req-length');
  const reqSpecial = document.getElementById('req-special');

  if (signupPw && reqLength && reqSpecial) {
    signupPw.addEventListener('input', () => {
      const v = signupPw.value;

      const okLen = v.length >= 8;
      reqLength.textContent = (okLen ? '✓' : '✗') + ' At least 8 characters';
      reqLength.className   = okLen ? 'valid' : 'invalid';

      const okSpc = SPECIAL.test(v);
      reqSpecial.textContent = (okSpc ? '✓' : '✗') + ' At least 1 special character (!@#$%^&*)';
      reqSpecial.className   = okSpc ? 'valid' : 'invalid';
    });
  }

  function validatePassword(pw) {
    if (pw.length < 8)       return 'Password must be at least 8 characters long';
    if (!SPECIAL.test(pw))   return 'Password must contain at least 1 special character';
    return null;
  }

  // ---- Login submit ----
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email    = document.getElementById('login-email').value.toLowerCase().trim();
    const password = document.getElementById('login-password').value;
    const btn      = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) return showError('Please enter email and password');

    btn.disabled    = true;
    btn.textContent = 'Verifying…';

    try {
      const res  = await fetch('/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect;
      } else {
        showError(data.error || 'Login failed');
        btn.disabled    = false;
        btn.textContent = 'Sign In';
      }
    } catch {
      showError('Connection error. Please try again.');
      btn.disabled    = false;
      btn.textContent = 'Sign In';
    }
  });

  // ---- Sign up submit ----
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const fullName        = document.getElementById('signup-name').value.trim();
    const email           = document.getElementById('signup-email').value.toLowerCase().trim();
    const password        = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const btn             = signupForm.querySelector('button[type="submit"]');

    if (!fullName)                   return showError('Please enter your full name');
    if (!fullName.includes(' '))     return showError('Please enter both your first and last name');
    const pwErr = validatePassword(password);
    if (pwErr)                       return showError(pwErr);
    if (password !== confirmPassword) return showError('Passwords do not match');

    btn.disabled    = true;
    btn.textContent = 'Creating Account…';

    try {
      const res  = await fetch('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect;
      } else {
        showError(data.error || 'Registration failed');
        btn.disabled    = false;
        btn.textContent = 'Create Account';
      }
    } catch {
      showError('Connection error. Please try again.');
      btn.disabled    = false;
      btn.textContent = 'Create Account';
    }
  });
}


/* ============================================================
   Forgot Password (forgot-password.html)
   ============================================================ */
function initForgotPassword() {
  const form = document.getElementById('forgot-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email     = document.getElementById('forgot-email').value.trim();
    const btn       = document.getElementById('forgot-submit');
    const errEl     = document.getElementById('auth-error');
    const successEl = document.getElementById('reset-success');

    errEl.className     = 'auth-error';
    successEl.className = 'auth-success';
    btn.disabled        = true;
    btn.textContent     = 'Sending…';

    try {
      const res  = await fetch('/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.flow === 'admin') {
        successEl.innerHTML  = '<strong>Request submitted.</strong><br>Your reset request has been sent to the super admin. You will receive a temporary password shortly.';
        successEl.className  = 'auth-success show';
        form.style.display   = 'none';
      } else if (data.flow === 'client' && data.resetToken) {
        const link = `${window.location.origin}/reset-password?token=${data.resetToken}`;
        successEl.innerHTML  = `<strong>Reset link generated.</strong><br>Click below to set your new password:<br><br>
          <a href="${link}" style="color:var(--color-primary);font-weight:600;word-break:break-all;">${link}</a>`;
        successEl.className  = 'auth-success show';
        form.style.display   = 'none';
      } else {
        successEl.textContent = 'If an account exists with that email, a reset link has been generated.';
        successEl.className   = 'auth-success show';
        form.style.display    = 'none';
      }
    } catch {
      errEl.textContent = 'Connection error. Please try again.';
      errEl.className   = 'auth-error show';
    }

    btn.disabled    = false;
    btn.textContent = 'Send Reset Link';
  });
}


/* ============================================================
   Reset Password (reset-password.html)
   ============================================================ */
function initResetPassword() {
  const form = document.getElementById('reset-form');
  if (!form) return;

  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    form.style.display = 'none';
    const invalidMsg = document.getElementById('invalid-token-msg');
    if (invalidMsg) invalidMsg.style.display = 'block';
    return;
  }

  const SPECIAL    = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  const pwInput    = document.getElementById('new-password');
  const reqLength  = document.getElementById('reset-req-length');
  const reqSpecial = document.getElementById('reset-req-special');

  // ---- Live requirement checks ----
  if (pwInput && reqLength && reqSpecial) {
    pwInput.addEventListener('input', () => {
      const v = pwInput.value;

      const okLen = v.length >= 8;
      reqLength.textContent = (okLen ? '✓' : '✗') + ' At least 8 characters';
      reqLength.className   = 'password-requirements ' + (okLen ? 'valid' : 'invalid');

      const okSpc = SPECIAL.test(v);
      reqSpecial.textContent = (okSpc ? '✓' : '✗') + ' At least 1 special character (!@#$%^&*)';
      reqSpecial.className   = 'password-requirements ' + (okSpc ? 'valid' : 'invalid');
    });
  }

  // ---- Password toggles ----
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon  = btn.querySelector('.material-symbols-outlined');
      if (!input) return;
      input.type       = input.type === 'password' ? 'text' : 'password';
      icon.textContent = input.type === 'password' ? 'visibility_off' : 'visibility';
    });
  });

  // ---- Submit ----
  const errEl = document.getElementById('auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = pwInput.value;
    const confirm     = document.getElementById('confirm-password').value;
    const btn         = document.getElementById('reset-submit');

    errEl.className = 'auth-error';

    if (newPassword.length < 8 || !SPECIAL.test(newPassword)) {
      errEl.textContent = 'Password must be at least 8 characters and include a special character.';
      errEl.className   = 'auth-error show';
      return;
    }
    if (newPassword !== confirm) {
      errEl.textContent = 'Passwords do not match.';
      errEl.className   = 'auth-error show';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Saving…';

    try {
      const res  = await fetch('/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        form.innerHTML = `
          <div style="text-align:center;padding:var(--space-6);">
            <span class="material-symbols-outlined" style="font-size:48px;color:var(--color-positive);display:block;margin-bottom:var(--space-4);">check_circle</span>
            <p style="font-weight:600;margin-bottom:var(--space-2);">Password updated!</p>
            <p class="text-muted text-sm mb-5">You can now log in with your new password.</p>
            <a href="/auth" class="btn btn-primary">Go to Login</a>
          </div>`;
      } else {
        errEl.textContent = data.error || 'Failed to reset password.';
        errEl.className   = 'auth-error show';
        btn.disabled      = false;
        btn.textContent   = 'Set New Password';
      }
    } catch {
      errEl.textContent = 'Connection error. Please try again.';
      errEl.className   = 'auth-error show';
      btn.disabled      = false;
      btn.textContent   = 'Set New Password';
    }
  });
}
