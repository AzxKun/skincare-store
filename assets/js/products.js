/* ============================================================
   LUMIÈRE LUXURY SKINCARE — PRODUCTS SYSTEM
   products.js
   ============================================================ */

'use strict';

const ProductsSystem = (() => {

  /* ── State ───────────────────────────────────────────────── */
  let _all      = [];   // all normalised products
  let _config   = {};
  let _loaded   = false;
  let _loading  = false;
  let _listeners = [];

  /* ── View count (session) ────────────────────────────────── */
  const _viewCounts = (() => {
    try { return JSON.parse(localStorage.getItem('lumiere_views') || '{}'); } catch { return {}; }
  })();

  function _saveViews() {
    try { localStorage.setItem('lumiere_views', JSON.stringify(_viewCounts)); } catch {}
  }

  /* ══════════════════════════════════════════════════════════
     INIT & LOAD
  ══════════════════════════════════════════════════════════ */

  async function init(config) {
    _config = config || {};
    await load();
  }

  /**
   * Load products from Google Sheets.
   * Falls back to empty array on error.
   */
  async function load() {
    if (_loading) return _all;
    _loading = true;

    const { sheet_id, api_key, sheet_name = 'Products', range = 'A1:Z1000' }
      = _config.google_sheets || {};

    if (!sheet_id || !api_key) {
      console.warn('[Products] No Google Sheets config — using demo data.');
      _all    = _getDemoProducts();
      _loaded = true;
      _loading = false;
      window._productsCache = _all;
      _emit('loaded', _all);
      return _all;
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/values/${encodeURIComponent(sheet_name)}!${range}?key=${api_key}`;
      const res  = await fetch(url);

      if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);

      const data = await res.json();
      _all       = _parseSheet(data.values || []);
      _loaded    = true;

    } catch (err) {
      console.error('[Products] Load failed:', err);
      _all    = _getDemoProducts();
      _loaded = true;
    }

    _loading = false;
    window._productsCache = _all;
    _emit('loaded', _all);
    return _all;
  }

  /* ══════════════════════════════════════════════════════════
     SHEET PARSER
  ══════════════════════════════════════════════════════════ */

  /**
   * Convert raw Google Sheets 2D array → array of product objects.
   * First row = header names.
   */
  function _parseSheet(rows) {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
    return rows.slice(1)
      .filter(row => row.some(cell => cell !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (row[i] || '').toString().trim(); });
        return _normalise(obj);
      })
      .filter(p => p.id || p.product_code);
  }

  /**
   * Normalise a raw row into a consistent product object.
   */
  function _normalise(raw) {
    return {
      // Identification
      id:               raw.id            || raw.product_code || '',
      product_code:     raw.product_code  || raw.id           || '',
      category:         raw.category      || '',
      brand:            raw.brand         || '',

      // Names
      name_en:          raw.name_en       || raw.name         || '',
      name_mm:          raw.name_mm       || '',

      // Descriptions
      short_description_mm: raw.short_description_mm || raw.short_description || '',
      full_description_mm:  raw.full_description_mm  || raw.description       || '',

      // Properties
      skin_type:        raw.skin_type     || '',
      benefits:         raw.benefits      || '',
      ingredients:      raw.ingredients   || '',
      usage:            raw.usage         || '',
      size:             raw.size          || '',
      country_of_origin:raw.country_of_origin || raw.country || '',

      // Stock
      stock_quantity:   parseInt(raw.stock_quantity) || 0,

      // Images (up to 12)
      image1:  raw.image1  || '', image2:  raw.image2  || '',
      image3:  raw.image3  || '', image4:  raw.image4  || '',
      image5:  raw.image5  || '', image6:  raw.image6  || '',
      image7:  raw.image7  || '', image8:  raw.image8  || '',
      image9:  raw.image9  || '', image10: raw.image10 || '',
      image11: raw.image11 || '', image12: raw.image12 || '',
      video_url: raw.video_url || '',

      // Pricing
      original_price:   parseFloat(raw.original_price)  || 0,
      discount_percent: parseFloat(raw.discount_percent) || 0,
      discount_start:   raw.discount_start || '',
      discount_end:     raw.discount_end   || '',

      // Meta
      featured:    _truthy(raw.featured),
      rating:      parseFloat(raw.rating)     || 0,
      sold_count:  parseInt(raw.sold_count)   || 0,
      created_at:  raw.created_at             || '',

      // Computed helpers
      _images: _extractImages(raw),
    };
  }

  function _truthy(val) {
    return ['true','1','yes','y','featured'].includes(String(val).toLowerCase().trim());
  }

  function _extractImages(raw) {
    return [
      raw.image1, raw.image2, raw.image3,  raw.image4,
      raw.image5, raw.image6, raw.image7,  raw.image8,
      raw.image9, raw.image10,raw.image11, raw.image12,
    ].filter(Boolean);
  }

  /* ══════════════════════════════════════════════════════════
     GETTERS / FILTERS
  ══════════════════════════════════════════════════════════ */

  function getAll()       { return [..._all]; }
  function isLoaded()     { return _loaded; }

  function getById(id) {
    return _all.find(p => p.id === id || p.product_code === id) || null;
  }

  function getFeatured(limit = 8) {
    return _all.filter(p => p.featured).slice(0, limit);
  }

  function getNewArrivals(limit = 8) {
    return [..._all]
      .filter(p => p.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  function getBestSellers(limit = 8) {
    return [..._all]
      .sort((a, b) => b.sold_count - a.sold_count)
      .slice(0, limit);
  }

  function getOnSale(limit = 8) {
    if (!window.DiscountSystem) return [];
    return DiscountSystem.getFlashSaleProducts(_all).slice(0, limit);
  }

  function getByCategory(category, limit = 99) {
    return _all
      .filter(p => p.category.toLowerCase() === category.toLowerCase())
      .slice(0, limit);
  }

  function getByBrand(brand, limit = 99) {
    return _all
      .filter(p => p.brand.toLowerCase() === brand.toLowerCase())
      .slice(0, limit);
  }

  /**
   * Get related products — same brand OR category OR skin_type,
   * excluding the current product.
   */
  function getRelated(product, limit = 6) {
    const key = product.product_code || product.id;
    return _all
      .filter(p => (p.product_code || p.id) !== key)
      .map(p => {
        let score = 0;
        if (p.brand     === product.brand)     score += 3;
        if (p.category  === product.category)  score += 2;
        if (p.skin_type === product.skin_type) score += 1;
        return { product: p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.product);
  }

  function getPopular(limit = 8) {
    return [..._all]
      .sort((a, b) => {
        const va = (_viewCounts[a.product_code] || 0) + (a.sold_count * 2);
        const vb = (_viewCounts[b.product_code] || 0) + (b.sold_count * 2);
        return vb - va;
      })
      .slice(0, limit);
  }

  function getTrending(limit = 8) {
    // Trending = high view count in this session + recent + on sale
    return [..._all]
      .filter(p => p.created_at)
      .sort((a, b) => {
        const score = p => {
          const views   = _viewCounts[p.product_code] || 0;
          const age     = p.created_at ? Math.max(0, 30 - Math.floor((Date.now() - new Date(p.created_at)) / 86400000)) : 0;
          const onSale  = window.DiscountSystem && DiscountSystem.calculatePrice(p).hasDiscount ? 5 : 0;
          return views * 2 + age + onSale;
        };
        return score(b) - score(a);
      })
      .slice(0, limit);
  }

  /* ── Unique filter values ─────────────────────────────────── */

  function getCategories() {
    return [...new Set(_all.map(p => p.category).filter(Boolean))].sort();
  }

  function getBrands() {
    return [...new Set(_all.map(p => p.brand).filter(Boolean))].sort();
  }

  function getSkinTypes() {
    return [...new Set(_all.map(p => p.skin_type).filter(Boolean))].sort();
  }

  function getCountries() {
    return [...new Set(_all.map(p => p.country_of_origin).filter(Boolean))].sort();
  }

  function getPriceRange() {
    if (!_all.length) return { min: 0, max: 0 };
    const prices = _all.map(p => p.original_price).filter(n => n > 0);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  /* ══════════════════════════════════════════════════════════
     ADVANCED FILTER
  ══════════════════════════════════════════════════════════ */

  /**
   * Filter products by multiple criteria simultaneously.
   *
   * @param {Object} opts
   * @param {string[]}  [opts.brands]
   * @param {string[]}  [opts.categories]
   * @param {string[]}  [opts.skinTypes]
   * @param {string[]}  [opts.countries]
   * @param {number}    [opts.priceMin]
   * @param {number}    [opts.priceMax]
   * @param {boolean}   [opts.onSaleOnly]
   * @param {boolean}   [opts.inStockOnly]
   * @param {string}    [opts.sortBy]  'price_asc'|'price_desc'|'newest'|'popular'|'rating'|'discount'
   * @returns {Object[]}
   */
  function filter(opts = {}) {
    let results = [..._all];

    if (opts.brands?.length) {
      results = results.filter(p => opts.brands.includes(p.brand));
    }
    if (opts.categories?.length) {
      results = results.filter(p => opts.categories.includes(p.category));
    }
    if (opts.skinTypes?.length) {
      results = results.filter(p =>
        opts.skinTypes.some(st => p.skin_type.toLowerCase().includes(st.toLowerCase()))
      );
    }
    if (opts.countries?.length) {
      results = results.filter(p => opts.countries.includes(p.country_of_origin));
    }
    if (opts.priceMin !== undefined) {
      results = results.filter(p => {
        const final = window.DiscountSystem
          ? DiscountSystem.calculatePrice(p).final
          : p.original_price;
        return final >= opts.priceMin;
      });
    }
    if (opts.priceMax !== undefined) {
      results = results.filter(p => {
        const final = window.DiscountSystem
          ? DiscountSystem.calculatePrice(p).final
          : p.original_price;
        return final <= opts.priceMax;
      });
    }
    if (opts.onSaleOnly && window.DiscountSystem) {
      results = results.filter(p => DiscountSystem.calculatePrice(p).hasDiscount);
    }
    if (opts.inStockOnly) {
      results = results.filter(p => parseInt(p.stock_quantity) > 0);
    }

    // Sort
    switch (opts.sortBy) {
      case 'price_asc':
        results.sort((a,b) => _finalPrice(a) - _finalPrice(b)); break;
      case 'price_desc':
        results.sort((a,b) => _finalPrice(b) - _finalPrice(a)); break;
      case 'newest':
        results.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'popular':
        results.sort((a,b) => b.sold_count - a.sold_count); break;
      case 'rating':
        results.sort((a,b) => b.rating - a.rating); break;
      case 'discount':
        results.sort((a,b) => {
          const pa = window.DiscountSystem ? DiscountSystem.calculatePrice(a).discountPercent : 0;
          const pb = window.DiscountSystem ? DiscountSystem.calculatePrice(b).discountPercent : 0;
          return pb - pa;
        }); break;
      default: break;
    }

    return results;
  }

  function _finalPrice(p) {
    return window.DiscountSystem ? DiscountSystem.calculatePrice(p).final : p.original_price;
  }

  /* ══════════════════════════════════════════════════════════
     VIEW COUNTER
  ══════════════════════════════════════════════════════════ */

  function incrementView(productCode) {
    _viewCounts[productCode] = (_viewCounts[productCode] || 0) + 1;
    _saveViews();
    return _viewCounts[productCode];
  }

  function getViewCount(productCode) {
    // Simulate realistic view count: base of sold_count * 3 + session views
    const product  = getById(productCode);
    const base     = product ? (product.sold_count * 3 + Math.floor(Math.random() * 50 + 10)) : 0;
    const session  = _viewCounts[productCode] || 0;
    return base + session;
  }

  /* ══════════════════════════════════════════════════════════
     PRODUCT CARD HTML
  ══════════════════════════════════════════════════════════ */

  /**
   * Build a product card HTML string.
   *
   * @param {Object}  product
   * @param {Object}  [options]
   * @param {boolean} [options.large]       - bigger card (new arrivals hero)
   * @param {boolean} [options.showQuickAdd]
   * @param {boolean} [options.lazyLoad=true]
   */
  function buildCardHTML(product, options = {}) {
    const { large = false, showQuickAdd = true, lazyLoad = true } = options;

    const key       = product.product_code || product.id;
    const priceInfo = window.DiscountSystem
      ? DiscountSystem.calculatePrice(product)
      : { finalFormatted: `K ${product.original_price}`, hasDiscount: false };

    const stockStatus = window.DiscountSystem
      ? DiscountSystem.getStockStatus(product.stock_quantity, _config)
      : 'in';

    const isWishlisted = window.WishlistSystem
      ? WishlistSystem.isWishlisted(product)
      : false;

    const imgSrc  = product.image1 || product.image2 || 'assets/images/placeholder.jpg';
    const imgLoad = lazyLoad ? 'lazy' : 'eager';

    const badgeHTML   = window.DiscountSystem
      ? DiscountSystem.buildBadgeHTML(product, priceInfo, stockStatus)
      : '';

    const starsHTML   = window.DiscountSystem && product.rating
      ? DiscountSystem.buildStarsHTML(product.rating)
      : '';

    const priceHTML   = window.DiscountSystem
      ? DiscountSystem.buildCardPriceHTML(priceInfo)
      : `<div class="product-price"><span class="price-normal">K ${product.original_price}</span></div>`;

    const heartHTML   = window.WishlistSystem
      ? WishlistSystem.buildHeartButtonHTML(product)
      : '';

    const outOfStock  = stockStatus === 'out';

    return `
      <article
        class="product-card shimmer-hover reveal"
        data-product-key="${key}"
        data-category="${product.category}"
        data-brand="${product.brand}"
        data-skin-type="${product.skin_type}"
        onclick="ProductsSystem.openQuickView('${key}')"
        role="button"
        tabindex="0"
        aria-label="${product.name_en || product.name_mm}"
      >
        <!-- Image -->
        <div class="product-card-image">
          <img
            src="${imgSrc}"
            alt="${product.name_en || product.name_mm}"
            loading="${imgLoad}"
            decoding="async"
            onerror="this.src='assets/images/placeholder.jpg'"
          />

          ${badgeHTML}

          <!-- Quick actions (appear on hover) -->
          <div class="product-card-actions">
            ${heartHTML}
            <button
              class="card-action-btn"
              onclick="event.stopPropagation(); ProductsSystem.openQuickView('${key}')"
              aria-label="Quick view"
              title="Quick View"
              data-tooltip="Quick View"
            >👁️</button>
            <button
              class="card-action-btn"
              onclick="event.stopPropagation(); ProductsSystem.addToCompare('${key}')"
              aria-label="Compare"
              title="Compare"
              data-tooltip="Compare"
            >⚖️</button>
          </div>

          <!-- Quick Add (slides up on hover) -->
          ${showQuickAdd && !outOfStock ? `
            <div class="product-card-quick-add"
              onclick="event.stopPropagation(); CartSystem?.quickAdd(window._productsCache?.find(p=>(p.product_code||p.id)==='${key}'), this)"
            >
              + Add to Cart
            </div>` : ''}

          ${outOfStock ? `
            <div class="product-card-quick-add" style="background:rgba(13,13,13,0.7);">
              Sold Out · ကုန်သွားပြီ
            </div>` : ''}
        </div>

        <!-- Body -->
        <div class="product-card-body">
          <div class="product-sku">${product.product_code || ''}</div>
          <div class="product-brand">${product.brand || ''}</div>
          <div class="product-name">${product.name_en || product.name_mm}</div>
          ${product.name_mm && product.name_en
            ? `<div class="product-name-mm">${product.name_mm}</div>` : ''}
          ${priceHTML}
          ${starsHTML}
          ${product.sold_count > 0
            ? `<div class="sold-count" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">
                 ${product.sold_count.toLocaleString()} sold
               </div>` : ''}
        </div>
      </article>`;
  }

  /**
   * Build skeleton loader cards for loading state.
   */
  function buildSkeletonHTML(count = 4) {
    return Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════════════════════════
     RENDER HELPERS
  ══════════════════════════════════════════════════════════ */

  /**
   * Render a list of products into a target element.
   *
   * @param {string|Element} target
   * @param {Object[]}       products
   * @param {Object}         [options]  - passed to buildCardHTML
   */
  function renderProducts(target, products, options = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    if (!products || products.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <span class="empty-icon">🔍</span>
          <h3 class="empty-title">No products found</h3>
          <p class="empty-desc">ကုန်ပစ္စည်းများ မတွေ့ပါ</p>
        </div>`;
      return;
    }

    el.innerHTML = products.map(p => buildCardHTML(p, options)).join('');

    // Refresh heart states + scroll reveal
    window.WishlistSystem?.refreshHearts();
    window.AppUtils?.initScrollReveal();
  }

  /**
   * Show skeleton loaders in a grid.
   */
  function showSkeletons(target, count = 8) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) el.innerHTML = buildSkeletonHTML(count);
  }

  /* ══════════════════════════════════════════════════════════
     QUICK VIEW MODAL
  ══════════════════════════════════════════════════════════ */

  let _compareList = [];

  function openQuickView(key) {
    const product = getById(key);
    if (!product) return;

    // Track view
    incrementView(key);
    window.WishlistSystem?.trackView(product);

    // Build or reuse modal
    let modal = document.getElementById('quick-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'quick-view-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-backdrop" onclick="ProductsSystem.closeQuickView()"></div>
        <div class="modal-content" style="padding:var(--space-8);">
          <button class="modal-close" onclick="ProductsSystem.closeQuickView()">✕</button>
          <div id="quick-view-inner"></div>
        </div>`;
      document.body.appendChild(modal);
    }

    const priceInfo = window.DiscountSystem
      ? DiscountSystem.calculatePrice(product)
      : { finalFormatted: `K ${product.original_price}`, hasDiscount: false };

    const stockStatus = window.DiscountSystem
      ? DiscountSystem.getStockStatus(product.stock_quantity, _config)
      : 'in';

    const images = product._images.length ? product._images : ['assets/images/placeholder.jpg'];

    const inner = document.getElementById('quick-view-inner');
    inner.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-8);align-items:start;">

        <!-- Gallery -->
        <div>
          <div style="aspect-ratio:1;border-radius:var(--radius-lg);overflow:hidden;background:var(--surface-2);margin-bottom:var(--space-3);">
            <img
              id="qv-main-img"
              src="${images[0]}"
              alt="${product.name_en}"
              style="width:100%;height:100%;object-fit:cover;"
              onerror="this.src='assets/images/placeholder.jpg'"
            />
          </div>
          ${images.length > 1 ? `
            <div style="display:flex;gap:var(--space-2);overflow-x:auto;">
              ${images.map((img, i) => `
                <img
                  src="${img}"
                  onclick="document.getElementById('qv-main-img').src='${img}'"
                  style="width:60px;height:60px;object-fit:cover;border-radius:var(--radius);cursor:pointer;border:2px solid ${i===0 ? 'var(--rose-gold)' : 'transparent'};flex-shrink:0;"
                  onerror="this.src='assets/images/placeholder.jpg'"
                />
              `).join('')}
            </div>` : ''}
        </div>

        <!-- Info -->
        <div>
          <div class="product-detail-brand">${product.brand}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">${product.product_code}</div>
          <h3 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;margin-bottom:var(--space-2);">
            ${product.name_en || product.name_mm}
          </h3>
          ${product.name_mm && product.name_en
            ? `<p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">${product.name_mm}</p>` : ''}

          ${window.DiscountSystem ? DiscountSystem.buildDetailPriceHTML(priceInfo) : ''}
          ${window.DiscountSystem ? DiscountSystem.buildStarsHTML(product.rating) : ''}
          ${window.DiscountSystem ? DiscountSystem.buildStockHTML(product.stock_quantity, _config) : ''}

          <p style="color:var(--text-soft);font-size:var(--text-sm);line-height:1.8;margin:var(--space-4) 0;">
            ${product.short_description_mm || product.full_description_mm.slice(0, 200)}
          </p>

          ${product.skin_type ? `
            <div style="margin-bottom:var(--space-4);">
              <div class="skin-tags">
                ${product.skin_type.split(',').map(s =>
                  `<span class="skin-tag">${s.trim()}</span>`
                ).join('')}
              </div>
            </div>` : ''}

          <!-- Actions -->
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);">
            ${stockStatus !== 'out' ? `
              <button
                class="btn btn-primary"
                style="flex:1;"
                onclick="CartSystem?.quickAdd(ProductsSystem.getById('${product.product_code||product.id}'))"
              >🛒 Add to Cart</button>` : `
              <button class="btn btn-outline" style="flex:1;" disabled>Sold Out</button>`}

            ${window.WishlistSystem ? `
              <button
                class="btn btn-outline btn-icon"
                data-wishlist-toggle="${product.product_code || product.id}"
                aria-label="Wishlist"
              >${WishlistSystem.isWishlisted(product) ? '❤️' : '🤍'}</button>` : ''}

            <a
              href="product.html?id=${product.product_code || product.id}"
              class="btn btn-outline"
            >View Full Details →</a>
          </div>

          <!-- Meta chips -->
          <div class="product-meta-chips" style="margin-top:var(--space-5);">
            ${product.size ? `<span class="meta-chip"><span class="meta-chip-icon">📏</span>${product.size}</span>` : ''}
            ${product.country_of_origin ? `<span class="meta-chip"><span class="meta-chip-icon">🌏</span>${product.country_of_origin}</span>` : ''}
            <span class="meta-chip"><span class="meta-chip-icon">✅</span>100% Authentic</span>
          </div>
        </div>

      </div>`;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Update heart button state
    window.WishlistSystem?.refreshHearts();

    // Keyboard close
    const onKey = e => { if (e.key === 'Escape') { closeQuickView(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    modal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ══════════════════════════════════════════════════════════
     COMPARE SYSTEM
  ══════════════════════════════════════════════════════════ */

  const COMPARE_MAX = 3;

  function addToCompare(key) {
    const product = getById(key);
    if (!product) return;

    if (_compareList.find(p => (p.product_code || p.id) === key)) {
      _showToast('Already in compare list.', 'info');
      return;
    }
    if (_compareList.length >= COMPARE_MAX) {
      _showToast(`Max ${COMPARE_MAX} products for comparison.`, 'error');
      return;
    }

    _compareList.push(product);
    _showToast(`⚖️ "${product.name_en || product.name_mm}" added to compare`, 'success');
    _updateCompareBar();
  }

  function removeFromCompare(key) {
    _compareList = _compareList.filter(p => (p.product_code || p.id) !== key);
    _updateCompareBar();
  }

  function clearCompare() {
    _compareList = [];
    _updateCompareBar();
    document.getElementById('compare-modal')?.classList.remove('open');
  }

  function openCompareModal() {
    if (_compareList.length < 2) {
      _showToast('Add at least 2 products to compare.', 'info');
      return;
    }

    let modal = document.getElementById('compare-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'compare-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const fields = [
      ['Brand',     p => p.brand],
      ['Category',  p => p.category],
      ['Skin Type', p => p.skin_type],
      ['Size',      p => p.size],
      ['Origin',    p => p.country_of_origin],
      ['Price',     p => window.DiscountSystem ? DiscountSystem.calculatePrice(p).finalFormatted : `K ${p.original_price}`],
      ['Rating',    p => p.rating ? `${p.rating}/5 ★` : '—'],
      ['In Stock',  p => (parseInt(p.stock_quantity)||0) > 0 ? '✅' : '✕'],
    ];

    modal.innerHTML = `
      <div class="modal-backdrop" onclick="ProductsSystem.clearCompare()"></div>
      <div class="modal-content" style="max-width:860px;padding:var(--space-8);">
        <button class="modal-close" onclick="ProductsSystem.clearCompare()">✕</button>
        <h2 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-6);">
          Product Comparison ⚖️
        </h2>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;min-width:500px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:var(--space-3) var(--space-4);background:var(--surface-2);font-size:var(--text-xs);letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);">Feature</th>
                ${_compareList.map(p => `
                  <th style="padding:var(--space-3) var(--space-4);background:var(--surface-2);text-align:center;">
                    <img src="${p.image1||'assets/images/placeholder.jpg'}" alt="${p.name_en}"
                      style="width:70px;height:70px;object-fit:cover;border-radius:var(--radius);margin-bottom:var(--space-2);"
                      onerror="this.src='assets/images/placeholder.jpg'" />
                    <div style="font-size:var(--text-sm);font-weight:600;line-height:1.3;">${p.name_en||p.name_mm}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted);">${p.product_code}</div>
                  </th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${fields.map(([label, fn]) => `
                <tr>
                  <td style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-soft);font-weight:600;font-size:var(--text-sm);white-space:nowrap;">${label}</td>
                  ${_compareList.map(p => `
                    <td style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-soft);text-align:center;font-size:var(--text-sm);color:var(--text-soft);">
                      ${fn(p) || '—'}
                    </td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
          ${_compareList.map(p => `
            <a href="product.html?id=${p.product_code||p.id}" class="btn btn-primary btn-sm">
              View ${p.brand}
            </a>`).join('')}
          <button class="btn btn-outline btn-sm" onclick="ProductsSystem.clearCompare()">Clear</button>
        </div>
      </div>`;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function _updateCompareBar() {
    let bar = document.getElementById('compare-bar');

    if (_compareList.length === 0) {
      if (bar) bar.style.display = 'none';
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-bar';
      bar.style.cssText = `
        position:fixed;bottom:0;left:0;right:0;z-index:800;
        background:var(--black);color:var(--white);
        padding:var(--space-3) var(--space-6);
        display:flex;align-items:center;justify-content:space-between;
        box-shadow:0 -4px 24px rgba(0,0,0,0.3);
        gap:var(--space-4);flex-wrap:wrap;
        font-family:var(--font-ui);font-size:var(--text-sm);`;
      document.body.appendChild(bar);
    }

    bar.style.display = 'flex';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-4);">
        <span style="color:var(--rose-gold);font-weight:700;">⚖️ Compare (${_compareList.length}/${COMPARE_MAX})</span>
        <div style="display:flex;gap:var(--space-2);">
          ${_compareList.map(p => `
            <div style="display:flex;align-items:center;gap:var(--space-2);background:rgba(255,255,255,0.1);padding:var(--space-1) var(--space-3);border-radius:var(--radius-full);">
              <img src="${p.image1||''}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'" />
              <span style="font-size:var(--text-xs);">${(p.name_en||p.name_mm).slice(0,20)}</span>
              <button onclick="ProductsSystem.removeFromCompare('${p.product_code||p.id}')"
                style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:0.7rem;padding:0;">✕</button>
            </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" onclick="ProductsSystem.openCompareModal()">Compare Now</button>
        <button class="btn btn-ghost btn-sm" style="color:rgba(255,255,255,0.5);"
          onclick="ProductsSystem.clearCompare()">Clear</button>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     EVENT SYSTEM
  ══════════════════════════════════════════════════════════ */

  function onLoaded(fn) {
    if (_loaded) { fn(_all); return; }
    _listeners.push(fn);
  }

  function _emit(event, data) {
    if (event === 'loaded') {
      _listeners.forEach(fn => { try { fn(data); } catch {} });
      _listeners = [];
    }
  }

  /* ══════════════════════════════════════════════════════════
     DEMO / FALLBACK DATA
  ══════════════════════════════════════════════════════════ */

  function _getDemoProducts() {
    const now = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return [
      {
        id:'SKN-0001', product_code:'SKN-0001', category:'Serum', brand:'SK-II',
        name_en:'Facial Treatment Essence', name_mm:'မျက်နှာ ဆေးရည်',
        short_description_mm:'အကောင်းဆုံး အသားအရေ ကုသမှု', full_description_mm:'Premium pitera essence for glowing skin.',
        skin_type:'All Skin Types', benefits:'Brightening, Anti-aging', ingredients:'Galactomyces, Niacinamide',
        usage:'Apply after cleansing', size:'230ml', country_of_origin:'Japan',
        stock_quantity:15, image1:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        video_url:'', original_price:185000, discount_percent:15,
        discount_start:'', discount_end:future, featured:true, rating:4.9, sold_count:1240, created_at:now,
        _images:['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400'],
      },
      {
        id:'SKN-0002', product_code:'SKN-0002', category:'Moisturizer', brand:'Laneige',
        name_en:'Water Sleeping Mask', name_mm:'အိပ်ချိန် ချောဆေး',
        short_description_mm:'ညဘက် ငုပ်ထားသော Mask', full_description_mm:'Overnight hydrating mask for dewy skin.',
        skin_type:'Dry, Combination', benefits:'Hydrating, Soothing', ingredients:'Hyaluronic Acid, Mineral Water',
        usage:'Apply as final step at night', size:'70ml', country_of_origin:'South Korea',
        stock_quantity:42, image1:'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
        video_url:'', original_price:65000, discount_percent:20,
        discount_start:'', discount_end:future, featured:true, rating:4.8, sold_count:890, created_at:now,
        _images:['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400'],
      },
      {
        id:'SKN-0003', product_code:'SKN-0003', category:'Sunscreen', brand:'Anessa',
        name_en:'Perfect UV Sunscreen SPF50+', name_mm:'နေရောင်ကာ ခရင်မ်',
        short_description_mm:'SPF50+ ဆန်လောင်ကာ', full_description_mm:'Water-resistant sunscreen for daily use.',
        skin_type:'All Skin Types', benefits:'Sun protection, Sweat proof', ingredients:'Titanium Dioxide, Zinc Oxide',
        usage:'Apply 15 minutes before sun exposure', size:'60ml', country_of_origin:'Japan',
        stock_quantity:0, image1:'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
        video_url:'', original_price:48000, discount_percent:0,
        discount_start:'', discount_end:'', featured:false, rating:4.7, sold_count:2100, created_at:now,
        _images:['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400'],
      },
      {
        id:'SKN-0004', product_code:'SKN-0004', category:'Toner', brand:'Some By Mi',
        name_en:'AHA BHA PHA 30 Days Toner', name_mm:'ဓာတ်ပေါင်းတိုနာ',
        short_description_mm:'ပြသနာများ ၃၀ ရက်တွင် ကုသ', full_description_mm:'Exfoliating toner for blemish-free skin.',
        skin_type:'Oily, Combination', benefits:'Exfoliating, Brightening', ingredients:'AHA, BHA, PHA, Tea Tree',
        usage:'Apply with cotton pad after cleansing', size:'150ml', country_of_origin:'South Korea',
        stock_quantity:28, image1:'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400',
        video_url:'', original_price:38000, discount_percent:25,
        discount_start:'', discount_end:future, featured:true, rating:4.6, sold_count:760, created_at:now,
        _images:['https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400'],
      },
      {
        id:'SKN-0005', product_code:'SKN-0005', category:'Serum', brand:'The Ordinary',
        name_en:'Niacinamide 10% + Zinc 1%', name_mm:'နိုင်ကာနာမိုက် ဆီရပ်',
        short_description_mm:'အဆီထွက် ထိန်းချုပ်မှု', full_description_mm:'Blemish and pore-minimizing serum.',
        skin_type:'Oily', benefits:'Pore minimizing, Oil control', ingredients:'Niacinamide, Zinc PCA',
        usage:'Apply morning and evening', size:'30ml', country_of_origin:'Canada',
        stock_quantity:55, image1:'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400',
        video_url:'', original_price:18500, discount_percent:0,
        discount_start:'', discount_end:'', featured:false, rating:4.5, sold_count:3200, created_at:now,
        _images:['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400'],
      },
      {
        id:'SKN-0006', product_code:'SKN-0006', category:'Cleanser', brand:'CeraVe',
        name_en:'Hydrating Facial Cleanser', name_mm:'နှစ်သိမ့်မှု မျက်နှာသစ်ဆေး',
        short_description_mm:'ဆီမဲ့ မျက်နှာ သစ်ဆေး', full_description_mm:'Gentle, non-foaming cleanser for sensitive skin.',
        skin_type:'Dry, Sensitive', benefits:'Hydrating, Gentle', ingredients:'Ceramides, Hyaluronic Acid, Niacinamide',
        usage:'Apply to damp skin, rinse thoroughly', size:'236ml', country_of_origin:'USA',
        stock_quantity:8, image1:'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
        video_url:'', original_price:32000, discount_percent:10,
        discount_start:'', discount_end:future, featured:true, rating:4.8, sold_count:1560, created_at:now,
        _images:['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400'],
      },
      {
        id:'SKN-0007', product_code:'SKN-0007', category:'Eye Cream', brand:'Kiehl\'s',
        name_en:'Creamy Eye Treatment with Avocado', name_mm:'မျက်လုံးဝန်းကျင် ခရင်မ်',
        short_description_mm:'မျက်လုံးဝန်းကျင် ကုသမှု', full_description_mm:'Rich avocado eye cream for dark circles.',
        skin_type:'All Skin Types', benefits:'Anti-dark circles, Moisturizing', ingredients:'Avocado Oil, Shea Butter',
        usage:'Gently tap around eye area morning and night', size:'14ml', country_of_origin:'USA',
        stock_quantity:20, image1:'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400',
        video_url:'', original_price:72000, discount_percent:0,
        discount_start:'', discount_end:'', featured:false, rating:4.7, sold_count:430, created_at:now,
        _images:['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400'],
      },
      {
        id:'SKN-0008', product_code:'SKN-0008', category:'Mask', brand:'Sulwhasoo',
        name_en:'Overnight Vitalizing Mask', name_mm:'ညဘက် ကျန်းမာရေး မျက်နှာ Mask',
        short_description_mm:'ကိုရီးယားဆေးဖက်ဝင် Mask', full_description_mm:'Traditional Korean herbal overnight mask.',
        skin_type:'All Skin Types', benefits:'Revitalizing, Brightening', ingredients:'Ginseng, Antler Mushroom',
        usage:'Apply as last step, rinse in morning', size:'120ml', country_of_origin:'South Korea',
        stock_quantity:12, image1:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        video_url:'', original_price:145000, discount_percent:30,
        discount_start:'', discount_end:future, featured:true, rating:4.9, sold_count:320, created_at:now,
        _images:['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400'],
      },
    ];
  }

  /* ── Toast ───────────────────────────────────────────────── */
  function _showToast(msg, type = 'info') {
    window.AppUtils?.showToast ? AppUtils.showToast(msg, type) : console.log(msg);
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  return {
    init,
    load,
    getAll,
    isLoaded,
    getById,
    getFeatured,
    getNewArrivals,
    getBestSellers,
    getOnSale,
    getByCategory,
    getByBrand,
    getRelated,
    getPopular,
    getTrending,
    getCategories,
    getBrands,
    getSkinTypes,
    getCountries,
    getPriceRange,
    filter,
    buildCardHTML,
    buildSkeletonHTML,
    renderProducts,
    showSkeletons,
    openQuickView,
    closeQuickView,
    addToCompare,
    removeFromCompare,
    clearCompare,
    openCompareModal,
    incrementView,
    getViewCount,
    onLoaded,
  };

})();

window.ProductsSystem = ProductsSystem;

/* ============================================================
   PHASE 2 ENHANCEMENTS — PRODUCTS RENDER / CARD POLISH
   Append only
   ============================================================ */

(function () {
  'use strict';

  if (!window.ProductsSystem) return;

  const _products = window.ProductsSystem;

  function _dispatchRendered(target, products) {
    document.dispatchEvent(new CustomEvent('products:rendered', {
      detail: {
        target,
        count: Array.isArray(products) ? products.length : 0
      }
    }));
  }

  function _enhanceRenderedCards(scope = document) {
    scope.querySelectorAll('.product-card').forEach(card => {
      card.classList.add(
        'card-luxe',
        'card-hover-lift',
        'card-hover-depth',
        'card-shine'
      );

      if (!window.matchMedia('(pointer: coarse)').matches) {
        card.classList.add('card-hover-tilt');
      }

      const body = card.querySelector('.product-card-body');
      if (body && !body.querySelector('.product-card-meta-enhanced')) {
        const brand = card.dataset.brand || '';
        const category = card.dataset.category || '';
        const skin = card.dataset.skinType || card.getAttribute('data-skin-type') || '';

        const meta = document.createElement('div');
        meta.className = 'product-card-meta-enhanced';
        meta.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.75rem;';
        meta.innerHTML = `
          ${category ? `<span class="badge-soft badge-gold">${category}</span>` : ''}
          ${brand ? `<span class="badge-soft badge-blush">${brand}</span>` : ''}
          ${skin ? `<span class="badge-soft">${skin}</span>` : ''}
        `;
        body.appendChild(meta);
      }
    });

    window.AppUtils?.initScrollReveal?.();
    window.WishlistSystem?.refreshHearts?.();
  }

  const _originalRenderProducts = _products.renderProducts;
  if (typeof _originalRenderProducts === 'function') {
    _products.renderProducts = function enhancedRenderProducts(target, products, options = {}) {
      const result = _originalRenderProducts.apply(this, arguments);

      try {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) _enhanceRenderedCards(el);
        _dispatchRendered(target, products);
      } catch (err) {
        console.warn('[ProductsEnhancer] renderProducts hook failed:', err);
      }

      return result;
    };
  }

  const _originalBuildCardHTML = _products.buildCardHTML;
  if (typeof _originalBuildCardHTML === 'function') {
    _products.buildCardHTML = function enhancedBuildCardHTML(product, options = {}) {
      let html = _originalBuildCardHTML.apply(this, arguments);

      try {
        html = html
          .replace('class="product-card shimmer-hover reveal"', 'class="product-card shimmer-hover reveal reveal-blur-up card-luxe card-shine card-hover-depth"')
          .replace('<div class="product-card-image">', '<div class="product-card-image media-zoom">');
      } catch {}

      return html;
    };
  }

  const _originalOpenQuickView = _products.openQuickView;
  if (typeof _originalOpenQuickView === 'function') {
    _products.openQuickView = function enhancedOpenQuickView(key) {
      const result = _originalOpenQuickView.apply(this, arguments);

      try {
        const modal = document.getElementById('quick-view-modal');
        const inner = document.getElementById('quick-view-inner');
        if (modal) modal.classList.add('modal-luxe');
        if (inner) {
          inner.classList.add('reveal-blur-up', 'revealed');
          const media = inner.querySelector('img');
          if (media) media.classList.add('image-hover-zoom');
        }
      } catch {}

      return result;
    };
  }

  const _originalShowSkeletons = _products.showSkeletons;
  if (typeof _originalShowSkeletons === 'function') {
    _products.showSkeletons = function enhancedShowSkeletons() {
      const result = _originalShowSkeletons.apply(this, arguments);
      try {
        document.querySelectorAll('.skeleton-card').forEach(el => {
          el.classList.add('surface-rise', 'revealed');
        });
      } catch {}
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    _enhanceRenderedCards(document);
  });
})();

