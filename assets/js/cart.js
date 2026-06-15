/* ============================================================
   LUMIÈRE LUXURY SKINCARE — CART SYSTEM
   cart.js
   ============================================================ */

'use strict';

const CartSystem = (() => {

  /* ── Constants ───────────────────────────────────────────── */
  const STORAGE_KEY = 'lumiere_cart';
  const MAX_QTY     = 99;
  const MIN_QTY     = 1;

  /* ── State ───────────────────────────────────────────────── */
  let _cart    = [];   // [{ product, quantity, addedAt }]
  let _config  = {};
  let _listeners = [];

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  function init(config) {
    _config = config || {};
    _load();
    _renderDrawer();
    _bindDrawerEvents();
    _updateAllBadges();
  }

  /* ══════════════════════════════════════════════════════════
     STORAGE
  ══════════════════════════════════════════════════════════ */

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _cart = raw ? JSON.parse(raw) : [];
      // Validate structure
      _cart = _cart.filter(item =>
        item && item.product && typeof item.quantity === 'number'
      );
    } catch {
      _cart = [];
    }
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cart));
    } catch (e) {
      console.warn('Cart save failed:', e);
    }
  }

  /* ══════════════════════════════════════════════════════════
     CART OPERATIONS
  ══════════════════════════════════════════════════════════ */

  /**
   * Get the unique key for a product (SKU or id).
   */
  function _key(product) {
    return product.product_code || product.id || product.name_en || '';
  }

  /**
   * Find an existing cart item index by product key.
   */
  function _findIndex(product) {
    const k = _key(product);
    return _cart.findIndex(item => _key(item.product) === k);
  }

  /**
   * Add a product to the cart.
   * If already in cart, increments quantity.
   *
   * @param {Object} product  - product object from Google Sheets
   * @param {number} [qty=1]  - quantity to add
   * @returns {{ success, message, item }}
   */
  function addToCart(product, qty = 1) {
    if (!product) return { success: false, message: 'Invalid product.' };

    const stock = parseInt(product.stock_quantity) || 0;
    const idx   = _findIndex(product);

    if (stock === 0) {
      _showToast('ကုန်သွားပြီ — Out of Stock', 'error');
      return { success: false, message: 'Out of stock.' };
    }

    if (idx > -1) {
      const newQty = Math.min(_cart[idx].quantity + qty, MAX_QTY, stock);
      _cart[idx].quantity = newQty;
    } else {
      _cart.push({
        product,
        quantity: Math.min(qty, MAX_QTY, stock),
        addedAt:  Date.now(),
      });
    }

    _save();
    _afterChange('add', product);
    return { success: true, message: 'Added to cart.', item: _cart[_findIndex(product)] };
  }

  /**
   * Remove a product from the cart entirely.
   */
  function removeFromCart(product) {
    const idx = _findIndex(product);
    if (idx === -1) return;
    _cart.splice(idx, 1);
    _save();
    _afterChange('remove', product);
  }

  /**
   * Remove by SKU / product_code string.
   */
  function removeByKey(key) {
    const idx = _cart.findIndex(item => _key(item.product) === key);
    if (idx === -1) return;
    const product = _cart[idx].product;
    _cart.splice(idx, 1);
    _save();
    _afterChange('remove', product);
  }

  /**
   * Update quantity for a product.
   * Pass qty = 0 to remove.
   */
  function updateQty(product, qty) {
    const idx = _findIndex(product);
    if (idx === -1) return;

    if (qty <= 0) {
      removeFromCart(product);
      return;
    }

    const stock  = parseInt(product.stock_quantity) || 99;
    _cart[idx].quantity = Math.min(Math.max(qty, MIN_QTY), MAX_QTY, stock);
    _save();
    _afterChange('update', product);
  }

  /**
   * Increment quantity by 1.
   */
  function incrementQty(product) {
    const idx = _findIndex(product);
    if (idx === -1) return;
    updateQty(product, _cart[idx].quantity + 1);
  }

  /**
   * Decrement quantity by 1 (removes if reaches 0).
   */
  function decrementQty(product) {
    const idx = _findIndex(product);
    if (idx === -1) return;
    updateQty(product, _cart[idx].quantity - 1);
  }

  /**
   * Clear the entire cart.
   */
  function clearCart() {
    _cart = [];
    _save();
    _afterChange('clear', null);
  }

  /**
   * Check if product is in cart.
   */
  function isInCart(product) {
    return _findIndex(product) > -1;
  }

  /**
   * Get quantity of a specific product in cart.
   */
  function getQty(product) {
    const idx = _findIndex(product);
    return idx > -1 ? _cart[idx].quantity : 0;
  }

  /* ══════════════════════════════════════════════════════════
     CART TOTALS
  ══════════════════════════════════════════════════════════ */

  /**
   * Total number of items (sum of quantities).
   */
  function getTotalItems() {
    return _cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Number of unique products.
   */
  function getUniqueCount() {
    return _cart.length;
  }

  /**
   * Get all cart items (read-only copy).
   */
  function getItems() {
    return _cart.map(item => ({ ...item }));
  }

  /**
   * Get cart totals using DiscountSystem.
   */
  function getTotals(promoCode = '') {
    if (!window.DiscountSystem) return null;
    return DiscountSystem.calculateOrderTotal(_cart, _config, promoCode);
  }

  /* ══════════════════════════════════════════════════════════
     EVENT SYSTEM
  ══════════════════════════════════════════════════════════ */

  /**
   * Subscribe to cart changes.
   * @param {Function} fn - called with (action, product, cart)
   */
  function onChange(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); }; // unsubscribe
  }

  function _afterChange(action, product) {
    _updateAllBadges();
    _renderDrawerItems();
    _listeners.forEach(fn => {
      try { fn(action, product, [..._cart]); } catch {}
    });
  }

  /* ══════════════════════════════════════════════════════════
     BADGE / COUNTER UI
  ══════════════════════════════════════════════════════════ */

  function _updateAllBadges() {
    const total = getTotalItems();
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.textContent = total > 99 ? '99+' : total;
      el.style.display = total === 0 ? 'none' : '';
      // Bump animation
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });

    // Shake cart icon
    document.querySelectorAll('[data-cart-icon]').forEach(el => {
      el.classList.remove('cart-shake');
      void el.offsetWidth;
      el.classList.add('cart-shake');
      setTimeout(() => el.classList.remove('cart-shake'), 500);
    });
  }

  /* ══════════════════════════════════════════════════════════
     MINI CART DRAWER
  ══════════════════════════════════════════════════════════ */

  function openDrawer() {
    const drawer  = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const drawer   = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleDrawer() {
    const drawer = document.getElementById('cart-drawer');
    drawer?.classList.contains('open') ? closeDrawer() : openDrawer();
  }

  /**
   * Inject the cart drawer HTML into the page (called once on init).
   * The drawer targets #cart-drawer-mount or appends to body.
   */
  function _renderDrawer() {
    if (document.getElementById('cart-drawer')) return; // already exists

    const html = `
      <!-- Cart Backdrop -->
      <div id="cart-backdrop" class="overlay-backdrop" role="presentation"></div>

      <!-- Cart Drawer -->
      <aside id="cart-drawer" class="cart-drawer" role="dialog" aria-label="Shopping cart" aria-modal="true">

        <div class="cart-drawer-header">
          <h2 class="cart-drawer-title">
            🛍️ Shopping Cart
            <span style="font-family:var(--font-body);font-size:var(--text-sm);font-weight:400;color:var(--text-muted);margin-left:var(--space-2)">
              (<span data-cart-count>0</span> items)
            </span>
          </h2>
          <button class="btn btn-ghost btn-icon" id="cart-close-btn" aria-label="Close cart">✕</button>
        </div>

        <!-- Free Shipping Progress -->
        <div id="cart-shipping-bar" style="padding:0 var(--space-6) var(--space-3);display:none;">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);" id="cart-shipping-msg"></div>
          <div style="height:3px;background:var(--border-soft);border-radius:9999px;overflow:hidden;">
            <div id="cart-shipping-fill" style="height:100%;background:linear-gradient(to right,var(--rose-gold),var(--rose-light));border-radius:9999px;transition:width 0.5s ease;width:0%"></div>
          </div>
        </div>

        <!-- Items -->
        <div class="cart-drawer-body" id="cart-items-list">
          <!-- populated by JS -->
        </div>

        <!-- Footer -->
        <div class="cart-drawer-footer" id="cart-drawer-footer" style="display:none;">

          <!-- Promo Code -->
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);">
            <input
              type="text"
              id="promo-input"
              class="form-input"
              placeholder="Promo code (optional)"
              style="font-size:var(--text-sm);"
            />
            <button class="btn btn-outline btn-sm" id="promo-apply-btn" style="flex-shrink:0;">Apply</button>
          </div>
          <div id="promo-msg" style="font-size:var(--text-xs);margin-bottom:var(--space-3);display:none;"></div>

          <!-- Totals -->
          <div class="cart-subtotal">
            <span class="cart-subtotal-label">Subtotal</span>
            <span class="cart-subtotal-value" id="cart-subtotal-display">K 0</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4);">
            <span>Shipping</span>
            <span id="cart-shipping-display">K 3,000</span>
          </div>
          <div id="cart-promo-row" style="display:none;justify-content:space-between;font-size:var(--text-sm);color:#22c55e;margin-bottom:var(--space-4);">
            <span>Promo Discount</span>
            <span id="cart-promo-display">-K 0</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:var(--text-xl);font-weight:700;padding-top:var(--space-4);border-top:1px solid var(--border-soft);margin-bottom:var(--space-5);">
            <span>Total</span>
            <span style="color:var(--rose-gold);" id="cart-total-display">K 0</span>
          </div>

          <!-- CTA Buttons -->
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            <a href="checkout.html" class="btn btn-primary w-full" style="justify-content:center;">
              🛒 Proceed to Checkout
            </a>
            <button class="btn btn-outline w-full" id="cart-telegram-btn">
              ✈️ Order via Telegram
            </button>
          </div>

          <!-- Clear cart -->
          <div style="text-align:center;margin-top:var(--space-4);">
            <button
              id="cart-clear-btn"
              style="font-size:var(--text-xs);color:var(--text-muted);text-decoration:underline;background:none;border:none;cursor:pointer;"
            >Clear cart</button>
          </div>
        </div>

      </aside>`;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Bind all event listeners on the drawer.
   * Called once after _renderDrawer().
   */
  function _bindDrawerEvents() {
    // Close button
    document.addEventListener('click', e => {
      if (e.target.closest('#cart-close-btn'))    closeDrawer();
      if (e.target.id === 'cart-backdrop')         closeDrawer();

      // Open drawer when cart icon clicked
      if (e.target.closest('[data-open-cart]'))    openDrawer();

      // Qty buttons inside drawer
      if (e.target.closest('[data-cart-increment]')) {
        const key = e.target.closest('[data-cart-increment]').dataset.cartIncrement;
        _handleQtyChange(key, 1);
      }
      if (e.target.closest('[data-cart-decrement]')) {
        const key = e.target.closest('[data-cart-decrement]').dataset.cartDecrement;
        _handleQtyChange(key, -1);
      }
      if (e.target.closest('[data-cart-remove]')) {
        const key = e.target.closest('[data-cart-remove]').dataset.cartRemove;
        _handleRemove(key);
      }

      // Clear cart
      if (e.target.id === 'cart-clear-btn') {
        if (confirm('Clear your entire cart?')) clearCart();
      }

      // Telegram order
      if (e.target.closest('#cart-telegram-btn')) {
        _handleTelegramOrder();
      }
    });

    // Promo code
    document.addEventListener('click', e => {
      if (e.target.id === 'promo-apply-btn') _handlePromo();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement?.id === 'promo-input') _handlePromo();
      if (e.key === 'Escape') closeDrawer();
    });

    // Initial render
    _renderDrawerItems();
  }

  /* ── Item Card HTML ─────────────────────────────────────── */

  function _buildItemHTML(item) {
    const { product, quantity } = item;
    const priceInfo = window.DiscountSystem
      ? DiscountSystem.calculatePrice(product)
      : { finalFormatted: product.original_price };

    const key     = _key(product);
    const imgSrc  = product.image1 || 'assets/images/placeholder.jpg';
    const lineTotal = (priceInfo.final || parseFloat(product.original_price) || 0) * quantity;
    const lineFmt   = window.DiscountSystem ? DiscountSystem.formatPrice(lineTotal) : `K ${lineTotal}`;

    return `
      <div class="cart-item" data-cart-key="${key}" id="cart-item-${key}">
        <img
          src="${imgSrc}"
          alt="${product.name_en || product.name_mm}"
          class="cart-item-img"
          loading="lazy"
          onerror="this.src='assets/images/placeholder.jpg'"
        />
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name_en || product.name_mm}</div>
          <div class="cart-item-sku">${product.product_code || product.id || ''}</div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-btn" data-cart-decrement="${key}" aria-label="Decrease quantity">−</button>
              <span class="qty-value" id="qty-${key}">${quantity}</span>
              <button class="qty-btn" data-cart-increment="${key}" aria-label="Increase quantity">+</button>
            </div>
            <span class="cart-item-price" id="line-total-${key}">${lineFmt}</span>
          </div>
        </div>
        <button
          class="cart-action-btn"
          data-cart-remove="${key}"
          aria-label="Remove item"
          style="position:absolute;top:var(--space-3);right:var(--space-3);width:24px;height:24px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-soft);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted);cursor:pointer;transition:all 0.15s ease;flex-shrink:0;"
        >✕</button>
      </div>`;
  }

  /**
   * Re-render the full drawer item list + totals.
   */
  function _renderDrawerItems() {
    const list    = document.getElementById('cart-items-list');
    const footer  = document.getElementById('cart-drawer-footer');
    const countEl = document.querySelector('[data-cart-count]');

    if (!list) return;

    const total = getTotalItems();
    if (countEl) countEl.textContent = total;

    if (_cart.length === 0) {
      if (footer) footer.style.display = 'none';
      list.innerHTML = `
        <div class="empty-state" style="padding:var(--space-16) var(--space-6);">
          <span class="empty-icon">🛍️</span>
          <h3 class="empty-title">Your cart is empty</h3>
          <p class="empty-desc" style="font-size:var(--text-sm);">
            တောင်တောင်ကင်း — Add some luxury to your life!
          </p>
          <button class="btn btn-primary" onclick="CartSystem.closeDrawer()">
            Continue Shopping
          </button>
        </div>`;
      _updateShippingBar(0);
      return;
    }

    list.innerHTML = _cart.map(_buildItemHTML).join('');
    if (footer) footer.style.display = '';

    // Update totals
    _updateTotals();
  }

  /**
   * Update totals display (subtotal, shipping, grand total).
   */
  function _updateTotals(promoCode = '') {
    const promoInput = document.getElementById('promo-input');
    const code = promoCode || promoInput?.value || '';
    const totals = getTotals(code);
    if (!totals) return;

    const sub    = document.getElementById('cart-subtotal-display');
    const ship   = document.getElementById('cart-shipping-display');
    const tot    = document.getElementById('cart-total-display');
    const promoRow = document.getElementById('cart-promo-row');
    const promoDis = document.getElementById('cart-promo-display');

    if (sub)  sub.textContent  = totals.subtotalFormatted;
    if (ship) ship.textContent = totals.shippingFormatted;
    if (tot)  tot.textContent  = totals.totalFormatted;

    if (promoRow && promoDis) {
      if (totals.promoValid) {
        promoRow.style.display = 'flex';
        promoDis.textContent   = `-${totals.promoDiscountFormatted}`;
      } else {
        promoRow.style.display = 'none';
      }
    }

    _updateShippingBar(totals.subtotal);
  }

  /**
   * Update the free-shipping progress bar.
   */
  function _updateShippingBar(subtotal) {
    const bar     = document.getElementById('cart-shipping-bar');
    const fill    = document.getElementById('cart-shipping-fill');
    const msg     = document.getElementById('cart-shipping-msg');
    const threshold = _config?.shipping?.free_shipping_threshold ?? 100000;

    if (!bar) return;

    if (subtotal <= 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = '';
    const pct = Math.min((subtotal / threshold) * 100, 100);
    if (fill) fill.style.width = `${pct}%`;

    if (msg) {
      if (subtotal >= threshold) {
        msg.innerHTML = `🎉 You've unlocked <strong>FREE shipping!</strong>`;
        msg.style.color = '#22c55e';
      } else {
        const remaining = threshold - subtotal;
        const fmt = window.DiscountSystem ? DiscountSystem.formatPrice(remaining) : `K ${remaining}`;
        msg.innerHTML = `Add <strong>${fmt}</strong> more for FREE shipping 🚚`;
        msg.style.color = '';
      }
    }
  }

  /* ── Event Handlers ─────────────────────────────────────── */

  function _handleQtyChange(key, delta) {
    const idx = _cart.findIndex(item => _key(item.product) === key);
    if (idx === -1) return;

    const item     = _cart[idx];
    const newQty   = item.quantity + delta;
    const stock    = parseInt(item.product.stock_quantity) || 99;

    if (newQty < MIN_QTY) {
      // Confirm removal
      if (confirm(`Remove "${item.product.name_en || item.product.name_mm}" from cart?`)) {
        removeByKey(key);
      }
      return;
    }

    if (newQty > stock) {
      _showToast(`Max stock: ${stock} units`, 'error');
      return;
    }

    updateQty(item.product, newQty);

    // Update qty display without full re-render
    const qtyEl = document.getElementById(`qty-${key}`);
    if (qtyEl) qtyEl.textContent = newQty;

    // Update line total
    const price    = window.DiscountSystem ? DiscountSystem.calculatePrice(item.product) : { final: parseFloat(item.product.original_price) };
    const lineTotal = price.final * newQty;
    const lineFmt   = window.DiscountSystem ? DiscountSystem.formatPrice(lineTotal) : `K ${lineTotal}`;
    const totalEl  = document.getElementById(`line-total-${key}`);
    if (totalEl) totalEl.textContent = lineFmt;

    _updateTotals();
    _updateShippingBar(getTotals()?.subtotal || 0);
  }

  function _handleRemove(key) {
    const idx = _cart.findIndex(item => _key(item.product) === key);
    if (idx === -1) return;

    // Animate out
    const el = document.getElementById(`cart-item-${key}`);
    if (el) {
      el.style.transition = 'all 0.25s ease';
      el.style.opacity    = '0';
      el.style.transform  = 'translateX(40px)';
      setTimeout(() => removeByKey(key), 250);
    } else {
      removeByKey(key);
    }
  }

  function _handlePromo() {
    const input  = document.getElementById('promo-input');
    const msgEl  = document.getElementById('promo-msg');
    const code   = input?.value?.trim() || '';
    if (!code || !window.DiscountSystem) return;

    const totals = getTotals(code);
    if (!totals) return;

    if (msgEl) {
      msgEl.style.display = '';
      msgEl.style.color   = totals.promoValid ? '#22c55e' : 'var(--red)';
      msgEl.textContent   = totals.promoMessage;
    }

    _updateTotals(code);
  }

  function _handleTelegramOrder() {
    if (_cart.length === 0) {
      _showToast('Cart is empty!', 'error');
      return;
    }

    if (!window.DiscountSystem) return;

    const promoInput = document.getElementById('promo-input');
    const code  = promoInput?.value?.trim() || '';
    const totals = getTotals(code);

    // Collect basic order info inline
    const name    = prompt('Your Name\nနာမည် ─────────────────') || 'Customer';
    const phone   = prompt('Phone Number\nဖုန်းနံပါတ် ─────────────') || '';
    const address = prompt('Delivery Address\nလိပ်စာ ─────────────────────') || '';

    const url = DiscountSystem.buildTelegramOrderURL(
      { name, phone, address, paymentMethod: 'Cash on Delivery' },
      totals,
      _config
    );

    window.open(url, '_blank');

    // Confetti 🎉
    if (window.AppUtils?.launchConfetti) AppUtils.launchConfetti();
  }

  /* ══════════════════════════════════════════════════════════
     TOAST HELPER
  ══════════════════════════════════════════════════════════ */

  function _showToast(message, type = 'info') {
    if (window.AppUtils?.showToast) {
      AppUtils.showToast(message, type);
    } else {
      console.log(`[Cart] ${type}: ${message}`);
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC QUICK-ADD (from product cards)
  ══════════════════════════════════════════════════════════ */

  /**
   * Quick add from a product card with feedback animation.
   *
   * @param {Object} product
   * @param {Element} [btnEl] - the clicked button element
   */
  function quickAdd(product, btnEl) {
    const result = addToCart(product);

    if (!result.success) return;

    // Animate the button
    if (btnEl) {
      const original = btnEl.innerHTML;
      btnEl.innerHTML = '✓';
      btnEl.classList.add('add-to-cart-success');
      btnEl.disabled = true;
      setTimeout(() => {
        btnEl.innerHTML = original;
        btnEl.classList.remove('add-to-cart-success');
        btnEl.disabled = false;
      }, 1200);
    }

    // Toast
    const name = product.name_en || product.name_mm || 'Product';
    _showToast(`✓ ${name} added to cart`, 'success');

    // Open drawer after short delay
    setTimeout(openDrawer, 400);
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  return {
    init,
    addToCart,
    removeFromCart,
    removeByKey,
    updateQty,
    incrementQty,
    decrementQty,
    clearCart,
    isInCart,
    getQty,
    getItems,
    getTotals,
    getTotalItems,
    getUniqueCount,
    quickAdd,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    onChange,
    // Internal refresh (call after navigating to checkout)
    refresh: _renderDrawerItems,
  };

})();

window.CartSystem = CartSystem;

