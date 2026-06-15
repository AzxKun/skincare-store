/* ============================================================
   LUMIÈRE LUXURY SKINCARE — ADVANCED SEARCH ENGINE
   search.js

   Features:
   ─ Fuzzy / typo-tolerant matching
   ─ Progressive substring fallback
   ─ SKU exact + partial matching
   ─ Burmese (Myanmar) text search
   ─ Live suggestions dropdown
   ─ Recent searches (localStorage)
   ─ Score-ranked results
   ─ Text highlighting
   ============================================================ */

'use strict';

const SearchSystem = (() => {

  /* ── Constants ───────────────────────────────────────────── */
  const RECENT_KEY  = 'lumiere_recent_searches';
  const RECENT_MAX  = 8;
  const SUGGEST_MAX = 6;
  const DEBOUNCE_MS = 220;

  /* ── State ───────────────────────────────────────────────── */
  let _config    = {};
  let _debounce  = null;
  let _activeIdx = -1; // keyboard nav index in suggestions

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  function init(config) {
    _config = config || {};
    _bindNavbar();
    _bindSearchPage();
  }

  /* ══════════════════════════════════════════════════════════
     CORE SEARCH ALGORITHM
  ══════════════════════════════════════════════════════════ */

  /**
   * Main search entry point.
   *
   * Strategy (in order of priority):
   *  1. Exact SKU match
   *  2. SKU prefix match
   *  3. Full query exact substring in any text field
   *  4. All query words present (AND logic)
   *  5. Any query word present (OR logic)
   *  6. Progressive truncation (drop last char until len ≥ 2)
   *  7. Fuzzy character-level matching (Levenshtein ≤ 2)
   *
   * @param {string}   query
   * @param {Object[]} [products]  - defaults to window._productsCache
   * @param {Object}   [opts]
   * @param {number}   [opts.limit=50]
   * @returns {Array<{ product, score, matchType, highlight }>}
   */
  function search(query, products, opts = {}) {
    const { limit = 50 } = opts;
    const pool = products || window._productsCache || [];
    if (!pool.length) return [];

    const raw   = String(query || '').trim();
    if (!raw) return [];

    const q     = raw.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    const scored = pool.map(product => {
      const score = _scoreProduct(product, q, words, raw);
      return score > 0 ? { product, score, matchType: score >= 100 ? 'exact' : score >= 50 ? 'partial' : 'fuzzy' } : null;
    }).filter(Boolean);

    // Sort by score desc, then by sold_count
    scored.sort((a, b) => b.score - a.score || b.product.sold_count - a.product.sold_count);

    return scored.slice(0, limit);
  }

  /**
   * Score a single product against the query.
   * Returns 0 if no match.
   */
  function _scoreProduct(product, q, words, raw) {
    const fields = _getSearchFields(product);
    let best = 0;

    /* ── 1. Exact SKU ───────────────────────────────────── */
    const sku = (product.product_code || product.id || '').toLowerCase();
    if (sku === q)                              best = Math.max(best, 1000);
    else if (sku.startsWith(q))                best = Math.max(best, 900);
    else if (sku.includes(q))                  best = Math.max(best, 800);

    /* ── 2. Exact full phrase in each field ─────────────── */
    for (const { text, weight } of fields) {
      if (!text) continue;
      const t = text.toLowerCase();
      if (t === q)                              best = Math.max(best, 700 * weight);
      else if (t.startsWith(q))                best = Math.max(best, 500 * weight);
      else if (t.includes(q))                  best = Math.max(best, 200 * weight);
    }

    /* ── 3. ALL words present (AND) ─────────────────────── */
    if (words.length > 1) {
      for (const { text, weight } of fields) {
        if (!text) continue;
        const t = text.toLowerCase();
        if (words.every(w => t.includes(w)))   best = Math.max(best, 150 * weight);
      }
    }

    /* ── 4. ANY word present (OR) ───────────────────────── */
    for (const { text, weight } of fields) {
      if (!text) continue;
      const t = text.toLowerCase();
      const hits = words.filter(w => t.includes(w));
      if (hits.length > 0) {
        best = Math.max(best, (80 * hits.length / words.length) * weight);
      }
    }

    /* ── 5. Progressive truncation ──────────────────────── */
    if (best === 0 && q.length >= 3) {
      for (let len = q.length - 1; len >= 2; len--) {
        const sub = q.slice(0, len);
        for (const { text, weight } of fields) {
          if (!text) continue;
          if (text.toLowerCase().includes(sub)) {
            best = Math.max(best, (20 + len) * weight);
          }
        }
        if (best > 0) break;
      }
    }

    /* ── 6. Fuzzy (Levenshtein) for short queries ───────── */
    if (best === 0 && q.length >= 3) {
      for (const word of words) {
        if (word.length < 3) continue;
        for (const { text, weight } of fields) {
          if (!text) continue;
          // Check each word in the field text
          const fieldWords = text.toLowerCase().split(/\s+/);
          for (const fw of fieldWords) {
            if (fw.length < 2) continue;
            const dist = _levenshtein(word, fw);
            if (dist <= 1)      best = Math.max(best, 40 * weight);
            else if (dist <= 2) best = Math.max(best, 20 * weight);
          }
        }
      }
    }

    return best;
  }

  /**
   * Build searchable text fields with weights for a product.
   * Higher weight = more important field.
   */
  function _getSearchFields(p) {
    return [
      { text: p.product_code,        weight: 5 },
      { text: p.name_en,             weight: 4 },
      { text: p.name_mm,             weight: 4 },
      { text: p.brand,               weight: 3 },
      { text: p.category,            weight: 3 },
      { text: p.skin_type,           weight: 2 },
      { text: p.short_description_mm,weight: 2 },
      { text: p.benefits,            weight: 2 },
      { text: p.ingredients,         weight: 1 },
      { text: p.country_of_origin,   weight: 1 },
      { text: p.full_description_mm, weight: 1 },
    ];
  }

  /* ══════════════════════════════════════════════════════════
     LEVENSHTEIN DISTANCE
  ══════════════════════════════════════════════════════════ */

  /**
   * Classic Levenshtein edit distance.
   * Optimised for short strings (search terms).
   */
  function _levenshtein(a, b) {
    if (a === b)    return 0;
    if (!a.length)  return b.length;
    if (!b.length)  return a.length;
    if (Math.abs(a.length - b.length) > 3) return 99; // early exit

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i-1] === a[j-1]
          ? matrix[i-1][j-1]
          : 1 + Math.min(matrix[i-1][j-1], matrix[i][j-1], matrix[i-1][j]);
      }
    }
    return matrix[b.length][a.length];
  }

  /* ══════════════════════════════════════════════════════════
     TEXT HIGHLIGHTING
  ══════════════════════════════════════════════════════════ */

  /**
   * Wrap matched portions of text in <mark> tags.
   *
   * @param {string} text   - original text
   * @param {string} query  - search query
   * @returns {string}      - HTML string with <mark> highlights
   */
  function highlight(text, query) {
    if (!text || !query) return text || '';
    const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
    if (!words.length) return text;

    let result = text;
    for (const word of words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(`(${escaped})`, 'gi');
      result = result.replace(regex, '<mark style="background:rgba(212,175,55,0.3);color:inherit;border-radius:2px;padding:0 1px;">$1</mark>');
    }
    return result;
  }

  /* ══════════════════════════════════════════════════════════
     RECENT SEARCHES
  ══════════════════════════════════════════════════════════ */

  function getRecentSearches() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }

  function addRecentSearch(query) {
    if (!query?.trim()) return;
    let recent = getRecentSearches().filter(q => q !== query.trim());
    recent.unshift(query.trim());
    if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
  }

  function clearRecentSearches() {
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  }

  function removeRecentSearch(query) {
    const recent = getRecentSearches().filter(q => q !== query);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
  }

  /* ══════════════════════════════════════════════════════════
     SUGGESTIONS DROPDOWN (Navbar)
  ══════════════════════════════════════════════════════════ */

  function _bindNavbar() {
    // Search overlay open/close
    document.addEventListener('click', e => {
      if (e.target.closest('[data-open-search]')) _openSearchOverlay();
      if (e.target.closest('#search-overlay-backdrop')) _closeSearchOverlay();
      if (e.target.closest('#search-close-btn'))  _closeSearchOverlay();
    });

    // Wire up overlay input
    document.addEventListener('input', e => {
      if (e.target.id === 'search-overlay-input') {
        _handleOverlayInput(e.target);
      }
    });

    // Keyboard nav in suggestions
    document.addEventListener('keydown', e => {
      if (e.target.id === 'search-overlay-input') {
        _handleSearchKeydown(e, 'overlay-suggestions');
      }
    });
  }

  function _openSearchOverlay() {
    let overlay = document.getElementById('search-overlay');
    if (!overlay) {
      overlay = _buildSearchOverlayDOM();
      document.body.appendChild(overlay);
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => overlay.querySelector('#search-overlay-input')?.focus(), 80);
    _renderOverlaySuggestions('', overlay);
  }

  function _closeSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
    _activeIdx = -1;
  }

  function _buildSearchOverlayDOM() {
    const el = document.createElement('div');
    el.id        = 'search-overlay';
    el.className = 'search-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Search');
    el.innerHTML = `
      <div id="search-overlay-backdrop" class="modal-backdrop" style="position:absolute;inset:0;"></div>
      <div class="search-box" style="position:relative;z-index:1;">
        <div class="search-input-wrap">
          <span style="font-size:1.1rem;color:var(--text-muted);margin-right:var(--space-3);">🔍</span>
          <input
            id="search-overlay-input"
            type="search"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="Search products, SKU, brand... (ရှာပါ)"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="overlay-suggestions"
          />
          <button
            id="search-close-btn"
            style="font-size:1rem;color:var(--text-muted);padding:var(--space-2);transition:color 0.15s;"
            aria-label="Close search"
          >✕</button>
        </div>
        <div id="overlay-suggestions" class="search-suggestions" role="listbox" style="display:none;border-radius:0 0 var(--radius-xl) var(--radius-xl);"></div>
      </div>`;
    return el;
  }

  function _handleOverlayInput(input) {
    clearTimeout(_debounce);
    _activeIdx = -1;
    const q = input.value.trim();

    _debounce = setTimeout(() => {
      const overlay = document.getElementById('search-overlay');
      _renderOverlaySuggestions(q, overlay);
    }, DEBOUNCE_MS);
  }

  function _renderOverlaySuggestions(q, overlay) {
    const box = overlay?.querySelector('#overlay-suggestions');
    if (!box) return;

    if (!q) {
      // Show recent searches
      const recent = getRecentSearches();
      if (!recent.length) { box.style.display = 'none'; return; }

      box.style.display = '';
      box.innerHTML = `
        <div style="padding:var(--space-3) var(--space-6) var(--space-2);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:var(--font-ui);font-size:var(--text-xs);letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);">Recent Searches</span>
          <button onclick="SearchSystem.clearRecentSearches();this.closest('.search-suggestions').style.display='none';"
            style="font-size:var(--text-xs);color:var(--rose-gold);background:none;border:none;cursor:pointer;">Clear</button>
        </div>
        ${recent.map(r => `
          <div class="search-suggestion-item" role="option"
            onclick="SearchSystem.executeSearch('${_esc(r)}')"
            onmouseenter="SearchSystem._setActive(this)">
            <span style="color:var(--text-muted);font-size:1rem;width:48px;text-align:center;flex-shrink:0;">🕐</span>
            <div>
              <div class="search-suggestion-name">${_esc(r)}</div>
            </div>
          </div>`).join('')}`;
      return;
    }

    // Live search
    const results = search(q, null, { limit: SUGGEST_MAX });
    if (!results.length) {
      box.style.display = '';
      box.innerHTML = `
        <div style="padding:var(--space-5) var(--space-6);text-align:center;">
          <div style="font-size:1.5rem;margin-bottom:var(--space-2);">🔍</div>
          <div style="font-family:var(--font-display);font-size:var(--text-base);font-weight:600;color:var(--text);margin-bottom:var(--space-1);">
            No results for "<em>${_esc(q)}</em>"
          </div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);">
            ရလဒ် မတွေ့ပါ — Try a different spelling or browse categories
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:center;margin-top:var(--space-4);">
            ${(window.ProductsSystem?.getCategories() || []).slice(0,4).map(cat =>
              `<button class="search-tag" onclick="SearchSystem.executeSearch('${_esc(cat)}')">${cat}</button>`
            ).join('')}
          </div>
        </div>`;
      return;
    }

    box.style.display = '';
    box.innerHTML = results.map(({ product, matchType }) => {
      const imgSrc = product.image1 || 'assets/images/placeholder.jpg';
      const price  = window.DiscountSystem
        ? DiscountSystem.calculatePrice(product).finalFormatted
        : `K ${product.original_price}`;
      const nameHL = highlight(product.name_en || product.name_mm, q);
      const brandHL = highlight(product.brand, q);

      return `
        <div
          class="search-suggestion-item"
          role="option"
          onclick="SearchSystem.goToProduct('${_esc(product.product_code||product.id)}', '${_esc(q)}')"
          onmouseenter="SearchSystem._setActive(this)"
        >
          <img src="${imgSrc}" alt="${_esc(product.name_en||product.name_mm)}"
            class="search-suggestion-img"
            loading="lazy"
            onerror="this.src='assets/images/placeholder.jpg'" />
          <div style="flex:1;min-width:0;">
            <div class="search-suggestion-name">${nameHL}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${brandHL} · ${product.product_code}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div class="search-suggestion-price">${price}</div>
            ${matchType === 'fuzzy' ? '<div style="font-size:0.6rem;color:var(--text-muted);">similar</div>' : ''}
          </div>
        </div>`;
    }).join('') + `
      <div style="padding:var(--space-3) var(--space-6);border-top:1px solid var(--border-soft);">
        <button
          class="btn btn-ghost w-full"
          style="font-size:var(--text-sm);justify-content:center;"
          onclick="SearchSystem.executeSearch('${_esc(q)}')"
        >
          See all results for "<strong>${_esc(q)}</strong>" →
        </button>
      </div>`;
  }

  /* ── Keyboard Navigation ─────────────────────────────────── */

  function _handleSearchKeydown(e, suggestionsId) {
    const box   = document.getElementById(suggestionsId);
    if (!box || box.style.display === 'none') {
      if (e.key === 'Enter') {
        executeSearch(e.target.value);
      }
      return;
    }

    const items = box.querySelectorAll('.search-suggestion-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _activeIdx = Math.min(_activeIdx + 1, items.length - 1);
      _highlightActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _activeIdx = Math.max(_activeIdx - 1, -1);
      _highlightActive(items);
      if (_activeIdx === -1) e.target.value = e.target.dataset.originalValue || e.target.value;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_activeIdx >= 0 && items[_activeIdx]) {
        items[_activeIdx].click();
      } else {
        executeSearch(e.target.value);
      }
    } else if (e.key === 'Escape') {
      _closeSearchOverlay();
    }
  }

  function _highlightActive(items) {
    items.forEach((item, i) => {
      item.style.background = i === _activeIdx ? 'var(--surface-2)' : '';
    });
    if (_activeIdx >= 0) items[_activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function _setActive(el) {
    const items = el.parentElement?.querySelectorAll('.search-suggestion-item');
    if (!items) return;
    items.forEach((item, i) => {
      if (item === el) _activeIdx = i;
      item.style.background = item === el ? 'var(--surface-2)' : '';
    });
  }

  /* ══════════════════════════════════════════════════════════
     SEARCH ACTIONS
  ══════════════════════════════════════════════════════════ */

  /**
   * Navigate to search results page with query.
   */
  function executeSearch(query) {
    const q = String(query || '').trim();
    if (!q) return;
    addRecentSearch(q);
    _closeSearchOverlay();
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  }

  /**
   * Navigate directly to a product page.
   */
  function goToProduct(key, query = '') {
    if (query) addRecentSearch(query);
    _closeSearchOverlay();
    window.location.href = `product.html?id=${encodeURIComponent(key)}`;
  }

  /* ══════════════════════════════════════════════════════════
     SEARCH PAGE (search.html)
  ══════════════════════════════════════════════════════════ */

  function _bindSearchPage() {
    const input  = document.getElementById('search-page-input');
    const btn    = document.getElementById('search-page-btn');
    if (!input) return;

    // Load query from URL
    const q = new URLSearchParams(window.location.search).get('q') || '';
    if (q) {
      input.value = q;
      _runSearchPage(q);
    }

    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      _debounce = setTimeout(() => _runSearchPage(input.value), DEBOUNCE_MS);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        clearTimeout(_debounce);
        _runSearchPage(input.value);
        addRecentSearch(input.value.trim());
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('q', input.value.trim());
        window.history.replaceState({}, '', url);
      }
    });

    if (btn) {
      btn.addEventListener('click', () => {
        _runSearchPage(input.value);
        addRecentSearch(input.value.trim());
      });
    }

    // Popular tags
    document.querySelectorAll('[data-search-tag]').forEach(tag => {
      tag.addEventListener('click', () => {
        const val = tag.dataset.searchTag || tag.textContent.trim();
        input.value = val;
        executeSearch(val);
      });
    });
  }

  function _runSearchPage(query) {
    const grid     = document.getElementById('search-results-grid');
    const countEl  = document.getElementById('search-results-count');
    const queryEl  = document.getElementById('search-query-display');
    const emptyEl  = document.getElementById('search-empty');

    if (!grid) return;

    const q = query.trim();

    if (queryEl) queryEl.textContent = q || 'All Products';

    if (!q) {
      // Show all products
      const all = window._productsCache || [];
      if (countEl) countEl.textContent = all.length;
      if (emptyEl) emptyEl.style.display = 'none';
      window.ProductsSystem?.renderProducts(grid, all);
      return;
    }

    const results = search(q);
    const products = results.map(r => r.product);

    if (countEl) countEl.textContent = products.length;

    if (!products.length) {
      grid.innerHTML = '';
      if (emptyEl) {
        emptyEl.style.display = '';
        // Suggest corrections
        const corrections = _suggestCorrections(q);
        const corrEl = document.getElementById('search-correction');
        if (corrEl && corrections.length) {
          corrEl.innerHTML = `Did you mean: ${corrections.map(c =>
            `<a href="search.html?q=${encodeURIComponent(c)}" style="color:var(--rose-gold);text-decoration:underline;">${c}</a>`
          ).join(', ')} ?`;
          corrEl.style.display = '';
        }
      }
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // Render with highlights
    grid.innerHTML = results.map(({ product, matchType }) => {
      const card = window.ProductsSystem?.buildCardHTML(product) || '';
      return card;
    }).join('');

    window.WishlistSystem?.refreshHearts();
    window.AppUtils?.initScrollReveal();
  }

  /**
   * Suggest close queries when no results found.
   * Looks for products whose name is "close" to the query.
   */
  function _suggestCorrections(q) {
    const pool = window._productsCache || [];
    const suggestions = new Set();

    for (const p of pool) {
      const names = [p.name_en, p.brand, p.category].filter(Boolean);
      for (const name of names) {
        for (const word of name.split(/\s+/)) {
          if (word.length < 3) continue;
          if (_levenshtein(q.toLowerCase(), word.toLowerCase()) <= 2) {
            suggestions.add(word);
          }
        }
      }
      if (suggestions.size >= 3) break;
    }

    return [...suggestions].slice(0, 3);
  }

  /* ══════════════════════════════════════════════════════════
     FILTER INTEGRATION (for category.html / search.html)
  ══════════════════════════════════════════════════════════ */

  /**
   * Full filter + search combo.
   * Used on category page where user may also type a query.
   *
   * @param {string}   query   - text query (may be empty)
   * @param {Object}   filters - same shape as ProductsSystem.filter opts
   * @returns {Object[]}       - product array
   */
  function filterAndSearch(query, filters = {}) {
    let pool = window._productsCache || [];

    // Apply structural filters first (faster)
    if (Object.keys(filters).length) {
      pool = window.ProductsSystem?.filter({ ...filters }) || pool;
    }

    // Then text search
    if (query?.trim()) {
      const results = search(query.trim(), pool, { limit: 200 });
      return results.map(r => r.product);
    }

    return pool;
  }

  /* ══════════════════════════════════════════════════════════
     AUTOCOMPLETE for search.html large bar
  ══════════════════════════════════════════════════════════ */

  /**
   * Wire up a standalone search input with live suggestions.
   *
   * @param {string|Element} inputEl    - the input
   * @param {string|Element} suggestEl  - the suggestions container
   */
  function bindAutocomplete(inputEl, suggestEl) {
    const input   = typeof inputEl   === 'string' ? document.querySelector(inputEl)   : inputEl;
    const suggest = typeof suggestEl === 'string' ? document.querySelector(suggestEl) : suggestEl;
    if (!input || !suggest) return;

    const suggestId = suggest.id || 'autocomplete-suggestions';

    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      _activeIdx = -1;
      _debounce  = setTimeout(() => _renderAutocompleteSuggestions(input.value, suggest), DEBOUNCE_MS);
    });

    input.addEventListener('keydown', e => _handleSearchKeydown(e, suggestId));

    input.addEventListener('blur', () => {
      setTimeout(() => { suggest.style.display = 'none'; }, 150);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) _renderAutocompleteSuggestions(input.value, suggest);
    });
  }

  function _renderAutocompleteSuggestions(q, suggest) {
    if (!q?.trim()) { suggest.style.display = 'none'; return; }

    const results = search(q, null, { limit: SUGGEST_MAX });
    if (!results.length) { suggest.style.display = 'none'; return; }

    suggest.style.display = '';
    suggest.innerHTML = results.map(({ product }) => {
      const imgSrc = product.image1 || 'assets/images/placeholder.jpg';
      const price  = window.DiscountSystem
        ? DiscountSystem.calculatePrice(product).finalFormatted
        : `K ${product.original_price}`;

      return `
        <div class="search-suggestion-item"
          onclick="SearchSystem.goToProduct('${_esc(product.product_code||product.id)}', '${_esc(q)}')"
          onmouseenter="SearchSystem._setActive(this)"
          role="option"
        >
          <img src="${imgSrc}" class="search-suggestion-img" loading="lazy"
            onerror="this.src='assets/images/placeholder.jpg'" />
          <div style="flex:1;min-width:0;">
            <div class="search-suggestion-name">${highlight(product.name_en||product.name_mm, q)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">
              ${highlight(product.brand, q)} · ${product.product_code}
            </div>
          </div>
          <span class="search-suggestion-price">${price}</span>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     POPULAR SEARCHES (for tags on search page)
  ══════════════════════════════════════════════════════════ */

  /**
   * Get the most searched-for terms from recent searches + top brands/categories.
   */
  function getPopularTerms(limit = 8) {
    const terms  = new Set();
    const recent = getRecentSearches();
    recent.forEach(r => terms.add(r));

    const pool = window._productsCache || [];
    const brands = [...new Set(pool.map(p => p.brand).filter(Boolean))];
    const cats   = [...new Set(pool.map(p => p.category).filter(Boolean))];

    // Add top brands + categories
    brands.slice(0, 4).forEach(b => terms.add(b));
    cats.slice(0, 4).forEach(c => terms.add(c));

    return [...terms].slice(0, limit);
  }

  /* ══════════════════════════════════════════════════════════
     UTILS
  ══════════════════════════════════════════════════════════ */

  /** HTML-escape for inline onclick strings */
  function _esc(str) {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  return {
    init,
    search,
    highlight,
    executeSearch,
    goToProduct,
    filterAndSearch,
    bindAutocomplete,
    getRecentSearches,
    addRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
    getPopularTerms,
    // Internal (used in inline onclick handlers)
    _setActive,
  };

})();

window.SearchSystem = SearchSystem;

