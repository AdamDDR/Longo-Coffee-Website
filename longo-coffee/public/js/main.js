/**
 * Longo Coffee — Client Side Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCart();
  checkAuth();

  if (window.location.pathname.includes('/shop'))     initShop();
  if (window.location.pathname.includes('/contact'))  initContact();
  if (window.location.pathname.includes('/profile'))  initProfile();
  if (window.location.pathname.includes('/cart'))     initCartPage();
  if (window.location.pathname.includes('/policies')) initPolicies();
  if (window.location.pathname.includes('/checkout')) initCheckout();
});


// ── Navigation ────────────────────────────────────────────────────────────────
async function initNav() {
  const nav = document.querySelector('.client-nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
    const path = window.location.pathname;
    document.querySelectorAll('.client-nav__link').forEach(link => {
      const href = link.getAttribute('href');
      if (href !== '/' && path.includes(href)) link.classList.add('active');
      else if (path === '/' && href === '/')   link.classList.add('active');
    });
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res  = await fetch('/auth/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) window.location.href = data.redirect;
      } catch (err) { console.error('Logout failed', err); }
    });
  }
}


// ── Auth Check ────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res  = await fetch('/auth/me');
    const data = await res.json();
    const loginLink = document.getElementById('nav-login-link');
    if (data.authenticated && loginLink) {
      if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        loginLink.textContent = 'Admin Panel';
        loginLink.href = '/admin/dashboard';
      } else {
        loginLink.textContent = 'Profile';
        loginLink.href = '/profile';
      }
    }
  } catch (err) { console.error('Auth check failed'); }
}


// ── Cart (LocalStorage) ───────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('longo_cart')) || [];

function saveCart() {
  localStorage.setItem('longo_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.client-nav__cart-count').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

window.addToCart = function(productId, name, price, image, quantity = 1) {
  const existing = cart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product_id: productId, name, price, image, quantity });
  }
  saveCart();
  alert(`${quantity}x ${name} added to your cart!`);
};

function initCart() {
  updateCartCount();
}


// ── Cart Page ─────────────────────────────────────────────────────────────────
function initCartPage() {
  renderCartPage();
}

async function renderCartPage() {
  const container  = document.getElementById('cart-page-items');
  const countEl    = document.getElementById('cart-item-count');
  const subtotalEl = document.getElementById('cart-page-subtotal');
  const totalEl    = document.getElementById('cart-page-total');
  const actionsEl  = document.getElementById('cart-summary-actions');

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <span class="material-symbols-outlined cart-empty__icon">shopping_bag</span>
        <p class="cart-empty__title">Your cart is empty</p>
        <p class="cart-empty__sub">Looks like you haven't added anything yet.</p>
        <a href="/shop" class="btn-artisanal btn-artisanal--primary">Browse the Shop</a>
      </div>`;
    if (countEl)    countEl.textContent    = '0';
    if (subtotalEl) subtotalEl.textContent = 'EGP 0';
    if (totalEl)    totalEl.textContent    = 'EGP 0';
    if (actionsEl)  actionsEl.innerHTML    = `
      <a href="/shop" class="cart-checkout-btn">
        <span>Go to Shop</span>
        <span class="material-symbols-outlined" style="font-size:18px;">storefront</span>
      </a>`;
    return;
  }

  let total = 0, itemCount = 0, html = '';
  cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    total     += lineTotal;
    itemCount += item.quantity;
    const imgHtml = item.image
      ? `<img class="cart-item-row__img" src="${item.image}" alt="${item.name}">`
      : `<div class="cart-item-row__img"></div>`;
    html += `
      <div class="cart-item-row" data-product-id="${item.product_id}">
        ${imgHtml}
        <div class="cart-item-row__info">
          <div class="cart-item-row__name">${item.name}</div>
          <div class="cart-item-row__variant">EGP ${item.price} / unit</div>
        </div>
        <div class="cart-item-row__controls">
          <div class="qty-control">
            <button class="qty-btn" data-action="decrease" data-id="${item.product_id}">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.product_id}">+</button>
          </div>
        </div>
        <div class="cart-item-row__price">EGP ${lineTotal.toLocaleString()}</div>
        <button class="cart-item-row__remove" data-action="remove" data-id="${item.product_id}">
          <span class="material-symbols-outlined" style="font-size:20px;">close</span>
        </button>
      </div>`;
  });

  container.innerHTML = html;
  if (countEl) countEl.textContent = itemCount;

  let shippingDisplay = '', grandTotal = total;
  if (total >= 500) {
    shippingDisplay = '<span style="color:var(--color-positive);font-weight:600;">Free</span>';
  } else {
    try {
      const authRes  = await fetch('/auth/me');
      const authData = await authRes.json();
      if (authData.authenticated) {
        const profRes  = await fetch('/auth/profile');
        const profData = await profRes.json();
        const addr     = (profData.shipping_address || '').toLowerCase();
        const isCairoGiza = addr.includes('cairo') || addr.includes('giza') ||
                            addr.includes('القاهرة') || addr.includes('الجيزة');
        const fee = isCairoGiza ? 35 : 60;
        grandTotal += fee;
        shippingDisplay = `EGP ${fee}`;
      } else {
        shippingDisplay = '<span style="color:var(--color-text-muted);font-size:var(--text-xs);">Calculated at checkout</span>';
      }
    } catch {
      shippingDisplay = '<span style="color:var(--color-text-muted);font-size:var(--text-xs);">Calculated at checkout</span>';
    }
  }

  if (subtotalEl) subtotalEl.textContent = 'EGP ' + total.toLocaleString();
  const shipEl = document.getElementById('cart-page-shipping');
  if (shipEl) shipEl.innerHTML = shippingDisplay;
  if (totalEl) totalEl.textContent = total >= 500 || grandTotal === total
    ? 'EGP ' + total.toLocaleString()
    : 'EGP ' + grandTotal.toLocaleString();

  if (actionsEl) actionsEl.innerHTML = `
    <a href="/checkout" class="cart-checkout-btn">
      <span>Proceed to Checkout</span>
      <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
    </a>
    <a href="/shop" class="cart-continue-link">Continue Shopping</a>`;

  container.addEventListener('click', handleCartAction);
}

async function handleCartAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action    = btn.dataset.action;
  const productId = parseInt(btn.dataset.id, 10);
  const item      = cart.find(i => i.product_id === productId);
  if (!item) return;
  if (action === 'increase')       item.quantity += 1;
  else if (action === 'decrease') { item.quantity -= 1; if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1); }
  else if (action === 'remove')    cart.splice(cart.indexOf(item), 1);
  saveCart();
  renderCartPage();
  const container = document.getElementById('cart-page-items');
  if (container) container.addEventListener('click', handleCartAction);
}

window.updateCartItem = function(index, delta) {
  if (cart[index]) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    if (window.location.pathname.includes('/cart')) renderCartPage();
  }
};

window.checkout = async function() {
  if (cart.length === 0) return alert('Cart is empty');
  try {
    const res  = await fetch('/auth/me');
    const data = await res.json();
    if (!data.authenticated) { alert('Please log in to checkout'); window.location.href = '/auth'; return; }
    window.location.href = '/checkout';
  } catch { alert('Please log in to checkout'); window.location.href = '/auth'; }
};



// ── Homepage ──────────────────────────────────────────────────────────────────
async function initHomepage() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  try {
    const res      = await fetch('/api/products');
    const products = await res.json();
    if (!products || products.length === 0) return;

    // Shuffle and pick 2
    const shuffled = products.sort(() => Math.random() - 0.5);
    const [large, small] = shuffled.slice(0, 2);

    function bentoLarge(p) {
      const img      = p.image_path ? `<img src="${p.image_path}" alt="${p.name}">` : '';
      const badge    = p.stock_qty < 20 && p.stock_qty > 0 ? '<span class="bento-item__badge">Low Stock</span>' : '';
      const subtitle = p.origin && p.roast_level ? `${p.origin} · ${p.roast_level} Roast` : (p.category || '');
      const escapedName = (p.name || '').replace(/'/g, "&#39;");
      const imgPath  = p.image_path ? `'${p.image_path}'` : 'null';
      return `
        <div class="bento-item bento-item--large animate-fade-up stagger-1"
          style="cursor:pointer;" onclick="window.location.href='/product/${p.id}'">
          <div class="bento-item__image">${img}${badge}</div>
          <div class="bento-item__body">
            <span class="bento-item__origin">${subtitle}</span>
            <h3 class="bento-item__title font-display-md">${p.name}</h3>
            <p class="bento-item__desc">${(p.description || '').slice(0, 120)}${p.description && p.description.length > 120 ? '…' : ''}</p>
            <div class="bento-item__footer">
              <span class="bento-item__price">EGP ${p.price_egp}</span>
              <button onclick="event.stopPropagation(); addToCart(${p.id}, '${escapedName}', ${p.price_egp}, ${imgPath})"
                class="bento-item__cart-btn" ${p.stock_qty === 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>`;
    }

    function bentoSmall(p) {
      const img      = p.image_path ? `<img src="${p.image_path}" alt="${p.name}">` : '';
      const subtitle = p.origin && p.roast_level ? `${p.origin} · ${p.roast_level} Roast` : (p.category || '');
      const escapedName = (p.name || '').replace(/'/g, "&#39;");
      const imgPath  = p.image_path ? `'${p.image_path}'` : 'null';
      return `
        <div class="bento-item bento-item--small animate-fade-up stagger-2"
          style="cursor:pointer;" onclick="window.location.href='/product/${p.id}'">
          <div class="bento-item__image bento-item__image--top">${img}</div>
          <div class="bento-item__body">
            <span class="bento-item__origin">${subtitle}</span>
            <h3 class="bento-item__title" style="font-size:var(--text-xl);">${p.name}</h3>
            <p class="bento-item__desc">${(p.description || '').slice(0, 80)}${p.description && p.description.length > 80 ? '…' : ''}</p>
            <div class="bento-item__footer">
              <span class="bento-item__price">EGP ${p.price_egp}</span>
              <button onclick="event.stopPropagation(); addToCart(${p.id}, '${escapedName}', ${p.price_egp}, ${imgPath})"
                class="bento-item__cart-btn" ${p.stock_qty === 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>`;
    }

    grid.innerHTML = bentoLarge(large) + (small ? bentoSmall(small) : '');
  } catch (err) {
    console.error('Failed to load featured products', err);
    // Leave skeleton as-is silently
  }
}

// ── Shop Page ─────────────────────────────────────────────────────────────────
async function initShop() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let searchTimer = null;

  function getFilters() {
    const search   = (document.getElementById('shop-search') || { value: '' }).value.trim();
    const category = (document.querySelector('input[name="category"]:checked') || { value: '' }).value;
    const roast    = (document.querySelector('input[name="roast"]:checked')    || { value: '' }).value;
    const origin   = (document.querySelector('input[name="origin"]:checked')   || { value: '' }).value;
    const inStock  = document.getElementById('in-stock-filter')?.checked || false;
    const maxPrice = parseInt((document.getElementById('price-range') || { value: '1000' }).value, 10);
    return { search, category, roast, origin, inStock, maxPrice };
  }

  async function fetchProducts() {
    grid.innerHTML = '<div class="skeleton skeleton-img" style="height:240px;width:100%;"></div>'.repeat(6);
    const { search, category, roast, origin, inStock, maxPrice } = getFilters();
    try {
      const params = new URLSearchParams();
      if (search)          params.append('search',   search);
      if (category)        params.append('category', category);
      if (roast)           params.append('roast',    roast);
      if (origin)          params.append('origin',   origin);
      if (inStock)         params.append('inStock',  '1');
      if (maxPrice < 1000) params.append('maxPrice', maxPrice);
      const url = '/api/products' + (params.toString() ? '?' + params.toString() : '');
      const res = await fetch(url);
      renderProducts(await res.json());
    } catch (err) {
      grid.innerHTML = '<p class="text-negative">Failed to load products.</p>';
      console.error(err);
    }
  }

  function renderProducts(products) {
    grid.innerHTML = '';
    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div class="shop-empty" style="grid-column:1/-1;">
          <span class="material-symbols-outlined">search_off</span>
          <p class="text-muted mt-2">No products match your filters.</p>
          <button class="btn btn-ghost mt-4" id="clear-empty-btn">Clear Filters</button>
        </div>`;
      document.getElementById('clear-empty-btn')?.addEventListener('click', () => {
        document.getElementById('clear-filters-btn')?.click();
      });
      return;
    }
    products.forEach((p, index) => {
      const delayClass  = 'stagger-' + ((index % 6) + 1);
      const imageHtml   = p.image_path ? `<img src="${p.image_path}" alt="${p.name}" class="product-card__image">` : '';
      const badgeHtml   = p.stock_qty === 0
        ? '<span class="product-card__badge" style="background:var(--color-negative);color:#fff;">Out of Stock</span>'
        : p.stock_qty < 20 ? '<span class="product-card__badge">Low Stock</span>' : '';
      const escapedName = p.name.replace(/'/g, '&#39;');
      const imgPath     = p.image_path ? `'${p.image_path}'` : 'null';
      const subtitle    = p.origin && p.roast_level ? `${p.origin} · ${p.roast_level} Roast` : (p.category || '');
      grid.innerHTML += `
        <div class="product-card animate-fade-up ${delayClass}" style="cursor:pointer;" onclick="window.location.href='/product/${p.id}'">
          <div class="product-card__image-container">${badgeHtml}${imageHtml}</div>
          <div class="product-card__body">
            <span class="product-card__tag">${subtitle}</span>
            <h3 class="product-card__name">${p.name}</h3>
            <div class="product-card__footer">
              <span class="product-card__price">EGP ${p.price_egp}</span>
              <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${p.id}, '${escapedName}', ${p.price_egp}, ${imgPath})"${p.stock_qty === 0 ? ' disabled' : ''}>Add to Cart</button>
            </div>
          </div>
        </div>`;
    });
  }

  const searchEl = document.getElementById('shop-search');
  if (searchEl) searchEl.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(fetchProducts, 350); });
  document.querySelectorAll('input[name="category"], input[name="roast"], input[name="origin"]').forEach(el => el.addEventListener('change', fetchProducts));
  document.getElementById('in-stock-filter')?.addEventListener('change', fetchProducts);

  const priceRange = document.getElementById('price-range');
  const priceLabel = document.getElementById('price-label');
  if (priceRange) {
    priceRange.addEventListener('input', () => {
      if (priceLabel) priceLabel.textContent = 'EGP ' + priceRange.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(fetchProducts, 300);
    });
  }

  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="category"]')[0].checked = true;
    document.querySelectorAll('input[name="roast"]')[0].checked    = true;
    document.querySelectorAll('input[name="origin"]')[0].checked   = true;
    if (document.getElementById('in-stock-filter')) document.getElementById('in-stock-filter').checked = false;
    if (priceRange) priceRange.value = 1000;
    if (priceLabel) priceLabel.textContent = 'EGP 1000';
    if (searchEl)   searchEl.value = '';
    fetchProducts();
  });

  const nav = document.getElementById('main-nav');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));

  fetchProducts();
}


// ── Contact Page ──────────────────────────────────────────────────────────────
async function showToast(msg, isError = false) {
  const el = document.getElementById('contact-toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast-banner show' + (isError ? ' error' : '');
  setTimeout(() => el.classList.remove('show'), 4000);
}

async function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('contact-name').value.trim();
    const email   = document.getElementById('contact-email').value.trim();
    const phone   = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value.trim();

    if (phone && !/^\d{10}$/.test(phone)) {
      showToast('Phone number must be exactly 10 digits after +20', true);
      return;
    }

    const btn       = document.getElementById('contact-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    try {
      const structuredMessage = [
        `From:    ${name}`,
        `Email:   ${email}`,
        phone ? `Phone:   +20 ${phone}` : null,
        `─────────────────────────────────`,
        ``,
        message
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, subject: subject || 'General Enquiry', message: structuredMessage })
      });

      if (res.status === 401) {
        showToast('Please sign in to send a message, or we need your email to track your ticket.', true);
        btn.disabled = false; btn.textContent = 'Send Message';
        return;
      }
      if (res.ok) {
        showToast("Message sent! We'll get back to you soon.");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to send message. Try again.', true);
      }
    } catch {
      showToast('Connection error. Please try again.', true);
    }
    btn.disabled = false; btn.textContent = 'Send Message';
  });
}


// ── Profile Page ──────────────────────────────────────────────────────────────
async function initProfile() {
  const ordersContainer = document.getElementById('profile-orders');
  const editProfileBtn  = document.getElementById('edit-profile-btn');
  const profileDisplay  = document.getElementById('profile-display');
  const profileEdit     = document.getElementById('profile-edit');
  const profileForm     = document.getElementById('profile-edit-form');

  if (!ordersContainer) return;

  // Load user info + welcome hero
  try {
    const profRes = await fetch('/auth/profile');
    if (profRes.ok) {
      const user = await profRes.json();
      const welcomeNameEl = document.getElementById('profile-welcome-name');
      if (welcomeNameEl) welcomeNameEl.textContent = user.full_name ? user.full_name.split(' ')[0] : 'back';
      document.getElementById('display-name').textContent    = user.full_name || '—';
      document.getElementById('display-address').textContent = user.shipping_address || 'No address saved.';
      document.getElementById('display-phone').textContent   = user.phone || 'No phone saved.';
      document.getElementById('edit-name').value    = user.full_name || '';
      document.getElementById('edit-address').value = user.shipping_address || '';
      document.getElementById('edit-phone').value   = user.phone ? user.phone.replace('+20 ', '').replace('+20', '') : '';
    }
  } catch(e) {}

  loadProfileTickets();

  // Edit toggle
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      profileDisplay.style.display = 'none';
      profileEdit.style.display    = 'block';
    });
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
      profileEdit.style.display    = 'none';
      profileDisplay.style.display = 'block';
    });
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName   = document.getElementById('edit-name').value.trim();
      const phoneInput = document.getElementById('edit-phone').value.trim();
      const address    = document.getElementById('edit-address').value.trim();

      if (!fullName.includes(' '))         return alert('Please enter your full name (first and last)');
      if (!/^\d{10,11}$/.test(phoneInput)) return alert('Please enter a valid 10 or 11 digit phone number');
      if (!address)                         return alert('Please provide your shipping address');

      const btn = document.getElementById('save-profile-btn');
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res = await fetch('/auth/profile', {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fullName, shippingAddress: address, phone: '+20 ' + phoneInput })
        });
        if (res.ok) { window.location.reload(); }
        else { alert('Failed to update profile.'); btn.disabled = false; btn.textContent = 'Save'; }
      } catch { alert('Connection error.'); btn.disabled = false; btn.textContent = 'Save'; }
    });
  }

  // Load orders
  try {
    const res = await fetch('/api/orders');
    if (res.status === 401) { window.location.href = '/auth'; return; }
    const orders = await res.json();
    if (!orders || orders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="text-align:center;padding:var(--space-12) var(--space-6);">
          <span class="material-symbols-outlined" style="font-size:40px;color:var(--color-text-faint);display:block;margin-bottom:var(--space-3);">receipt_long</span>
          <p class="text-muted">You have no orders yet.</p>
          <a href="/shop" class="btn btn-primary" style="margin-top:var(--space-4);">Start Shopping</a>
        </div>`;
      return;
    }
    ordersContainer.innerHTML = orders.map(o => {
      const date      = new Date(o.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' });
      const statusCls = o.status.toLowerCase().replace(/\s/g, '-');
      const canCancel = o.status === 'Pending';
      const items     = o.items.map(i => `<li>${i.quantity}× ${i.product_name}</li>`).join('');
      return `
        <div class="order-card animate-fade-up">
          <div class="order-card__header">
            <div class="order-card__meta">
              <span class="order-card__id">Order #${o.id.toString().padStart(4, '0')}</span>
              <span class="order-card__date">${date}</span>
            </div>
            <span class="badge badge--${statusCls}">${o.status}</span>
          </div>
          <div class="order-card__body">
            <div class="order-card__left">
              <p class="order-card__total">EGP ${Number(o.total_egp).toLocaleString()}</p>
              <ul class="order-card__items">${items}</ul>
            </div>
            ${canCancel ? `<button class="order-cancel-btn" data-id="${o.id}" onclick="cancelOrder(${o.id}, this)">Cancel Order</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    ordersContainer.innerHTML = '<p class="text-negative">Failed to load orders. Please refresh.</p>';
    console.error(err);
  }
}


// ── Support Tickets (Profile) ─────────────────────────────────────────────────
async function loadProfileTickets() {
  const container = document.getElementById('profile-tickets');
  if (!container) return;

  try {
    const res = await fetch('/api/tickets');
    if (res.status === 401) { container.innerHTML = ''; return; }
    const tickets = await res.json();

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `
        <div class="profile-empty-state">
          <span class="material-symbols-outlined">support_agent</span>
          <p class="text-muted">No support tickets yet.</p>
          <a href="/contact" class="btn btn-ghost" style="margin-top:var(--space-3);">Contact Support</a>
        </div>`;
      return;
    }

    container.innerHTML = tickets.map(t => {
      const date      = new Date(t.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' });
      const statusCls = (t.status || 'open').toLowerCase().replace(/\s/g, '-');
      const canClose  = t.status !== 'Closed' && t.status !== 'Resolved';
      // Strip the metadata header from the preview (everything before the divider line)
      const rawMsg    = t.message || '';
      const bodyStart = rawMsg.indexOf('─');
      const preview   = (bodyStart > -1 ? rawMsg.slice(bodyStart).replace(/^─+\n*/,'') : rawMsg).trim().slice(0, 120);

      return `
        <div class="ticket-card animate-fade-up" data-ticket-id="${t.id}" style="cursor:pointer;" onclick="window.location.href='/ticket/${t.id}'">
          <div class="ticket-card__header">
            <div class="ticket-card__meta">
              <span class="ticket-card__id">Ticket #${t.id.toString().padStart(4,'0')}</span>
              <span class="ticket-card__date">${date}</span>
            </div>
            <span class="badge badge--${statusCls}">${t.status || 'Open'}</span>
          </div>
          <div class="ticket-card__body">
            <p class="ticket-card__subject">${t.subject || 'No subject'}</p>
            <p class="ticket-card__preview">${preview}${rawMsg.length > 120 ? '…' : ''}</p>
          </div>
          <div class="ticket-card__footer">
            <span class="ticket-card__cta">
              <span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">chat</span>
              View conversation →
            </span>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-negative">Failed to load tickets.</p>';
    console.error(err);
  }
}

window.closeTicket = async function(ticketId, btn) {
  if (!confirm('Close this support ticket?')) return;
  btn.disabled = true; btn.textContent = 'Closing…';
  try {
    const res  = await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Closed' })
    });
    const data = await res.json();
    if (data.success) {
      const card  = btn.closest('.ticket-card');
      const badge = card.querySelector('.badge');
      if (badge) { badge.textContent = 'Closed'; badge.className = 'badge badge--closed'; }
      btn.closest('.ticket-card__footer').remove();
    } else { alert(data.error || 'Could not close ticket.'); btn.disabled = false; btn.textContent = 'Close Ticket'; }
  } catch { alert('Connection error.'); btn.disabled = false; btn.textContent = 'Close Ticket'; }
};

window.cancelOrder = async function(orderId, btn) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  btn.disabled = true; btn.textContent = 'Cancelling…';
  try {
    const res  = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PUT' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      const card  = btn.closest('.order-card');
      const badge = card.querySelector('.badge');
      if (badge) { badge.textContent = 'Cancelled'; badge.className = 'badge badge--cancelled'; }
      btn.remove();
    } else { alert(data.error || 'Could not cancel order. Please contact support.'); btn.disabled = false; btn.textContent = 'Cancel Order'; }
  } catch { alert('Connection error. Please try again.'); btn.disabled = false; btn.textContent = 'Cancel Order'; }
};


// ── Product Details ───────────────────────────────────────────────────────────
window.initProductDetails = async function(productId) {
  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error('Not found');
    const p = await res.json();

    document.title = `${p.name} | Longo Coffee`;

    const tagEl = document.getElementById('prod-tag');
    if (tagEl) tagEl.textContent = p.origin && p.roast_level
      ? `${p.origin} · ${p.roast_level} Roast` : (p.category || '');

    const titleEl = document.getElementById('prod-title');
    if (titleEl) titleEl.textContent = p.name;

    const priceEl = document.getElementById('prod-price');
    if (priceEl) priceEl.textContent = `EGP ${p.price_egp}`;

    const descEl = document.getElementById('prod-desc');
    if (descEl) descEl.textContent = p.description || '';

    const imgEl = document.getElementById('prod-image');
    if (imgEl && p.image_path) {
      imgEl.innerHTML = `<img src="${p.image_path}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    const stockBadge = document.getElementById('prod-stock-badge');
    if (stockBadge && p.stock_qty < 20 && p.stock_qty > 0) {
      stockBadge.style.display = 'inline-block';
    }

    // Qty buttons
    const qtyInput = document.getElementById('prod-qty');
    document.getElementById('qty-dec')?.addEventListener('click', () => {
      const v = parseInt(qtyInput.value) || 1;
      if (v > 1) qtyInput.value = v - 1;
    });
    document.getElementById('qty-inc')?.addEventListener('click', () => {
      const v = parseInt(qtyInput.value) || 1;
      if (v < 10) qtyInput.value = v + 1;
    });

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) {
      if (p.stock_qty === 0) {
        addBtn.disabled = true;
        addBtn.textContent = 'Out of Stock';
      } else {
        addBtn.addEventListener('click', () => {
          const qty = parseInt(qtyInput?.value) || 1;
          addToCart(p.id, p.name, p.price_egp, p.image_path, qty);
        });
      }
    }

  } catch(e) {
    const container = document.getElementById('product-container');
    if (container) container.innerHTML = `
      <div style="text-align:center;padding:var(--space-16) var(--space-6);">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--color-text-faint);display:block;margin-bottom:var(--space-4);">error</span>
        <p class="text-negative">Product not found.</p>
        <a href="/shop" class="btn btn-ghost" style="margin-top:var(--space-4);">Back to Shop</a>
      </div>`;
  }
};

