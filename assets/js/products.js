/* ============================================================
   LUMIÈRE LUXURY SKINCARE — PRODUCTS SYSTEM
   products.js
   Uses public Google Sheets GViz JSON endpoint (no API key)
   ============================================================ */

'use strict';

const ProductsSystem = (() => {

  /* ── State ───────────────────────────────────────────────── */
  let _all = [];
  let _config = {};
  let _loaded = false;
  let _loading = false;
  let _listeners = [];

  /* ── View count (session/local) ──────────────────────────── */
  const _viewCounts = (() => {
    try { return JSON.parse(localStorage.getItem('lumiere_views') || '{}'); }
    catch { return {}; }
  })();

  function _saveViews() {
    try { localStorage.setItem('lumiere_views', JSON.stringify(_viewCounts)); } catch {}
  }

  /* ══════════════════════════════════════════════════════════
     INIT & LOAD
  ══════════════════════════════════════════════════════════ */

  async function init(config) {
    _config = config || {};
    window._appConfig = _config || {};
    await load();
  }

  async function load() {
    if (_loading) return _all;
    _loading = true;

    const {
      sheet_id,
      sheet_name = 'Products'
    } = _config.google_sheets || {};

    if (!sheet_id) {
      console.warn('[Products] No Google Sheet ID provided — using empty product list.');
      _all = [];
      _loaded = true;
      _loading = false;
      window._productsCache = _all;
      _emit('loaded', _all);
      document.dispatchEvent(new CustomEvent('products:load-error', {
        detail: { reason: 'missing_sheet_id' }
      }));
      return _all;
    }

    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheet_id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet_name)}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`GViz fetch failed: ${res.status}`);

      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);

      if (!match || !match[1]) {
        throw new Error('Invalid GViz response format.');
      }

      const payload = JSON.parse(match[1]);
      const rows = _parseGVizTable(payload.table);

      _all = _parseSheet(rows);
      _loaded = true;

      document.dispatchEvent(new CustomEvent('products:loaded-gviz', {
        detail: { count: _all.length, sheet: sheet_name }
      }));

    } catch (err) {
      console.error('[Products] Load failed:', err);
      _all = [];
      _loaded = true;

      document.dispatchEvent(new CustomEvent('products:load-error', {
        detail: {
          reason: 'fetch_failed',
          message: String(err?.message || err)
        }
      }));
    }

    _loading = false;
    window._productsCache = _all;
    _emit('loaded', _all);
    return _all;
  }

  function isLoaded() {
    return _loaded;
  }

  /* ══════════════════════════════════════════════════════════
     GVIZ PARSER
  ══════════════════════════════════════════════════════════ */

  function _parseGVizDate(value, formattedValue = '') {
    if (formattedValue && /^\d{4}-\d{2}-\d{2}$/.test(formattedValue)) {
      return formattedValue;
    }

    if (typeof value === 'string') {
      const m = value.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
      if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]) + 1;
        const day = Number(m[3]);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return formattedValue || value || '';
  }

  function _parseGVizTable(table) {
    if (!table || !table.cols || !table.rows) return [];

    const headers = table.cols.map(col => (col.label || col.id || '').toString().trim());

    const body = table.rows.map(row => {
      const cells = row.c || [];
      return headers.map((header, i) => {
        const cell = cells[i];
        if (!cell) return '';

        const raw = cell.v;
        const formatted = cell.f;

        if (header === 'discount_start' || header === 'discount_end' || header === 'created_at') {
          return _parseGVizDate(raw, formatted);
        }

        if (typeof raw === 'boolean') return raw ? 'true' : 'false';
        if (typeof raw === 'number') return String(raw);
        if (formatted !== undefined && formatted !== null && formatted !== '') return String(formatted).trim();
        if (raw === undefined || raw === null) return '';

        return String(raw).trim();
      });
    });

    return [headers, ...body];
  }

  /* ══════════════════════════════════════════════════════════
     SHEET PARSER
  ══════════════════════════════════════════════════════════ */

  function _parseSheet(rows) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map(h =>
      String(h).trim().toLowerCase().replace(/\s+/g, '_')
    );

    return rows.slice(1)
      .filter(row => row.some(cell => cell !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = (row[i] || '').toString().trim();
        });
        return _normalise(obj);
      })
      .filter(p => p.id || p.product_code);
  }

  function _normalise(raw) {
    const p = { ...raw };

    p.id = _string(p.id || p.product_id || p.product_code);
    p.product_code = _string(p.product_code || p.sku || p.id);
    p.name_en = _string(p.name_en || p.name || '');
    p.name_mm = _string(p.name_mm || '');
    p.brand = _string(p.brand || '');
    p.category = _string(p.category || '');
    p.subcategory = _string(p.subcategory || '');
    p.skin_type = _string(p.skin_type || '');
    p.concern = _string(p.concern || '');
    p.size = _string(p.size || '');
    p.country_of_origin = _string(p.country_of_origin || p.origin || '');

    p.original_price = _number(p.original_price);
    p.discount_percent = _number(p.discount_percent);
    p.discount_start = _string(p.discount_start || '');
    p.discount_end = _string(p.discount_end || '');
    p.stock_quantity = _int(p.stock_quantity);

    p.image1 = _string(p.image1 || p.image || '');
    p.image2 = _string(p.image2 || '');
    p.image3 = _string(p.image3 || '');
    p.image4 = _string(p.image4 || '');
    p.video_url = _string(p.video_url || '');

    p.short_description_en = _string(p.short_description_en || '');
    p.short_description_mm = _string(p.short_description_mm || '');
    p.full_description_en = _string(p.full_description_en || '');
    p.full_description_mm = _string(p.full_description_mm || '');

    p.ingredients = _string(p.ingredients || '');
    p.benefits = _string(p.benefits || '');
    p.how_to_use = _string(p.how_to_use || '');

    p.rating = _number(p.rating || 0);
    p.reviews_count = _int(p.reviews_count || 0);
    p.sold_count = _int(p.sold_count || 0);

    p.is_featured = _bool(p.is_featured);
    p.is_new = _bool(p.is_new);
    p.created_at = _string(p.created_at || '');

    p.tags = _string(p.tags || '');
    p.images = [p.image1, p.image2, p.image3, p.image4].filter(Boolean);

    return p;
  }

  /* ══════════════════════════════════════════════════════════
     NORMALISERS
  ══════════════════════════════════════════════════════════ */

  function _string(v) {
    return v === undefined || v === null ? '' : String(v).trim();
  }

  function _number(v) {
    const n = parseFloat(String(v || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function _int(v) {
    const n = parseInt(String(v || '').replace(/,/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function _bool(v) {
    const s = String(v || '').trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }

  function _key(product) {
    return product.product_code || product.id || product.name_en || '';
  }

  /* ══════════════════════════════════════════════════════════
     GETTERS
  ══════════════════════════════════════════════════════════ */

  function getAll() {
    return [..._all];
  }

  function getById(id) {
    const key = String(id || '').trim().toLowerCase();
    return _all.find(p =>
      String(p.id || '').toLowerCase() === key ||
      String(p.product_code || '').toLowerCase() === key
    ) || null;
  }

  function getByCategory(category) {
    const c = String(category || '').trim().toLowerCase();
    return _all.filter(p => String(p.category || '').toLowerCase() === c);
  }

  function getCategories() {
    return [...new Set(_all.map(p => p.category).filter(Boolean))].sort();
  }

  function getBrands() {
    return [...new Set(_all.map(p => p.brand).filter(Boolean))].sort();
  }

  function getPopular(limit = 8) {
    return [..._all]
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      .slice(0, limit);
  }

  function getTrending(limit = 8) {
    return [..._all]
      .sort((a, b) =>
        ((b.sold_count || 0) + (b.rating || 0) * 50) -
        ((a.sold_count || 0) + (a.rating || 0) * 50)
      )
      .slice(0, limit);
  }

  function getFeatured(limit = 8) {
    const featured = _all.filter(p => p.is_featured);
    return (featured.length ? featured : _all).slice(0, limit);
  }

  function getNewArrivals(limit = 8) {
    return [..._all]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, limit);
  }

  function getRelated(product, limit = 8) {
    if (!product) return getPopular(limit);

    const key = _key(product);
    const related = _all.filter(p => {
      if (_key(p) === key) return false;
      return (
        (p.category && p.category === product.category) ||
        (p.brand && p.brand === product.brand) ||
        (p.skin_type && p.skin_type === product.skin_type)
      );
    });

    return related.slice(0, limit);
  }

  function filter(opts = {}) {
    let arr = [..._all];

    if (opts.category) {
      const c = String(opts.category).trim().toLowerCase();
      arr = arr.filter(p => String(p.category || '').toLowerCase() === c);
    }

    if (opts.brand) {
      const b = String(opts.brand).trim().toLowerCase();
      arr = arr.filter(p => String(p.brand || '').toLowerCase() === b);
    }

    if (opts.skin_type) {
      const s = String(opts.skin_type).trim().toLowerCase();
      arr = arr.filter(p => String(p.skin_type || '').toLowerCase() === s);
    }

    if (opts.minPrice != null) {
      const min = Number(opts.minPrice) || 0;
      arr = arr.filter(p => (p.original_price || 0) >= min);
    }

    if (opts.maxPrice != null) {
      const max = Number(opts.maxPrice) || 0;
      arr = arr.filter(p => (p.original_price || 0) <= max);
    }

    switch (opts.sortBy) {
      case 'newest':
        arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'price_asc':
        arr.sort((a, b) => (a.original_price || 0) - (b.original_price || 0));
        break;
      case 'price_desc':
        arr.sort((a, b) => (b.original_price || 0) - (a.original_price || 0));
        break;
      case 'rating':
        arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'discount':
        arr.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
        break;
      case 'popular':
      default:
        arr.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        break;
    }

    return arr;
  }

  /* ══════════════════════════════════════════════════════════
     VIEW COUNTS / RECENT
  ══════════════════════════════════════════════════════════ */

  function incrementView(id) {
    const key = String(id || '').trim();
    if (!key) return 0;
    _viewCounts[key] = (_viewCounts[key] || 0) + 1;
    _saveViews();
    return _viewCounts[key];
  }

  function getViewCount(id) {
    return _viewCounts[String(id || '').trim()] || 0;
  }

  function addRecentlyViewed(product) {
    if (!product) return;
    const key = _key(product);
    try {
      const current = JSON.parse(localStorage.getItem('lumiere_viewed') || '[]');
      const next = [key, ...current.filter(k => k !== key)].slice(0, 12);
      localStorage.setItem('lumiere_viewed', JSON.stringify(next));
    } catch {}
  }

  function getRecentlyViewed(limit = 8) {
    try {
      const keys = JSON.parse(localStorage.getItem('lumiere_viewed') || '[]');
      return keys
        .map(k => getById(k))
        .filter(Boolean)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDERING
  ══════════════════════════════════════════════════════════ */

  function buildCardHTML(product) {
    const priceInfo = window.DiscountSystem?.calculatePrice(product) || {
      finalFormatted: '',
      originalFormatted: '',
      discountLabel: '',
      hasDiscount: false
    };

    const img = product.image1 || 'assets/images/placeholder.jpg';
    const wishlistKey = product.product_code || product.id || '';

    return `
      <article class="product-card shimmer-hover reveal" role="listitem"
        data-product-key="${_escape(wishlistKey)}"
        data-brand="${_escape(product.brand || '')}"
        data-category="${_escape(product.category || '')}"
        data-skin-type="${_escape(product.skin_type || '')}">
        <a href="product.html?id=${encodeURIComponent(wishlistKey)}" class="product-card-image">
          <img src="${_escape(img)}" alt="${_escape(product.name_en || 'Product')}" loading="lazy" onerror="this.src='assets/images/placeholder.jpg'" />
        </a>
        <div class="product-card-body">
          <div class="product-card-brand">${_escape(product.brand || '')}</div>
          <h3 class="product-card-title">
            <a href="product.html?id=${encodeURIComponent(wishlistKey)}">${_escape(product.name_en || '')}</a>
          </h3>
          ${window.DiscountSystem?.buildCardPriceHTML ? window.DiscountSystem.buildCardPriceHTML(priceInfo) : ''}
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4);">
            <button class="btn btn-primary btn-sm add-to-cart-btn" data-add-to-cart="${_escape(wishlistKey)}">Add to Cart</button>
            <button class="btn btn-outline btn-sm wishlist-btn" data-wishlist-toggle="${_escape(wishlistKey)}">Save</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderProducts(target, products, options = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const items = Array.isArray(products) ? products : [];
    el.innerHTML = items.map(buildCardHTML).join('');

    if (window.AppUtils?.initScrollReveal) window.AppUtils.initScrollReveal();
    if (window.WishlistSystem?.refreshHearts) window.WishlistSystem.refreshHearts();

    document.dispatchEvent(new CustomEvent('products:rendered', {
      detail: { target: el, count: items.length, options }
    }));
  }

  function showSkeletons(target, count = 8) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = Array.from({ length: count }).map(() => `
      <div class="skeleton-card"></div>
    `).join('');
  }

  function renderRecentlyViewed(target, limit = 8) {
    renderProducts(target, getRecentlyViewed(limit));
  }

  /* ══════════════════════════════════════════════════════════
     QUICK VIEW / COMPARE
  ══════════════════════════════════════════════════════════ */

  function openQuickView(id) {
    const product = getById(id);
    if (!product) return;

    const modal = document.getElementById('quick-view-modal');
    const inner = document.getElementById('quick-view-inner');
    if (!modal || !inner) return;

    inner.innerHTML = `
      <div class="quick-view-grid">
        <img src="${_escape(product.image1 || 'assets/images/placeholder.jpg')}" alt="${_escape(product.name_en || '')}" />
        <div>
          <div class="product-card-brand">${_escape(product.brand || '')}</div>
          <h2>${_escape(product.name_en || '')}</h2>
          <p>${_escape(product.short_description_en || product.short_description_mm || '')}</p>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  function addToCompare(id) {
    try {
      const product = getById(id);
      if (!product) return false;
      const current = JSON.parse(localStorage.getItem('lumiere_compare') || '[]');
      const key = _key(product);
      const next = [key, ...current.filter(k => k !== key)].slice(0, 4);
      localStorage.setItem('lumiere_compare', JSON.stringify(next));
      window.AppUtils?.showToast?.('Added to compare', 'success');
      return true;
    } catch {
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════
     EVENTS
  ══════════════════════════════════════════════════════════ */

  function onLoaded(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  function _emit(type, payload) {
    if (type === 'loaded') {
      _listeners.forEach(fn => {
        try { fn(payload); } catch {}
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     UTILS
  ══════════════════════════════════════════════════════════ */

  function _escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Public API ──────────────────────────────────────────── */
  return {
    init,
    load,
    isLoaded,
    getAll,
    getById,
    getByCategory,
    getCategories,
    getBrands,
    getPopular,
    getTrending,
    getFeatured,
    getNewArrivals,
    getRelated,
    filter,
    incrementView,
    getViewCount,
    addRecentlyViewed,
    getRecentlyViewed,
    renderProducts,
    renderRecentlyViewed,
    buildCardHTML,
    showSkeletons,
    openQuickView,
    addToCompare,
    onLoaded,

    /* exposed for compatibility / enhancements */
    _parseSheet
  };

})();

window.ProductsSystem = ProductsSystem;

