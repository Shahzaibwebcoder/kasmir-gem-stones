/* ============================================================
   Kashmir Gems — app.js
   Handles: product rendering, category filtering, WhatsApp
   checkout modal, and admin panel (add product via API).
   ============================================================ */

'use strict';

// ── Constants ─────────────────────────────────────────────
const WA_NUMBER  = '923498578805';
const PRODUCTS_URL = 'data/products.json';
const ADD_PRODUCT_API = '/api/add-product';
const ADMIN_PASSWORD  = '5858';

// ── State ─────────────────────────────────────────────────
let allProducts = [];
let activeCategory = 'all';
let selectedProduct = null;

// ── DOM Refs ──────────────────────────────────────────────
const productsGrid      = document.getElementById('productsGrid');
const buyModal          = document.getElementById('buyModal');
const buyModalClose     = document.getElementById('buyModalClose');
const orderForm         = document.getElementById('orderForm');
const modalProductImg   = document.getElementById('modalProductImg');
const modalProductName  = document.getElementById('modalProductName');
const modalProductPrice = document.getElementById('modalProductPrice');

const adminTrigger  = document.getElementById('adminTrigger');
const passOverlay   = document.getElementById('passOverlay');
const passInput     = document.getElementById('adminPassInput');
const passConfirm   = document.getElementById('passConfirmBtn');
const adminOverlay  = document.getElementById('adminOverlay');
const adminClose    = document.getElementById('adminClose');
const adminForm     = document.getElementById('adminForm');
const adminImage    = document.getElementById('adminImage');
const adminImgPrev  = document.getElementById('adminImgPreview');
const adminSubmitBtn = document.getElementById('adminSubmitBtn');

const toast         = document.getElementById('toast');