// Auto-init on product pages
if (window.location.pathname.startsWith('/product/')) {
  document.addEventListener('DOMContentLoaded', () => {
    const id = window.location.pathname.split('/').pop();
    if (id && !isNaN(id)) window.initProductDetails(id);
  });
}


// ── Policies Page ─────────────────────────────────────────────────────────────
async function initPolicies() {
  // Bind tab clicks
  document.querySelectorAll('.policy-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.policy-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.policy-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const section = document.getElementById('policy-' + btn.dataset.policy);
      if (section) section.classList.add('active');
      history.replaceState(null, '', '#' + btn.dataset.policy);
    });
  });

  // Open from URL hash
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const btn = document.querySelector(`.policy-tab[data-policy="${hash}"]`);
    if (btn) btn.click();
  }

  // Load content from API
  try {
    const res = await fetch('/api/policies');
    if (!res.ok) return;
    const data = await res.json();
    ['shipping', 'payment', 'returns', 'privacy'].forEach(key => {
      const el = document.getElementById('content-' + key);
      if (el && data[key]?.content) el.innerHTML = data[key].content;
    });
  } catch { /* fallback content stays */ }
}
// ── Checkout Page ─────────────────────────────────────────────────────────────
async function initCheckout() {
  const cart = JSON.parse(localStorage.getItem('longo_cart')) || [];
  if (cart.length === 0) { window.location.href = '/cart'; return; }

  let isAuthenticated = false;
  try {
    const authRes  = await fetch('/auth/me');
    const authData = await authRes.json();
    isAuthenticated = authData.authenticated;
    if (isAuthenticated) {
      const profRes = await fetch('/auth/profile');
      const user    = await profRes.json();
      document.getElementById('checkout-name').value    = user.full_name || '';
      document.getElementById('checkout-email').value   = user.email || '';
      document.getElementById('checkout-phone').value   = user.phone ? user.phone.replace('+20 ', '').replace('+20', '') : '';
      document.getElementById('checkout-address').value = user.shipping_address || '';
    } else {
      const emailEl = document.getElementById('checkout-email');
      emailEl.removeAttribute('readonly');
      emailEl.style.background = '';
    }
  } catch(e) {}

  let subtotal = 0;
  const itemsContainer = document.getElementById('checkout-items');
  itemsContainer.innerHTML = cart.map(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    return `
      <div class="summary-item">
        <div class="summary-item-img" style="${item.image ? `background-image:url('${item.image}')` : ''}"></div>
        <div class="summary-item-info">
          <h4>${item.name}</h4>
          <span>Qty: ${item.quantity} × EGP ${item.price}</span>
        </div>
        <span class="font-medium text-sm" style="white-space:nowrap;">EGP ${(item.price * item.quantity).toLocaleString()}</span>
      </div>`;
  }).join('');

  const shippingFee = subtotal >= 500 ? 0 : 50;
  const grandTotal  = subtotal + shippingFee;
  document.getElementById('checkout-subtotal').textContent = 'EGP ' + subtotal.toLocaleString();
  document.getElementById('checkout-shipping').textContent = shippingFee === 0 ? 'Free' : 'EGP ' + shippingFee;
  document.getElementById('checkout-total').textContent    = 'EGP ' + grandTotal.toLocaleString();

  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input[type="radio"]').checked = true;
    });
  });

  const errorBox = document.getElementById('checkout-error');
  document.getElementById('place-order-btn').addEventListener('click', async () => {
    errorBox.classList.remove('show');
    const name          = document.getElementById('checkout-name').value.trim();
    const email         = document.getElementById('checkout-email').value.trim();
    const phoneInput    = document.getElementById('checkout-phone').value.trim();
    const countryCode   = document.getElementById('checkout-country-code').value;
    const address       = document.getElementById('checkout-address').value.trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!name)                              { errorBox.textContent = 'Please enter your full name.';                          errorBox.classList.add('show'); document.getElementById('checkout-name').focus();  return; }
    if (!name.includes(' '))               { errorBox.textContent = 'Please enter both your first and last name.';            errorBox.classList.add('show'); document.getElementById('checkout-name').focus();  return; }
    if (!email)                             { errorBox.textContent = 'Please enter your email address.';                      errorBox.classList.add('show'); return; }
    if (!phoneInput||!/^\d{10}$/.test(phoneInput)) { errorBox.textContent = 'Please enter a valid 10-digit phone number after +20.'; errorBox.classList.add('show'); document.getElementById('checkout-phone').focus(); return; }
    if (!address)                           { errorBox.textContent = 'Please enter your shipping address.';                   errorBox.classList.add('show'); document.getElementById('checkout-address').focus(); return; }

    const phone = countryCode + ' ' + phoneInput;
    const btn   = document.getElementById('place-order-btn');
    btn.disabled = true; btn.textContent = 'Processing...';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:            cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
          shipping_address: { name, phone, address },
          payment_method:   paymentMethod,
          guest_name:       name,
          guest_email:      email,
          guest_phone:      phone
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('longo_cart');
        updateCartCount();
        const actionButtons = isAuthenticated
          ? `<a href="/profile" class="btn btn-primary">View My Orders</a><a href="/shop" class="btn btn-ghost">Continue Shopping</a>`
          : `<a href="/auth" class="btn btn-primary">Sign In to View Orders</a><a href="/shop" class="btn btn-ghost">Continue Shopping</a>`;
        document.getElementById('checkout-main').innerHTML = `
          <div class="checkout-success animate-fade-up">
            <span class="material-symbols-outlined success-icon">check_circle</span>
            <h2>Order Confirmed!</h2>
            <p class="text-muted mb-2">Order #${data.order_id.toString().padStart(4,'0')} has been placed.</p>
            <p class="text-muted mb-2">${paymentMethod === 'cod' ? 'Please have <strong>EGP ' + grandTotal.toLocaleString() + '</strong> ready for the delivery driver.' : 'Your payment has been processed securely.'}</p>
            <div class="checkout-success-actions">${actionButtons}</div>
          </div>`;
      } else {
        errorBox.textContent = data.error || 'Failed to place order.';
        errorBox.classList.add('show'); btn.disabled = false; btn.textContent = 'Place Order';
      }
    } catch {
      errorBox.textContent = 'Connection error. Please try again.';
      errorBox.classList.add('show'); btn.disabled = false; btn.textContent = 'Place Order';
    }
  });
}
