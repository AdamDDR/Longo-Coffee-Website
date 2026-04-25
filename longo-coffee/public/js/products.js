let allProducts       = [];
let selectedImageFile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('/admin/products')) return;
  initProductsPage();
});

async function initProductsPage() {
  await loadProducts();
  document.getElementById('search-products')?.addEventListener('input', renderProducts);
  document.getElementById('product-form')?.addEventListener('submit', handleProductFormSubmit);

  const imageInput = document.getElementById('prod-image');
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('Image must be under 5MB', true);
        imageInput.value = '';
        return;
      }
      selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = document.getElementById('image-preview');
        const prompt  = document.getElementById('upload-prompt');
        const area    = document.getElementById('image-upload-area');
        preview.src           = ev.target.result;
        preview.style.display = 'block';
        prompt.style.display  = 'none';
        area.classList.add('has-image');
      };
      reader.readAsDataURL(file);
    });
  }
}

async function loadProducts() {
  try {
    const res   = await fetch('/api/products?include_inactive=true');
    const data  = await res.json();
    allProducts = Array.isArray(data) ? data.filter(p => !p.is_deleted) : [];
    renderProducts();
  } catch {
    const tbody = document.getElementById('products-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-negative">Failed to load products</td></tr>';
  }
}

function renderProducts() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const searchTerm = (document.getElementById('search-products')?.value || '').toLowerCase();
  const filtered   = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-8">No products found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let stockCell;
    if (p.stock_qty < 10)      stockCell = `<span class="badge badge--critical">${p.stock_qty} left</span>`;
    else if (p.stock_qty < 20) stockCell = `<span class="badge badge--low">${p.stock_qty} left</span>`;
    else                       stockCell = `<span class="text-muted">${p.stock_qty}</span>`;

    const imageCell = p.image_path
      ? `<img src="${escHtml(p.image_path)}" alt="${escHtml(p.name)}" class="product-thumb"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="product-thumb-placeholder" style="display:none"><span class="material-symbols-outlined">image</span></div>`
      : `<div class="product-thumb-placeholder"><span class="material-symbols-outlined">image</span></div>`;

    const nameCell = `
      <div class="font-medium">${escHtml(p.name)}</div>
      <div class="text-xs text-muted" style="display:flex;gap:4px;align-items:center;margin-top:2px;">
        ${p.sku ? escHtml(p.sku) : 'No SKU'}
        ${!p.is_active ? '<span class="badge badge--inactive">Inactive</span>' : ''}
      </div>`;

    const costCell = p.cost_egp > 0
      ? `<span class="text-muted">EGP ${Number(p.cost_egp).toLocaleString()}</span>`
      : `<span class="text-xs text-muted">—</span>`;

    const safeProduct = JSON.stringify(p).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

    return `
      <tr class="${!p.is_active ? 'product-row--inactive' : ''}">
        <td>${imageCell}</td>
        <td>${nameCell}</td>
        <td>
          <div class="text-sm">${escHtml(p.category)}</div>
          <div class="text-xs text-muted">${p.roast_level ? escHtml(p.roast_level) : ''}${p.origin ? ' · ' + escHtml(p.origin) : ''}</div>
        </td>
        <td class="font-medium">EGP ${Number(p.price_egp).toLocaleString()}</td>
        <td>${costCell}</td>
        <td>${stockCell}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-ghost text-xs py-1 px-2"
              onclick='editProduct(JSON.parse(this.dataset.product))'
              data-product='${safeProduct}'>Edit</button>
            <button class="btn btn-ghost text-xs py-1 px-2 text-negative"
              onclick="deleteProduct(${p.id})">
              ${p.is_active ? 'Deactivate' : 'Delete'}
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id  = document.getElementById('prod-id').value;
  const btn = document.getElementById('prod-submit-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const formData = new FormData();
  [
    ['name',        'prod-name'],
    ['price_egp',   'prod-price'],
    ['cost_egp',    'prod-cost'],
    ['stock_qty',   'prod-stock'],
    ['category',    'prod-category'],
    ['roast_level', 'prod-roast'],
    ['origin',      'prod-origin'],
    ['material',    'prod-material'],
    ['weight',      'prod-weight'],
    ['color',       'prod-color'],
    ['size',        'prod-size'],
    ['sku',         'prod-sku'],
    ['description', 'prod-desc'],
  ].forEach(([field, elemId]) => {
    const el = document.getElementById(elemId);
    if (el) formData.append(field, el.value || '');
  });

  if (selectedImageFile) {
    formData.append('image', selectedImageFile);
  } else {
    const existing = document.getElementById('prod-existing-image').value;
    if (existing) formData.append('image_path', existing);
  }

  try {
    const res = await fetch(id ? `/api/products/${id}` : '/api/products', {
      method: id ? 'PUT' : 'POST',
      body:   formData
    });
    if (res.ok) {
      closeModal('product-modal');
      showAdminToast(id ? 'Product updated' : 'Product created');
      await loadProducts();
    } else {
      const err = await res.json();
      showAdminToast(err.error || 'Failed to save product', true);
    }
  } catch { showAdminToast('Error saving product', true); }

  btn.disabled = false; btn.textContent = 'Save Product';
}

window.updateProductFields = function () {
  const cat         = document.getElementById('prod-category')?.value;
  const beansFields = ['field-roast', 'field-origin'];
  const equipFields = ['field-material', 'field-weight'];
  const merchFields = ['field-color', 'field-size'];
  [...beansFields, ...equipFields, ...merchFields].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  if (cat === 'Beans')            beansFields.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  else if (cat === 'Equipment')   equipFields.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  else if (cat === 'Merchandise') merchFields.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
};

window.removeImage = function (e) {
  e.preventDefault(); e.stopPropagation();
  selectedImageFile = null;
  const imageInput = document.getElementById('prod-image');
  const preview    = document.getElementById('image-preview');
  const prompt     = document.getElementById('upload-prompt');
  const area       = document.getElementById('image-upload-area');
  if (imageInput) imageInput.value = '';
  if (preview)    { preview.src = ''; preview.style.display = 'none'; }
  if (prompt)     prompt.style.display = 'flex';
  if (area)       area.classList.remove('has-image');
  const existing = document.getElementById('prod-existing-image');
  if (existing) existing.value = '';
};

window.openProductModal = function () {
  document.getElementById('product-form')?.reset();
  document.getElementById('prod-id').value             = '';
  document.getElementById('prod-existing-image').value = '';
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  selectedImageFile = null;
  window.removeImage({ preventDefault: () => {}, stopPropagation: () => {} });
  window.updateProductFields();
  openModal('product-modal');
};

window.editProduct = function (product) {
  const fields = {
    'prod-id':             product.id,
    'prod-name':           product.name,
    'prod-price':          product.price_egp,
    'prod-cost':           product.cost_egp    || '',
    'prod-stock':          product.stock_qty,
    'prod-category':       product.category,
    'prod-roast':          product.roast_level || '',
    'prod-origin':         product.origin      || '',
    'prod-material':       product.material    || '',
    'prod-weight':         product.weight      || '',
    'prod-color':          product.color       || '',
    'prod-size':           product.size        || '',
    'prod-sku':            product.sku         || '',
    'prod-desc':           product.description || '',
    'prod-existing-image': product.image_path  || ''
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  selectedImageFile = null;
  const preview = document.getElementById('image-preview');
  const prompt  = document.getElementById('upload-prompt');
  const area    = document.getElementById('image-upload-area');
  if (product.image_path) {
    preview.src = product.image_path; preview.style.display = 'block';
    prompt.style.display = 'none'; area.classList.add('has-image');
  } else {
    preview.src = ''; preview.style.display = 'none';
    prompt.style.display = 'flex'; area.classList.remove('has-image');
  }
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  window.updateProductFields();
  openModal('product-modal');
};

window.deleteProduct = async function (id) {
  const product = allProducts.find(p => p.id === id);
  const msg = product?.is_active
    ? 'Deactivate this product? It will be hidden from the storefront.'
    : 'Permanently delete this product?';
  if (!confirm(msg)) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showAdminToast(product?.is_active ? 'Product deactivated' : 'Product deleted');
      await loadProducts();
    }
  } catch { showAdminToast('Failed to update product', true); }
};

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}