// ── Utilities ─────────────────────────────────────────────
function formatPKR(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

function openModal(overlay) {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Product Fetching ───────────────────────────────────────
async function fetchProducts() {
  try {
    const res = await fetch(PRODUCTS_URL + '?_=' + Date.now());
    if (!res.ok) throw new Error('Failed to load products');
    allProducts = await res.json();
    renderProducts(allProducts);
  } catch (err) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="icon">😔</div>
        <p>Could not load products. Please try again later.</p>
      </div>`;
    console.error(err);
  }
}

// ── Product Rendering ──────────────────────────────────────
function renderProducts(products) {
  if (!products.length) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>No products found in this category.</p>
      </div>`;
    return;
  }

  productsGrid.innerHTML = products.map(p => `
    <article class="product-card" role="listitem">
      <div class="product-img-wrap">
        <img
          src="${escapeHtml(p.image)}"
          alt="${escapeHtml(p.name)}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=60'"
        />
        <span class="product-badge">${escapeHtml(p.category)}</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="product-footer">
          <div class="product-price">
            ${formatPKR(p.price)}
            <span>PKR</span>
          </div>
          <button
            class="buy-btn"
            data-id="${escapeHtml(p.id)}"
            aria-label="Buy ${escapeHtml(p.name)}"
          >
            <i class="ph ph-shopping-bag"></i>
            Buy Now
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // Attach buy button events
  productsGrid.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => openBuyModal(btn.dataset.id));
  });
}

// Minimal XSS guard
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Category Filtering ─────────────────────────────────────
function applyFilter(category) {
  activeCategory = category;
  const filtered = category === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === category);
  renderProducts(filtered);

  // Sync all filter buttons on page
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.category));
});

// ── WhatsApp Buy Modal ─────────────────────────────────────
function openBuyModal(productId) {
  selectedProduct = allProducts.find(p => p.id === productId);
  if (!selectedProduct) return;

  modalProductImg.src   = selectedProduct.image;
  modalProductImg.alt   = selectedProduct.name;
  modalProductName.textContent  = selectedProduct.name;
  modalProductPrice.textContent = formatPKR(selectedProduct.price);

  openModal(buyModal);
  document.getElementById('customerName').focus();
}

buyModalClose.addEventListener('click', () => closeModal(buyModal));

buyModal.addEventListener('click', e => {
  if (e.target === buyModal) closeModal(buyModal);
});

orderForm.addEventListener('submit', e => {
  e.preventDefault();

  const name    = document.getElementById('customerName').value.trim();
  const phone   = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  if (!name || !phone || !address) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  if (!selectedProduct) return;

  const text = encodeURIComponent(
    `🛒 *New Order — Kashmir Gems*\n\n` +
    `*Product:* ${selectedProduct.name}\n` +
    `*Category:* ${selectedProduct.category}\n` +
    `*Price:* ${formatPKR(selectedProduct.price)}\n\n` +
    `👤 *Customer Details*\n` +
    `*Name:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Address:* ${address}\n\n` +
    `Please confirm my order. Thank you!`
  );

  window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank');
  closeModal(buyModal);
  orderForm.reset();
  showToast('Redirecting to WhatsApp… 💬', 'success');
});

// ── Admin Password Gate ────────────────────────────────────
adminTrigger.addEventListener('click', () => {
  passInput.value = '';
  openModal(passOverlay);
  setTimeout(() => passInput.focus(), 320);
});

passOverlay.addEventListener('click', e => {
  if (e.target === passOverlay) closeModal(passOverlay);
});

function checkPassword() {
  if (passInput.value === ADMIN_PASSWORD) {
    closeModal(passOverlay);
    openModal(adminOverlay);
    passInput.value = '';
  } else {
    passInput.value = '';
    passInput.style.borderColor = '#e74c3c';
    showToast('Incorrect password.', 'error');
    setTimeout(() => { passInput.style.borderColor = ''; }, 1500);
  }
}

passConfirm.addEventListener('click', checkPassword);
passInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });

// ── Admin Panel ────────────────────────────────────────────
adminClose.addEventListener('click', () => closeModal(adminOverlay));
adminOverlay.addEventListener('click', e => {
  if (e.target === adminOverlay) closeModal(adminOverlay);
});

// Image preview
adminImage.addEventListener('change', () => {
  const file = adminImage.files[0];
  if (!file) { adminImgPrev.style.display = 'none'; return; }
  const reader = new FileReader();
  reader.onload = () => {
    adminImgPrev.src = reader.result;
    adminImgPrev.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

adminForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name        = document.getElementById('adminName').value.trim();
  const price       = document.getElementById('adminPrice').value.trim();
  const category    = document.getElementById('adminCategory').value;
  const description = document.getElementById('adminDescription').value.trim();
  const imageFile   = adminImage.files[0];

  if (!name || !price || !category || !imageFile) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Convert image → base64
  const imageBase64 = await fileToBase64(imageFile);
  const imageExtension = imageFile.name.split('.').pop().toLowerCase();

  adminSubmitBtn.disabled = true;
  adminSubmitBtn.innerHTML = '<i class="ph ph-spinner"></i> Uploading…';

  try {
    const res = await fetch(ADD_PRODUCT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, category, description, imageBase64, imageExtension }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Upload failed');

    showToast(`"${name}" added successfully! ✅`, 'success');
    closeModal(adminOverlay);
    adminForm.reset();
    adminImgPrev.style.display = 'none';

    // Reload products
    await fetchProducts();
    applyFilter(activeCategory);

  } catch (err) {
    console.error(err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    adminSubmitBtn.disabled = false;
    adminSubmitBtn.innerHTML = '<i class="ph ph-plus-circle"></i> Add Product';
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Keyboard accessibility (Escape closes modals) ─────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (buyModal.classList.contains('open'))   closeModal(buyModal);
    if (adminOverlay.classList.contains('open')) closeModal(adminOverlay);
    if (passOverlay.classList.contains('open')) closeModal(passOverlay);
  }
});

// ── Smooth scroll for hero CTA ─────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Init ──────────────────────────────────────────────────
fetchProducts();
