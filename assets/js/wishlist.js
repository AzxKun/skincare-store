/* ============================================================
   LUMIÈRE LUXURY SKINCARE — WISHLIST SYSTEM
   wishlist.js
   ============================================================ */

'use strict';

const WishlistSystem = (() => {

  /* ── Constants ───────────────────────────────────────────── */
  const STORAGE_KEY = 'lumiere_wishlist';

  /* ── State ───────────────────────────────────────────────── */
  let _list      = [];   // [{ product, addedAt }]
  let _config    = {};
  let _listeners = [];

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  function init(config) {
    _config = config || {};
    _load();
    _updateAllBadges();
    _updateAllHearts();
    _bindGlobalEvents();
  }

  /* ══════════════════════════════════════════════════════════
     STORAGE
  ══════════════════════════════════════════════════════════ */

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _list = raw ? JSON.parse(raw) : [];
      _list = _list.filter(item => item && item.product);
    } catch {
      _list = [];
    }
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_list));
    } catch (e) {
      console.warn('Wishlist save failed:', e);
    }
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */

  function _key(product) {
    return product.product_code || product.id || product.name_en || '';
  }

  function _findIndex(product) {
    const k = _key(product);
    return _list.findIndex(item => _key(item.product) === k);
  }

  /* ══════════════════════════════════════════════════════════
     WISHLIST OPERATIONS
  ══════════════════════════════════════════════════════════ */

  /**
   * Add a product to the wishlist.
   */
  function add(product) {
    if (!product || _findIndex(product) > -1) return false;
    _list.push({ product, addedAt: Date.now() });
    _save();
    _afterChange('add', product);
    return true;
  }

  /**
   * Remove a product from the wishlist.
   */
  function remove(product) {
    const idx = _findIndex(product);
    if (idx === -1) return false;
    _list.splice(idx, 1);
    _save();
    _afterChange('remove', product);
    return true;
  }

  /**
   * Remove by SKU string.
   */
  function removeByKey(key) {
    const idx = _list.findIndex(item => _key(item.product) === key);
    if (idx === -1) return false;
    const product = _list[idx].product;
    _list.splice(idx, 1);
    _save();
    _afterChange('remove', product);
    return true;
  }

  /**
   * Toggle: add if not in list, remove if already there.
   * @returns {boolean} true = now wishlisted, false = removed
   */
  function toggle(product) {
    return _findIndex(product) > -1 ? (remove(product), false) : (add(product), true);
  }

  /**
   * Check if a product is wishlisted.
   */
  function isWishlisted(product) {
    return _findIndex(product) > -1;
  }

  /**
   * Clear the entire wishlist.
   */
  function clear() {
    _list = [];
    _save();
    _afterChange('clear', null);
  }

  /**
   * Get all wishlist items (read-only).
   */
  function getItems() {
    return _list.map(item => ({ ...item }));
  }

  /**
   * Count of wishlisted products.
   */
  function getCount() {
    return _list.length;
  }

  /* ══════════════════════════════════════════════════════════
     EVENT SYSTEM
  ══════════════════════════════════════════════════════════ */

  function onChange(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }

  function _afterChange(action, product) {
    _updateAllBadges();
    _updateAllHearts();
    // If wishlist page is open, refresh it
    if (document.getElementById('wishlist-grid')) _renderWishlistPage();
    _listeners.forEach(fn => { try { fn(action, product, [..._list]); } catch {} });
  }

  /* ══════════════════════════════════════════════════════════
     BADGE & HEART UI
  ══════════════════════════════════════════════════════════ */

  function _updateAllBadges() {
    const count = getCount();
    document.querySelectorAll('[data-wishlist-badge]').forEach(el => {
      el.textContent    = count > 99 ? '99+' : count;
      el.style.display  = count === 0 ? 'none' : '';
    });
  }

  /**
   * Update all heart buttons on the page to reflect current wishlist state.
   */
  function _updateAllHearts() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
      const key       = btn.dataset.wishlistToggle;
      const isActive  = _list.some(item => _key(item.product) === key);
      _setHeartState(btn, isActive);
    });
  }

  function _setHeartState(btn, active) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('title', active ? 'Remove from Wishlist' : 'Add to Wishlist');

    if (active) {
      btn.classList.add('wishlisted');
      btn.innerHTML = '❤️';
    } else {
      btn.classList.remove('wishlisted');
      btn.innerHTML = '🤍';
    }
  }

  /* ══════════════════════════════════════════════════════════
     GLOBAL EVENT BINDING
  ══════════════════════════════════════════════════════════ */

  function _bindGlobalEvents() {
    document.addEventListener('click', e => {
      // Heart button toggle on any product card
      const heartBtn = e.target.closest('[data-wishlist-toggle]');
      if (!heartBtn) return;

      const key = heartBtn.dataset.wishlistToggle;
      if (!key) return;

      // Find product from cards data store (set by products.js)
      const product = window._productsCache?.find(p =>
        (p.product_code || p.id) === key
      );

      if (!product) {
        // Fallback: build minimal product from card DOM
        const card = heartBtn.closest('[data-product-key]');
        if (card) {
          _toggleByKey(key, card);
          return;
        }
        return;
      }

      const wasWishlisted = isWishlisted(product);
      const nowWishlisted = toggle(product);

      // Pop animation
      heartBtn.classList.remove('heart-pop');
      void heartBtn.offsetWidth;
      heartBtn.classList.add('heart-pop');

      // Toast
      const name = product.name_en || product.name_mm || 'Product';
      _showToast(
        nowWishlisted
          ? `❤️ "${name}" added to wishlist`
          : `🤍 Removed from wishlist`,
        nowWishlisted ? 'success' : 'info'
      );
    });
  }

  /**
   * Fallback toggle when full product object not available.
   */
  function _toggleByKey(key, cardEl) {
    const idx = _list.findIndex(item => _key(item.product) === key);

    if (idx > -1) {
      _list.splice(idx, 1);
      _save();
      _afterChange('remove', null);
      _showToast('🤍 Removed from wishlist', 'info');
    } else {
      // Build a minimal product from the card's DOM
      const nameEl    = cardEl?.querySelector('.product-name');
      const nameMmEl  = cardEl?.querySelector('.product-name-mm');
      const brandEl   = cardEl?.querySelector('.product-brand');
      const imgEl     = cardEl?.querySelector('.product-card-image img');
      const priceEl   = cardEl?.querySelector('.price-normal, .price-current');

      const minProduct = {
        product_code:   key,
        id:             key,
        name_en:        nameEl?.textContent?.trim()   || '',
        name_mm:        nameMmEl?.textContent?.trim() || '',
        brand:          brandEl?.textContent?.trim()  || '',
        image1:         imgEl?.src || '',
        original_price: priceEl?.textContent?.replace(/[^0-9]/g, '') || '0',
      };
      _list.push({ product: minProduct, addedAt: Date.now() });
      _save();
      _afterChange('add', minProduct);
      _showToast('❤️ Added to wishlist', 'success');
    }
  }

  /* ══════════════════════════════════════════════════════════
     BUILD HEART BUTTON HTML
  ══════════════════════════════════════════════════════════ */

  /**
   * Generate a heart button HTML string for use in product cards.
   *
   * @param {Object}  product
   * @param {Object}  [options]
   * @param {boolean} [options.standalone=false] - larger standalone style
   */
  function buildHeartButtonHTML(product, options = {}) {
    const key    = _key(product);
    const active = isWishlisted(product);
    const icon   = active ? '❤️' : '🤍';
    const label  = active ? 'Remove from Wishlist' : 'Add to Wishlist';

    if (options.standalone) {
      return `
        <button
          class="btn btn-outline btn-icon wishlist-btn-standalone ${active ? 'wishlisted' : ''}"
          data-wishlist-toggle="${key}"
          aria-pressed="${active}"
          aria-label="${label}"
          title="${label}"
        >${icon}</button>`;
    }

    return `
      <button
        class="card-action-btn ${active ? 'wishlisted' : ''}"
        data-wishlist-toggle="${key}"
        aria-pressed="${active}"
        aria-label="${label}"
        title="${label}"
      >${icon}</button>`;
  }

  /* ══════════════════════════════════════════════════════════
     WISHLIST PAGE RENDERER
  ══════════════════════════════════════════════════════════ */

  /**
   * Render the full wishlist page grid.
   * Looks for #wishlist-grid and #wishlist-count in the DOM.
   */
  function _renderWishlistPage() {
    const grid     = document.getElementById('wishlist-grid');
    const countEl  = document.getElementById('wishlist-count');
    const emptyEl  = document.getElementById('wishlist-empty');
    const headerEl = document.getElementById('wishlist-header-section');

    if (!grid) return;

    const count = getCount();
    if (countEl) countEl.textContent = count;

    if (count === 0) {
      grid.innerHTML    = '';
      if (emptyEl)   emptyEl.style.display   = '';
      if (headerEl)  headerEl.style.display  = 'none';
      return;
    }

    if (emptyEl)  emptyEl.style.display  = 'none';
    if (headerEl) headerEl.style.display = '';

    grid.innerHTML = _list.map(({ product, addedAt }) => {
      const priceInfo = window.DiscountSystem
        ? DiscountSystem.calculatePrice(product)
        : { finalFormatted: `K ${product.original_price}`, hasDiscount: false };

      const stockStatus = window.DiscountSystem
        ? DiscountSystem.getStockStatus(product.stock_quantity, _config)
        : 'in';

      const key    = _key(product);
      const imgSrc = product.image1 || 'assets/images/placeholder.jpg';
      const date   = new Date(addedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

      return `
        <div class="wishlist-item reveal" data-product-key="${key}">

          <!-- Image -->
          <div class="wishlist-item-image shimmer-hover" style="position:relative;">
            <a href="product.html?id=${key}">
              <img
                src="${imgSrc}"
                alt="${product.name_en || product.name_mm}"
                loading="lazy"
                onerror="this.src='assets/images/placeholder.jpg'"
                style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:var(--radius-lg);display:block;"
              />
            </a>

            <!-- Remove heart -->
            <button
              class="card-action-btn wishlisted"
              data-wishlist-toggle="${key}"
              aria-label="Remove from wishlist"
              title="Remove from wishlist"
              style="position:absolute;top:var(--space-3);right:var(--space-3);"
            >❤️</button>

            <!-- Out of stock overlay -->
            ${stockStatus === 'out' ? `
              <div style="position:absolute;inset:0;background:rgba(13,13,13,0.5);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;">
                <span style="background:var(--black);color:var(--white);padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:700;letter-spacing:0.1em;">SOLD OUT</span>
              </div>` : ''}
          </div>

          <!-- Info -->
          <div style="padding:var(--space-4) 0;">
            <div class="product-brand">${product.brand || ''}</div>
            <a href="product.html?id=${key}" style="text-decoration:none;">
              <div class="product-name">${product.name_en || product.name_mm}</div>
            </a>
            ${product.name_mm && product.name_en
              ? `<div class="product-name-mm">${product.name_mm}</div>`
              : ''}

            <!-- Price -->
            ${window.DiscountSystem
              ? DiscountSystem.buildCardPriceHTML(priceInfo)
              : `<div class="product-price"><span class="price-normal">K ${product.original_price}</span></div>`}

            <!-- Added date -->
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">
              ❤️ Saved on ${date}
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4);">
              <button
                class="btn btn-primary btn-sm"
                style="flex:1;"
                onclick="WishlistSystem.moveToCart('${key}')"
                ${stockStatus === 'out' ? 'disabled' : ''}
              >
                ${stockStatus === 'out' ? '✕ Out of Stock' : '🛒 Add to Cart'}
              </button>
              <button
                class="btn btn-outline btn-icon btn-sm"
                onclick="WishlistSystem.shareProduct('${key}')"
                title="Share product"
                aria-label="Share"
              >🔗</button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Trigger scroll reveal for new items
    if (window.AppUtils?.initScrollReveal) {
      AppUtils.initScrollReveal();
    }
  }

  /* ══════════════════════════════════════════════════════════
     MOVE TO CART
  ══════════════════════════════════════════════════════════ */

  /**
   * Move a wishlist item into the cart and remove from wishlist.
   */
  function moveToCart(key) {
    const item = _list.find(i => _key(i.product) === key);
    if (!item) return;

    if (window.CartSystem) {
      CartSystem.quickAdd(item.product);
    }

    remove(item.product);
    _showToast('✓ Moved to cart!', 'success');
  }

  /**
   * Move ALL wishlist items to cart.
   */
  function moveAllToCart() {
    if (_list.length === 0) return;

    if (!window.CartSystem) return;

    _list.forEach(({ product }) => CartSystem.addToCart(product));
    _showToast(`🛒 All ${_list.length} items added to cart!`, 'success');
    clear();
    setTimeout(() => CartSystem.openDrawer(), 500);
  }

  /* ══════════════════════════════════════════════════════════
     SHARE
  ══════════════════════════════════════════════════════════ */

  /**
   * Share a specific product link.
   */
  function shareProduct(key) {
    const item    = _list.find(i => _key(i.product) === key);
    const product = item?.product;
    const url     = `${window.location.origin}/product.html?id=${key}`;
    const name    = product?.name_en || product?.name_mm || 'This product';

    if (navigator.share) {
      navigator.share({
        title: name,
        text:  `Check out ${name} on ${_config?.store_name || 'LUMIÈRE'}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        _showToast('🔗 Product link copied!', 'success');
      });
    }
  }

  /**
   * Share the entire wishlist as a URL parameter list.
   */
  function shareWishlist() {
    const keys  = _list.map(i => _key(i.product)).join(',');
    const url   = `${window.location.origin}/wishlist.html?shared=${encodeURIComponent(keys)}`;

    if (navigator.share) {
      navigator.share({
        title: `My ${_config?.store_name || 'LUMIÈRE'} Wishlist`,
        text:  'Check out my luxury skincare wishlist!',
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        _showToast('🔗 Wishlist link copied!', 'success');
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     SHARED WISHLIST (load from URL param)
  ══════════════════════════════════════════════════════════ */

  /**
   * If the page URL has ?shared=SKN-0001,SKN-0002 etc,
   * show those products as a "shared wishlist" view.
   * Called by wishlist.html on load.
   */
  function loadSharedIfPresent(allProducts) {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('shared');
    if (!shared || !allProducts?.length) return false;

    const keys    = shared.split(',').map(k => k.trim());
    const matches = allProducts.filter(p => keys.includes(_key(p)));

    if (matches.length === 0) return false;

    // Show shared banner
    const bannerEl = document.getElementById('shared-wishlist-banner');
    if (bannerEl) {
      bannerEl.style.display = '';
      const countEl = bannerEl.querySelector('[data-shared-count]');
      if (countEl) countEl.textContent = matches.length;
    }

    return matches;
  }

  /* ══════════════════════════════════════════════════════════
     RECENTLY VIEWED (bonus feature, stored alongside wishlist)
  ══════════════════════════════════════════════════════════ */

  const VIEWED_KEY  = 'lumiere_viewed';
  const VIEWED_MAX  = 12;
  let   _viewed     = [];

  function _loadViewed() {
    try {
      const raw = localStorage.getItem(VIEWED_KEY);
      _viewed   = raw ? JSON.parse(raw) : [];
    } catch { _viewed = []; }
  }

  function _saveViewed() {
    try { localStorage.setItem(VIEWED_KEY, JSON.stringify(_viewed)); } catch {}
  }

  /**
   * Track a product as recently viewed.
   * Call this on the product page.
   */
  function trackView(product) {
    _loadViewed();
    const key = _key(product);
    // Remove if already present (move to front)
    _viewed = _viewed.filter(p => _key(p) !== key);
    _viewed.unshift(product);
    // Keep only VIEWED_MAX items
    if (_viewed.length > VIEWED_MAX) _viewed = _viewed.slice(0, VIEWED_MAX);
    _saveViewed();
  }

  /**
   * Get recently viewed products list.
   * @param {number} [limit=6]
   * @param {string} [excludeKey] - exclude a product key (e.g. current product)
   */
  function getRecentlyViewed(limit = 6, excludeKey = '') {
    _loadViewed();
    return _viewed
      .filter(p => _key(p) !== excludeKey)
      .slice(0, limit);
  }

  /* ══════════════════════════════════════════════════════════
     RENDER RECENTLY VIEWED SECTION
  ══════════════════════════════════════════════════════════ */

  /**
   * Render recently viewed into a target element.
   *
   * @param {string|Element} target - CSS selector or DOM element
   * @param {string} [excludeKey]
   */
  function renderRecentlyViewed(target, excludeKey = '') {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const items = getRecentlyViewed(6, excludeKey);
    if (items.length === 0) {
      el.closest('[data-recently-viewed-section]')?.style?.setProperty('display', 'none');
      return;
    }

    el.innerHTML = items.map(product => {
      const priceInfo = window.DiscountSystem
        ? DiscountSystem.calculatePrice(product)
        : { finalFormatted: `K ${product.original_price}`, hasDiscount: false };

      const key    = _key(product);
      const imgSrc = product.image1 || 'assets/images/placeholder.jpg';

      return `
        <div class="product-card shimmer-hover reveal">
          <div class="product-card-image">
            <a href="product.html?id=${key}">
              <img src="${imgSrc}" alt="${product.name_en || ''}" loading="lazy"
                onerror="this.src='assets/images/placeholder.jpg'" />
            </a>
          </div>
          <div class="product-card-body">
            <div class="product-brand">${product.brand || ''}</div>
            <a href="product.html?id=${key}">
              <div class="product-name">${product.name_en || product.name_mm}</div>
            </a>
            ${window.DiscountSystem ? DiscountSystem.buildCardPriceHTML(priceInfo) : ''}
          </div>
        </div>`;
    }).join('');

    if (window.AppUtils?.initScrollReveal) AppUtils.initScrollReveal();
  }

  /* ══════════════════════════════════════════════════════════
     INIT WISHLIST PAGE
  ══════════════════════════════════════════════════════════ */

  /**
   * Full initializer for wishlist.html.
   * Call this on page load with all products.
   */
  function initWishlistPage(allProducts) {
    _renderWishlistPage();

    // "Add all to cart" button
    const addAllBtn = document.getElementById('wishlist-add-all-btn');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', moveAllToCart);
    }

    // "Share wishlist" button
    const shareBtn = document.getElementById('wishlist-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareWishlist);
    }

    // "Clear all" button
    const clearBtn = document.getElementById('wishlist-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear your entire wishlist?')) clear();
      });
    }

    // Check for shared wishlist param
    const sharedProducts = loadSharedIfPresent(allProducts);
    if (sharedProducts) {
      _renderSharedWishlist(sharedProducts);
    }
  }

  /**
   * Render a read-only shared wishlist view.
   */
  function _renderSharedWishlist(products) {
    const grid = document.getElementById('shared-wishlist-grid');
    if (!grid || !products.length) return;

    grid.innerHTML = products.map(product => {
      const priceInfo = window.DiscountSystem
        ? DiscountSystem.calculatePrice(product)
        : { finalFormatted: `K ${product.original_price}`, hasDiscount: false };
      const key    = _key(product);
      const imgSrc = product.image1 || 'assets/images/placeholder.jpg';

      return `
        <div class="product-card shimmer-hover">
          <div class="product-card-image">
            <a href="product.html?id=${key}">
              <img src="${imgSrc}" alt="${product.name_en || ''}" loading="lazy"
                onerror="this.src='assets/images/placeholder.jpg'" />
            </a>
          </div>
          <div class="product-card-body">
            <div class="product-brand">${product.brand || ''}</div>
            <a href="product.html?id=${key}">
              <div class="product-name">${product.name_en || product.name_mm}</div>
            </a>
            ${window.DiscountSystem ? DiscountSystem.buildCardPriceHTML(priceInfo) : ''}
            <button class="btn btn-primary btn-sm w-full mt-4"
              onclick="CartSystem?.quickAdd(${JSON.stringify(product).replace(/"/g,'&quot;')})">
              🛒 Add to Cart
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TOAST HELPER
  ══════════════════════════════════════════════════════════ */

  function _showToast(message, type = 'info') {
    if (window.AppUtils?.showToast) {
      AppUtils.showToast(message, type);
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  return {
    init,
    add,
    remove,
    removeByKey,
    toggle,
    isWishlisted,
    clear,
    getItems,
    getCount,
    buildHeartButtonHTML,
    moveToCart,
    moveAllToCart,
    shareProduct,
    shareWishlist,
    trackView,
    getRecentlyViewed,
    renderRecentlyViewed,
    initWishlistPage,
    onChange,
    // Called after new product cards are injected into DOM
    refreshHearts: _updateAllHearts,
  };

})();

window.WishlistSystem = WishlistSystem;

