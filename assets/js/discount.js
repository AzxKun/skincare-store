/* ============================================================
   LUMIÈRE LUXURY SKINCARE — DISCOUNT SYSTEM
   discount.js
   ============================================================ */

'use strict';

const DiscountSystem = (() => {

  /* ── Config ─────────────────────────────────────────────── */
  let _currency = { symbol: 'K', format: 'symbol_before', thousands_separator: ',' };
  let _activeTimers = new Map();

  /* ── Init ───────────────────────────────────────────────── */
  function init(config) {
    if (config?.currency) _currency = config.currency;
  }

  /* ══════════════════════════════════════════════════════════
     PRICE FORMATTING
  ══════════════════════════════════════════════════════════ */

  function formatPrice(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    const num = Math.round(Number(amount));
    const formatted = num.toLocaleString('en-US').replace(/,/g, _currency.thousands_separator || ',');
    return _currency.format === 'symbol_before'
      ? `${_currency.symbol} ${formatted}`
      : `${formatted} ${_currency.symbol}`;
  }

  function formatPriceCompact(amount) {
    const num = Math.round(Number(amount));
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M ${_currency.symbol}`;
    if (num >= 1000)    return `${(num / 1000).toFixed(0)}K ${_currency.symbol}`;
    return formatPrice(num);
  }

  /* ══════════════════════════════════════════════════════════
     DATE PARSING
  ══════════════════════════════════════════════════════════ */

  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (!s) return null;
    const iso = new Date(s);
    if (!isNaN(iso)) return iso;
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    return null;
  }

  /* ══════════════════════════════════════════════════════════
     DISCOUNT LOGIC
  ══════════════════════════════════════════════════════════ */

  function getDiscountStatus(discountStart, discountEnd) {
    const now   = new Date();
    const start = parseDate(discountStart);
    const end   = parseDate(discountEnd);

    if (!start && !end) return { active: true, started: true, ended: false };

    const started = start ? now >= start : true;
    const ended   = end   ? now > end    : false;

    return { active: started && !ended, started, ended, start, end, now };
  }

  function calculatePrice(product) {
    const original  = parseFloat(product.original_price)  || 0;
    const discPct   = parseFloat(product.discount_percent) || 0;
    const status    = getDiscountStatus(product.discount_start, product.discount_end);
    const hasDiscount = discPct > 0 && status.active;

    const savings = hasDiscount ? Math.round(original * (discPct / 100)) : 0;
    const final   = hasDiscount ? original - savings : original;

    return {
      original, final, savings,
      discountPercent:   hasDiscount ? discPct : 0,
      hasDiscount,
      isOnSale:          hasDiscount,
      isFlashSale:       hasDiscount && !!(product.discount_start || product.discount_end),
      status,
      originalFormatted: formatPrice(original),
      finalFormatted:    formatPrice(final),
      savingsFormatted:  formatPrice(savings),
      discountLabel:     hasDiscount ? `-${Math.round(discPct)}%` : '',
    };
  }

  /* ══════════════════════════════════════════════════════════
     HTML BUILDERS
  ══════════════════════════════════════════════════════════ */

  function buildCardPriceHTML(priceInfo) {
    if (priceInfo.hasDiscount) {
      return `<div class="product-price">
        <span class="price-current">${priceInfo.finalFormatted}</span>
        <span class="price-original">${priceInfo.originalFormatted}</span>
        <span class="price-discount-tag">${priceInfo.discountLabel}</span>
      </div>`;
    }
    return `<div class="product-price">
      <span class="price-normal">${priceInfo.finalFormatted}</span>
    </div>`;
  }

  function buildDetailPriceHTML(priceInfo) {
    if (priceInfo.hasDiscount) {
      return `<div class="product-detail-price">
        <div>
          <span class="detail-price-current">${priceInfo.finalFormatted}</span>
          <span class="detail-price-original">${priceInfo.originalFormatted}</span>
        </div>
        <div class="detail-price-save">
          သင် ${priceInfo.savingsFormatted} သက်သာသည် &nbsp;·&nbsp; ${priceInfo.discountLabel} OFF
        </div>
      </div>`;
    }
    return `<div class="product-detail-price">
      <span class="detail-price-current">${priceInfo.finalFormatted}</span>
    </div>`;
  }

  function buildBadgeHTML(product, priceInfo, stockStatus) {
    const badges = [];

    if (priceInfo.hasDiscount) {
      badges.push(`<span class="badge badge-sale">🔥 ${priceInfo.discountLabel}</span>`);
    }

    const daysOld = product.created_at
      ? Math.floor((Date.now() - new Date(product.created_at)) / 86400000)
      : 999;
    if (daysOld <= 14) badges.push(`<span class="badge badge-new">NEW</span>`);

    const sold = parseInt(product.sold_count) || 0;
    if (sold >= 500) badges.push(`<span class="badge badge-hot">HOT</span>`);

    if (stockStatus === 'low') badges.push(`<span class="badge badge-low">⚡ LOW STOCK</span>`);

    return badges.length ? `<div class="product-badge">${badges.join('')}</div>` : '';
  }

  /* ══════════════════════════════════════════════════════════
     STOCK
  ══════════════════════════════════════════════════════════ */

  function getStockStatus(qty, config) {
    const q   = parseInt(qty) || 0;
    const low = config?.stock_rules?.low_stock_threshold ?? 20;
    if (q <= 0)   return 'out';
    if (q <= low) return 'low';
    return 'in';
  }

  function buildStockHTML(qty, config) {
    const status = getStockStatus(qty, config);
    const map = {
      in:  { label: 'In Stock',     labelMM: 'အရောင်ပြန်ရသည်', cls: 'stock-in'  },
      low: { label: 'Low Stock',    labelMM: 'ကုန်လုနီးနေပြီ',  cls: 'stock-low' },
      out: { label: 'Out of Stock', labelMM: 'ကုန်သွားပြီ',     cls: 'stock-out' },
    };
    const s = map[status];
    return `<div class="stock-status ${s.cls}">
      <span class="stock-dot"></span>
      <span>${s.label}</span>
      <span style="opacity:0.6">&nbsp;·&nbsp;${s.labelMM}</span>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     COUNTDOWN TIMER
  ══════════════════════════════════════════════════════════ */

  function getTimeRemaining(targetDate) {
    const target = parseDate(targetDate);
    if (!target) return null;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      total:   diff,
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000)  / 60000),
      seconds: Math.floor((diff % 60000)    / 1000),
    };
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function buildTimerHTML(id = 'flash-timer') {
    return `<div class="flash-timer" id="${id}">
      <div class="timer-unit">
        <span class="timer-value" data-unit="days">00</span>
        <span class="timer-label">Days</span>
      </div>
      <span class="timer-colon">:</span>
      <div class="timer-unit">
        <span class="timer-value" data-unit="hours">00</span>
        <span class="timer-label">Hrs</span>
      </div>
      <span class="timer-colon">:</span>
      <div class="timer-unit">
        <span class="timer-value" data-unit="minutes">00</span>
        <span class="timer-label">Min</span>
      </div>
      <span class="timer-colon">:</span>
      <div class="timer-unit">
        <span class="timer-value" data-unit="seconds">00</span>
        <span class="timer-label">Sec</span>
      </div>
    </div>`;
  }

  function startTimer(target, endDate, onExpire) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const id = el.id || `timer-${Date.now()}`;
    if (!el.id) el.id = id;
    stopTimer(id);

    function tick() {
      const rem = getTimeRemaining(endDate);
      if (!rem) {
        stopTimer(id);
        el.style.display = 'none';
        if (typeof onExpire === 'function') onExpire();
        return;
      }

      // Hide days row when 0 days left
      const daysEl   = el.querySelector('[data-unit="days"]');
      const daysUnit = daysEl?.closest('.timer-unit');
      if (daysUnit) {
        const show = rem.days > 0;
        daysUnit.style.display = show ? '' : 'none';
        const colon = daysUnit.nextElementSibling;
        if (colon?.classList.contains('timer-colon')) colon.style.display = show ? '' : 'none';
      }

      const units = { days: rem.days, hours: rem.hours, minutes: rem.minutes, seconds: rem.seconds };
      for (const [unit, val] of Object.entries(units)) {
        const span = el.querySelector(`[data-unit="${unit}"]`);
        if (!span) continue;
        const newVal = pad(val);
        if (span.textContent !== newVal) {
          span.textContent = newVal;
          span.classList.remove('flip');
          void span.offsetWidth;
          span.classList.add('flip');
        }
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    _activeTimers.set(id, interval);
    return interval;
  }

  function stopTimer(id) {
    if (_activeTimers.has(id)) {
      clearInterval(_activeTimers.get(id));
      _activeTimers.delete(id);
    }
  }

  function stopAllTimers() {
    _activeTimers.forEach(id => clearInterval(id));
    _activeTimers.clear();
  }

  /* ══════════════════════════════════════════════════════════
     FLASH SALE HELPERS
  ══════════════════════════════════════════════════════════ */

  function getFlashSaleProducts(products) {
    return products
      .filter(p => calculatePrice(p).isFlashSale)
      .sort((a, b) => calculatePrice(b).discountPercent - calculatePrice(a).discountPercent);
  }

  function getNextFlashSaleEnd(products) {
    const now = Date.now();
    let soonest = null;
    for (const p of products) {
      if (!p.discount_end) continue;
      const end = parseDate(p.discount_end);
      if (!end || end <= now) continue;
      if (!soonest || end < soonest) soonest = end;
    }
    return soonest;
  }

  function getNextFlashSaleStart(products) {
    const now = Date.now();
    let soonest = null;
    for (const p of products) {
      if (!p.discount_start || !p.discount_percent) continue;
      const start = parseDate(p.discount_start);
      if (!start || start <= now) continue;
      if (!soonest || start < soonest) soonest = start;
    }
    return soonest;
  }

  /* ══════════════════════════════════════════════════════════
     PROMO CODE
  ══════════════════════════════════════════════════════════ */

  const _promoCodes = new Map([
    // ['LUMIERE10', { type: 'percent', value: 10, minOrder: 50000 }],
  ]);

  function applyPromoCode(code, subtotal) {
    const promo = _promoCodes.get((code || '').toUpperCase().trim());
    if (!promo) {
      return { valid: false, discount: 0, message: 'Invalid promo code.', messageMM: 'Promo code မမှန်ကန်ပါ။' };
    }
    if (subtotal < (promo.minOrder || 0)) {
      return {
        valid: false, discount: 0,
        message: `Minimum order ${formatPrice(promo.minOrder)} required.`,
        messageMM: `အနည်းဆုံး ${formatPrice(promo.minOrder)} မှာယူမှ ရနိုင်သည်။`,
      };
    }
    const discount = promo.type === 'percent'
      ? Math.round(subtotal * (promo.value / 100))
      : promo.value;
    return {
      valid: true, discount,
      discountFormatted: formatPrice(discount),
      message: `Code applied! You save ${formatPrice(discount)}.`,
      messageMM: `Code အသုံးပြုပြီး ${formatPrice(discount)} သက်သာသည်။`,
    };
  }

  /* ══════════════════════════════════════════════════════════
     ORDER TOTAL
  ══════════════════════════════════════════════════════════ */

  function calculateOrderTotal(cartItems, config, promoCode = '') {
    const shipping      = config?.shipping?.fee ?? 3000;
    const freeThreshold = config?.shipping?.free_shipping_threshold ?? 100000;

    let subtotal = 0;
    const lines = cartItems.map(({ product, quantity }) => {
      const price = calculatePrice(product);
      const lineTotal = price.final * quantity;
      subtotal += lineTotal;
      return {
        product, quantity,
        unitPrice: price.final,
        lineTotal,
        priceInfo: price,
        unitFormatted:  price.finalFormatted,
        totalFormatted: formatPrice(lineTotal),
      };
    });

    const promoResult   = promoCode ? applyPromoCode(promoCode, subtotal) : { valid: false, discount: 0 };
    const promoDiscount = promoResult.valid ? promoResult.discount : 0;
    const afterPromo    = subtotal - promoDiscount;
    const shippingFee   = afterPromo >= freeThreshold ? 0 : shipping;
    const total         = afterPromo + shippingFee;

    return {
      lines, subtotal,
      subtotalFormatted:      formatPrice(subtotal),
      promoCode:              promoCode.toUpperCase(),
      promoDiscount,
      promoDiscountFormatted: formatPrice(promoDiscount),
      promoValid:             promoResult.valid,
      promoMessage:           promoResult.message,
      promoMessageMM:         promoResult.messageMM,
      shippingFee,
      shippingFormatted:      shippingFee === 0 ? 'FREE 🎉' : formatPrice(shippingFee),
      freeShippingMet:        afterPromo >= freeThreshold,
      freeShippingRemaining:  Math.max(0, freeThreshold - afterPromo),
      total,
      totalFormatted:         formatPrice(total),
    };
  }

  /* ══════════════════════════════════════════════════════════
     TELEGRAM ORDER URL
  ══════════════════════════════════════════════════════════ */

  function buildTelegramOrderURL(orderData, totals, config) {
    const { name, phone, address, township, note, paymentMethod } = orderData;
    const username = config?.contact?.telegram_username || 'your_telegram';
    const sep = '─'.repeat(28);

    let msg = `💎 ORDER REQUEST — ${config?.store_name || 'LUMIÈRE'}\n`;
    msg += `${sep}\n\n`;
    msg += `👤 CUSTOMER\n`;
    msg += `Name    : ${name}\n`;
    msg += `Phone   : ${phone}\n`;
    msg += `Address : ${address}${township ? ', ' + township : ''}\n\n`;
    msg += `🛍️ ITEMS\n${sep}\n`;

    for (const line of totals.lines) {
      const p = line.product;
      msg += `▸ ${p.name_en || p.name_mm}\n`;
      msg += `  SKU: ${p.product_code || p.id}\n`;
      msg += `  ${line.quantity} × ${line.unitFormatted} = ${line.totalFormatted}\n`;
      if (p.size) msg += `  Size: ${p.size}\n`;
      msg += `\n`;
    }

    msg += `${sep}\n`;
    msg += `Subtotal : ${totals.subtotalFormatted}\n`;
    if (totals.promoValid) msg += `Promo    : -${totals.promoDiscountFormatted} (${totals.promoCode})\n`;
    msg += `Shipping : ${totals.shippingFormatted}\n`;
    msg += `${'━'.repeat(20)}\n`;
    msg += `TOTAL    : ${totals.totalFormatted}\n\n`;
    msg += `💳 PAYMENT: ${paymentMethod || 'Cash on Delivery'}\n`;
    if (note) msg += `📝 NOTE: ${note}\n`;
    msg += `\n${sep}\n`;
    msg += `Sent from ${config?.store_name || 'LUMIÈRE'} Website ✨`;

    return `https://t.me/${username}?text=${encodeURIComponent(msg)}`;
  }

  /* ══════════════════════════════════════════════════════════
     STARS
  ══════════════════════════════════════════════════════════ */

  function buildStarsHTML(rating, showNumber = true) {
    const r    = parseFloat(rating) || 0;
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    const stars =
      '<span style="color:var(--rose-gold)">★</span>'.repeat(full) +
      (half ? '<span style="color:var(--rose-gold)">½</span>' : '') +
      '<span style="color:var(--border)">★</span>'.repeat(empty);

    return `<div class="product-rating">
      <span class="stars">${stars}</span>
      ${showNumber ? `<span class="rating-count">${r.toFixed(1)}</span>` : ''}
    </div>`;
  }

  /* ── Public API ──────────────────────────────────────────── */
  return {
    init,
    formatPrice,
    formatPriceCompact,
    calculatePrice,
    getDiscountStatus,
    getStockStatus,
    buildCardPriceHTML,
    buildDetailPriceHTML,
    buildBadgeHTML,
    buildStockHTML,
    buildStarsHTML,
    buildTimerHTML,
    startTimer,
    stopTimer,
    stopAllTimers,
    getFlashSaleProducts,
    getNextFlashSaleEnd,
    getNextFlashSaleStart,
    applyPromoCode,
    calculateOrderTotal,
    buildTelegramOrderURL,
    parseDate,
  };

})();

window.DiscountSystem = DiscountSystem;

