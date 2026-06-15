/* ============================================================
   LUMIÈRE LUXURY SKINCARE — MASTER APP
   app.js  ·  Boots everything, orchestrates all systems
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   APP UTILS  (toast, confetti, scroll reveal, counters…)
   Exposed as window.AppUtils before systems boot
══════════════════════════════════════════════════════════ */

const AppUtils = (() => {

  /* ── Toast ─────────────────────────────────────────────── */
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `
      <span style="font-size:1rem;flex-shrink:0;">${icons[type] || 'ℹ'}</span>
      <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  /* ── Confetti ───────────────────────────────────────────── */
  function launchConfetti(count = 80) {
    const colors = ['#D4AF37','#F8D7E6','#EDADC9','#A3002A','#FFF5EE','#FFD700','#C97BA0'];
    const body   = document.body;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      Object.assign(el.style, {
        left:            `${Math.random() * 100}vw`,
        background:      colors[Math.floor(Math.random() * colors.length)],
        width:           `${6 + Math.random() * 8}px`,
        height:          `${6 + Math.random() * 8}px`,
        animationDuration:`${2.5 + Math.random() * 2.5}s`,
        animationDelay:  `${Math.random() * 0.8}s`,
        '--drift':       `${(Math.random() - 0.5) * 200}px`,
      });
      body.appendChild(el);
      setTimeout(() => el.remove(), 5500);
    }
  }

  /* ── Scroll Reveal ──────────────────────────────────────── */
  let _revealObserver = null;

  function initScrollReveal() {
    const els = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger'
    );
    if (!els.length) return;

    if (!_revealObserver) {
      _revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('revealed');
          _revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }

    els.forEach(el => {
      if (!el.classList.contains('revealed')) _revealObserver.observe(el);
    });
  }

  /* ── Animated Counters ──────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el      = entry.target;
        const target  = parseFloat(el.dataset.counter) || 0;
        const suffix  = el.dataset.counterSuffix || '';
        const prefix  = el.dataset.counterPrefix || '';
        const decimal = el.dataset.counterDecimal ? parseInt(el.dataset.counterDecimal) : 0;
        const dur     = parseInt(el.dataset.counterDuration) || 1800;
        const start   = performance.now();

        function step(now) {
          const progress = Math.min((now - start) / dur, 1);
          const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const value    = target * ease;
          el.textContent = prefix + (decimal ? value.toFixed(decimal) : Math.floor(value).toLocaleString()) + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = prefix + (decimal ? target.toFixed(decimal) : target.toLocaleString()) + suffix;
        }

        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => obs.observe(el));
  }

  /* ── Custom Cursor ──────────────────────────────────────── */
  function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;

    const dot  = document.createElement('div');
    const ring = document.createElement('div');
    dot.className  = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = -100, my = -100, rx = -100, ry = -100;
    const speed = 0.14;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    document.addEventListener('mouseover', e => {
      const hover = e.target.closest('a, button, [role="button"], .product-card, input, select, textarea, label, [data-tooltip]');
      ring.classList.toggle('hover', !!hover);
    });

    document.addEventListener('mousedown', () => { dot.style.transform  = 'translate(-50%,-50%) scale(0.7)'; });
    document.addEventListener('mouseup',   () => { dot.style.transform  = 'translate(-50%,-50%) scale(1)'; });

    document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = '1'; });

    function animate() {
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
      rx += (mx - rx) * speed;
      ry += (my - ry) * speed;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ── Reading Progress Bar ───────────────────────────────── */
  function initProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'page-progress';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct   = total > 0 ? window.scrollY / total : 0;
      bar.style.transform = `scaleX(${pct})`;
    }, { passive: true });
  }

  /* ── Parallax ───────────────────────────────────────────── */
  function initParallax() {
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      els.forEach(el => {
        const speed  = parseFloat(el.dataset.parallax) || 0.3;
        const rect   = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        el.style.transform = `translateY(${center * speed}px)`;
      });
    }, { passive: true });
  }

  /* ── FAQ Accordion ──────────────────────────────────────── */
  function initFAQ() {
    document.addEventListener('click', e => {
      const question = e.target.closest('.faq-question');
      if (!question) return;
      const item = question.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      // Open clicked (unless it was already open)
      if (!isOpen) item.classList.add('open');
    });
  }

  /* ── Marquee pause on hover ─────────────────────────────── */
  function initMarquee() {
    document.querySelectorAll('.marquee-track').forEach(track => {
      track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
      track.addEventListener('mouseleave', () => track.style.animationPlayState = '');
    });
  }

  /* ── Back to Top ────────────────────────────────────────── */
  function initBackToTop() {
    const btn = document.querySelector('.floating-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Navbar Scroll Behaviour ────────────────────────────── */
  function initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);
      // Hide on scroll down, show on scroll up (mobile)
      if (window.innerWidth < 768) {
        if (y > lastY + 8 && y > 120) nav.style.transform = 'translateY(-100%)';
        else if (y < lastY - 4)       nav.style.transform = '';
      }
      lastY = y;
    }, { passive: true });
  }

  /* ── Mobile Nav ─────────────────────────────────────────── */
  function initMobileNav() {
    const hamburger = document.querySelector('.nav-hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Tab Switcher ───────────────────────────────────────── */
  function initTabs() {
    document.addEventListener('click', e => {
      const tab = e.target.closest('.tab-btn');
      if (!tab) return;
      const group = tab.closest('[data-tabs]');
      if (!group) return;

      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      if (!target) return;
      group.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = p.dataset.panel === target ? '' : 'none';
      });
    });
  }

  /* ── Image Lazy Load fallback ───────────────────────────── */
  function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype) return; // native support
    const imgs = document.querySelectorAll('img[loading="lazy"]');
    const obs  = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) img.src = img.dataset.src;
          obs.unobserve(img);
        }
      });
    });
    imgs.forEach(img => obs.observe(img));
  }

  /* ── Ripple on Buttons ──────────────────────────────────── */
  function initRipple() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn');
      if (!btn || btn.disabled) return;
      const rect   = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      const size = Math.max(rect.width, rect.height);
      Object.assign(ripple.style, {
        width:  size + 'px',
        height: size + 'px',
        left:   (e.clientX - rect.left - size / 2) + 'px',
        top:    (e.clientY - rect.top  - size / 2) + 'px',
      });
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  }

  /* ── Copy to Clipboard ──────────────────────────────────── */
  function copyToClipboard(text, successMsg = '✓ Copied!') {
    navigator.clipboard?.writeText(text)
      .then(() => showToast(successMsg, 'success'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(successMsg, 'success');
      });
  }

  /* ── Share Product ──────────────────────────────────────── */
  function shareURL(title, url) {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      copyToClipboard(url, '🔗 Link copied!');
    }
  }

  return {
    showToast,
    launchConfetti,
    initScrollReveal,
    initCounters,
    initCursor,
    initProgressBar,
    initParallax,
    initFAQ,
    initMarquee,
    initBackToTop,
    initNavbar,
    initMobileNav,
    initTabs,
    initLazyImages,
    initRipple,
    copyToClipboard,
    shareURL,
  };
})();

window.AppUtils = AppUtils;

/* ══════════════════════════════════════════════════════════
   DARK MODE
══════════════════════════════════════════════════════════ */

const ThemeSystem = (() => {
  const KEY = 'lumiere_theme';

  function get()   { return localStorage.getItem(KEY) || 'light'; }
  function isDark(){ return get() === 'dark'; }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    // Update toggle icon
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      el.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
  }

  function toggle() { apply(isDark() ? 'light' : 'dark'); }

  function init() {
    // Apply immediately (before paint) — also done inline in <head>
    apply(get());
    document.addEventListener('click', e => {
      if (e.target.closest('[data-toggle-theme]')) toggle();
    });
  }

  return { init, toggle, get, isDark, apply };
})();

window.ThemeSystem = ThemeSystem;

/* ══════════════════════════════════════════════════════════
   PWA
══════════════════════════════════════════════════════════ */

const PWASystem = (() => {
  let _deferredPrompt = null;

  function init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[PWA] SW registered:', reg.scope))
          .catch(err => console.warn('[PWA] SW failed:', err));
      });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _deferredPrompt = e;
      _showInstallBanner();
    });

    // Hide banner after install
    window.addEventListener('appinstalled', () => {
      _hideBanner();
      AppUtils.showToast('✅ App installed successfully!', 'success');
    });

    // Online/offline
    window.addEventListener('offline', () => {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.add('show');
    });
    window.addEventListener('online', () => {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.remove('show');
    });
  }

  function _showInstallBanner() {
    let banner = document.getElementById('pwa-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwa-banner';
      banner.className = 'pwa-banner';
      banner.innerHTML = `
        <div class="pwa-icon">💎</div>
        <div class="pwa-info">
          <div class="pwa-title">Install LUMIÈRE App</div>
          <div class="pwa-desc">Faster access · Works offline · No app store needed</div>
        </div>
        <div style="display:flex;gap:var(--space-2);flex-shrink:0;">
          <button class="btn btn-primary btn-sm" id="pwa-install-btn">Install</button>
          <button class="btn btn-ghost btn-sm" id="pwa-dismiss-btn">✕</button>
        </div>`;
      document.body.appendChild(banner);

      document.getElementById('pwa-install-btn')?.addEventListener('click', install);
      document.getElementById('pwa-dismiss-btn')?.addEventListener('click', _hideBanner);
    }
    setTimeout(() => banner.classList.add('show'), 3000);
  }

  function _hideBanner() {
    document.getElementById('pwa-banner')?.classList.remove('show');
  }

  async function install() {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') _hideBanner();
    _deferredPrompt = null;
  }

  return { init, install };
})();

window.PWASystem = PWASystem;

/* ══════════════════════════════════════════════════════════
   HERO SLIDESHOW
══════════════════════════════════════════════════════════ */

const HeroSystem = (() => {
  let _current  = 0;
  let _total    = 0;
  let _interval = null;
  const DELAY   = 5000;

  function init() {
    const slides = document.querySelectorAll('.hero-slide');
    _total = slides.length;
    if (_total < 2) return;

    _buildDots();
    _start();

    document.querySelector('.hero-prev')?.addEventListener('click', prev);
    document.querySelector('.hero-next')?.addEventListener('click', next);

    // Pause on hover
    const hero = document.querySelector('.hero');
    hero?.addEventListener('mouseenter', _stop);
    hero?.addEventListener('mouseleave', _start);

    // Touch swipe
    let startX = 0;
    hero?.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    hero?.addEventListener('touchend',   e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    });
  }

  function _buildDots() {
    const container = document.querySelector('.hero-dots');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < _total; i++) {
      const dot = document.createElement('button');
      dot.className = `hero-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      container.appendChild(dot);
    }
  }

  function goTo(idx) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    slides[_current]?.classList.remove('active');
    dots[_current]?.classList.remove('active');
    _current = (idx + _total) % _total;
    slides[_current]?.classList.add('active');
    dots[_current]?.classList.add('active');
  }

  function next() { _stop(); goTo(_current + 1); _start(); }
  function prev() { _stop(); goTo(_current - 1); _start(); }

  function _start() {
    _stop();
    _interval = setInterval(() => goTo(_current + 1), DELAY);
  }
  function _stop() { clearInterval(_interval); }

  return { init, next, prev, goTo };
})();

window.HeroSystem = HeroSystem;

/* ══════════════════════════════════════════════════════════
   FLOATING PARTICLES (Canvas)
══════════════════════════════════════════════════════════ */

function initParticleCanvas(canvasId = 'particles-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const particles = [];
  const COLORS = ['rgba(212,175,55,', 'rgba(248,215,230,', 'rgba(255,255,255,'];

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function spawn() {
    return {
      x:    Math.random() * canvas.width,
      y:    canvas.height + 10,
      r:    Math.random() * 3 + 1,
      speed:Math.random() * 0.6 + 0.2,
      drift:Math.random() * 0.4 - 0.2,
      alpha:Math.random() * 0.6 + 0.2,
      color:COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  while (particles.length < 25) particles.push({ ...spawn(), y: Math.random() * canvas.height });

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y    -= p.speed;
      p.x    += p.drift;
      p.alpha = Math.max(0, p.alpha - 0.001);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();

      if (p.y < -10 || p.alpha <= 0) particles[i] = spawn();
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  frame();
}

/* ══════════════════════════════════════════════════════════
   HOME PAGE RENDERER
══════════════════════════════════════════════════════════ */

async function renderHomePage(config) {
  // Show skeletons immediately
  ProductsSystem.showSkeletons('#featured-grid',    8);
  ProductsSystem.showSkeletons('#flash-sale-grid',  4);
  ProductsSystem.showSkeletons('#new-arrivals-grid',4);

  await ProductsSystem.load();

  // Featured / tabbed section
  const renderTab = (type) => {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    const map = {
      featured:    ProductsSystem.getFeatured(8),
      bestsellers: ProductsSystem.getBestSellers(8),
      new:         ProductsSystem.getNewArrivals(8),
    };
    ProductsSystem.renderProducts(grid, map[type] || map.featured);
  };
  renderTab('featured');

  // Wire tab buttons
  document.querySelectorAll('[data-tab-featured]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab-featured]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tabFeatured);
    });
  });

  // Flash Sale
  const flashGrid = document.getElementById('flash-sale-grid');
  const flashSale = ProductsSystem.getOnSale(4);
  if (flashSale.length && flashGrid) {
    ProductsSystem.renderProducts(flashGrid, flashSale);
    const flashEnd = DiscountSystem.getNextFlashSaleEnd(ProductsSystem.getAll());
    if (flashEnd) {
      let timerEl = document.getElementById('main-flash-timer');
      if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'main-flash-timer';
        timerEl.innerHTML = DiscountSystem.buildTimerHTML('main-flash-timer-inner');
        document.getElementById('flash-timer-mount')?.appendChild(timerEl);
        timerEl = document.getElementById('main-flash-timer-inner');
      }
      if (timerEl) DiscountSystem.startTimer(timerEl, flashEnd.toISOString(), () => {
        document.getElementById('flash-sale-section')?.remove();
      });
    }
  } else {
    document.getElementById('flash-sale-section')?.remove();
  }

  // New Arrivals
  const newGrid = document.getElementById('new-arrivals-grid');
  if (newGrid) {
    const newProducts = ProductsSystem.getNewArrivals(6);
    if (newProducts.length > 0) {
      newProducts[0]._heroCard = true; // first card gets large treatment
      ProductsSystem.renderProducts(newGrid, newProducts);
      // Make first card span 2 rows
      const firstCard = newGrid.querySelector('.product-card');
      if (firstCard) firstCard.style.gridRow = 'span 2';
    }
  }

  // Animated counters
  AppUtils.initCounters();
  AppUtils.initScrollReveal();

  // Recently Viewed
  const rvSection = document.getElementById('recently-viewed-products');
  if (rvSection) WishlistSystem.renderRecentlyViewed(rvSection);
}

/* ══════════════════════════════════════════════════════════
   MAIN BOOT
══════════════════════════════════════════════════════════ */

async function bootApp() {

  /* ── 0. Apply theme before paint ────────────────────────── */
  ThemeSystem.init();

  /* ── 1. Load config ─────────────────────────────────────── */
  let config = {};
  try {
    const res = await fetch('/data/config.json');
    if (res.ok) config = await res.json();
  } catch (e) {
    console.warn('[App] config.json not found, using defaults.');
  }

  /* ── 2. Hide loading screen ─────────────────────────────── */
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    setTimeout(() => loadingScreen.classList.add('hidden'), 1200);
    setTimeout(() => loadingScreen.remove(), 1900);
  }

  /* ── 3. Boot subsystems ─────────────────────────────────── */
  DiscountSystem.init(config);
  CartSystem.init(config);
  WishlistSystem.init(config);
  SearchSystem.init(config);
  await ProductsSystem.init(config);

  /* ── 4. UI Utils ────────────────────────────────────────── */
  AppUtils.initCursor();
  AppUtils.initNavbar();
  AppUtils.initMobileNav();
  AppUtils.initProgressBar();
  AppUtils.initParallax();
  AppUtils.initFAQ();
  AppUtils.initMarquee();
  AppUtils.initBackToTop();
  AppUtils.initTabs();
  AppUtils.initRipple();
  AppUtils.initLazyImages();
  AppUtils.initScrollReveal();
  AppUtils.initCounters();

  /* ── 5. Offline banner ──────────────────────────────────── */
  const offlineBanner = document.createElement('div');
  offlineBanner.id        = 'offline-banner';
  offlineBanner.className = 'offline-banner';
  offlineBanner.textContent = '📶 You\'re offline · ကွန်ရက် မရှိပါ · Some features may be unavailable.';
  document.body.appendChild(offlineBanner);

  /* ── 6. Page-specific logic ─────────────────────────────── */
  const page = _detectPage();

  switch (page) {
    case 'home':
      HeroSystem.init();
      initParticleCanvas('particles-canvas');
      await renderHomePage(config);
      break;

    case 'product':
      await _initProductPage(config);
      break;

    case 'category':
      await _initCategoryPage(config);
      break;

    case 'search':
      // Search page binds itself in SearchSystem.init()
      break;

    case 'wishlist':
      WishlistSystem.initWishlistPage(ProductsSystem.getAll());
      break;

    case 'checkout':
      _initCheckoutPage(config);
      break;
  }

  /* ── 7. PWA ─────────────────────────────────────────────── */
  if (config?.features?.pwa !== false) PWASystem.init();

  /* ── 8. Page transition ─────────────────────────────────── */
  _bindPageTransitions();

  /* ── 9. View count live ticker ──────────────────────────── */
  _initViewCountTicker();

  console.log('[LUMIÈRE] ✨ App booted successfully');
}

/* ══════════════════════════════════════════════════════════
   PAGE DETECTION
══════════════════════════════════════════════════════════ */

function _detectPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('product.html'))   return 'product';
  if (path.endsWith('category.html'))  return 'category';
  if (path.endsWith('search.html'))    return 'search';
  if (path.endsWith('wishlist.html'))  return 'wishlist';
  if (path.endsWith('checkout.html'))  return 'checkout';
  if (path.endsWith('contact.html'))   return 'contact';
  return 'home';
}

/* ══════════════════════════════════════════════════════════
   PRODUCT PAGE INIT
══════════════════════════════════════════════════════════ */

async function _initProductPage(config) {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id') || params.get('sku') || '';
  if (!id) { window.location.href = 'index.html'; return; }

  const product = ProductsSystem.getById(id);
  if (!product) {
    document.getElementById('product-page-content')?.insertAdjacentHTML('afterbegin', `
      <div class="empty-state" style="padding-top:var(--space-20);">
        <span class="empty-icon">😔</span>
        <h2 class="empty-title">Product Not Found</h2>
        <p class="empty-desc">SKU: ${id} — ကုန်ပစ္စည်း မတွေ့ပါ</p>
        <a href="index.html" class="btn btn-primary">Back to Shop</a>
      </div>`);
    return;
  }

  // Track
  ProductsSystem.incrementView(product.product_code);
  WishlistSystem.trackView(product);

  // SEO
  document.title = `${product.name_en || product.name_mm} · ${product.brand} — LUMIÈRE`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.short_description_mm);

  // Render gallery
  _renderProductGallery(product);

  // Render details
  _renderProductDetails(product, config);

  // Related products
  const relatedGrid = document.getElementById('related-products-grid');
  if (relatedGrid) {
    const related = ProductsSystem.getRelated(product, 6);
    ProductsSystem.renderProducts(relatedGrid, related);
  }

  // Recently viewed
  const rvEl = document.getElementById('recently-viewed-products');
  if (rvEl) WishlistSystem.renderRecentlyViewed(rvEl, product.product_code);

  // View count
  const viewEl = document.getElementById('product-view-count');
  if (viewEl) {
    viewEl.textContent = ProductsSystem.getViewCount(product.product_code).toLocaleString();
    setInterval(() => {
      const v = Math.floor(Math.random() * 3);
      if (v > 0) {
        viewEl.textContent = (parseInt(viewEl.textContent.replace(/,/g,'')) + v).toLocaleString();
        viewEl.classList.remove('view-count-update');
        void viewEl.offsetWidth;
        viewEl.classList.add('view-count-update');
      }
    }, 18000);
  }

  // Product tab switching
  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.product-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.product-tab-content').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab)?.classList.add('active');
    });
  });

  // Gallery controls
  _bindGalleryControls(product);

  AppUtils.initScrollReveal();
}

function _renderProductGallery(product) {
  const images = product._images.length ? product._images : ['assets/images/placeholder.jpg'];
  const mainImg  = document.getElementById('gallery-main-img');
  const thumbList = document.getElementById('gallery-thumbs');

  if (mainImg) mainImg.src = images[0];

  if (thumbList) {
    thumbList.innerHTML = images.map((src, i) => `
      <div class="gallery-thumb ${i === 0 ? 'active' : ''}"
        data-gallery-idx="${i}"
        onclick="AppUtils._galleryGoTo(${i})">
        <img src="${src}" alt="Image ${i+1}" loading="lazy"
          onerror="this.src='assets/images/placeholder.jpg'" />
      </div>`).join('');
  }

  // Video
  if (product.video_url) {
    const videoWrap = document.getElementById('product-video-wrap');
    if (videoWrap) {
      videoWrap.innerHTML = `
        <video src="${product.video_url}" autoplay muted loop playsinline
          style="width:100%;border-radius:var(--radius-xl);"></video>`;
    }
  }
}

AppUtils._galleryImages = [];
AppUtils._galleryIdx    = 0;

AppUtils._galleryGoTo = function(idx) {
  const images  = AppUtils._galleryImages;
  AppUtils._galleryIdx = (idx + images.length) % images.length;
  const mainImg = document.getElementById('gallery-main-img');
  if (mainImg) mainImg.src = images[AppUtils._galleryIdx];
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === AppUtils._galleryIdx);
  });
};

function _bindGalleryControls(product) {
  AppUtils._galleryImages = product._images.length ? product._images : ['assets/images/placeholder.jpg'];

  document.getElementById('gallery-prev-btn')?.addEventListener('click', () =>
    AppUtils._galleryGoTo(AppUtils._galleryIdx - 1));
  document.getElementById('gallery-next-btn')?.addEventListener('click', () =>
    AppUtils._galleryGoTo(AppUtils._galleryIdx + 1));

  // Fullscreen
  const fsBtn   = document.getElementById('gallery-fullscreen-btn');
  const fsModal = document.getElementById('gallery-fullscreen-modal');
  const fsImg   = document.getElementById('gallery-fullscreen-img');
  const fsClose = document.getElementById('gallery-fullscreen-close');

  fsBtn?.addEventListener('click', () => {
    if (fsImg) fsImg.src = AppUtils._galleryImages[AppUtils._galleryIdx];
    fsModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  fsClose?.addEventListener('click', () => {
    fsModal?.classList.remove('open');
    document.body.style.overflow = '';
  });

  fsModal?.addEventListener('click', e => {
    if (e.target === fsModal) {
      fsModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Swipe on gallery
  let startX = 0;
  const mainDiv = document.querySelector('.gallery-main');
  mainDiv?.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  mainDiv?.addEventListener('touchend',   e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0
      ? AppUtils._galleryGoTo(AppUtils._galleryIdx + 1)
      : AppUtils._galleryGoTo(AppUtils._galleryIdx - 1);
  });
}

function _renderProductDetails(product, config) {
  const priceInfo   = DiscountSystem.calculatePrice(product);
  const stockStatus = DiscountSystem.getStockStatus(product.stock_quantity, config);

  // Brand, SKU
  _setText('product-detail-brand',   product.brand);
  _setText('product-detail-sku',     product.product_code || product.id);
  _setText('product-detail-name',    product.name_en || product.name_mm);
  _setText('product-detail-name-mm', product.name_mm);
  _setText('product-detail-desc',    product.short_description_mm || product.full_description_mm);

  // Price
  const priceEl = document.getElementById('product-detail-price');
  if (priceEl) priceEl.innerHTML = DiscountSystem.buildDetailPriceHTML(priceInfo);

  // Stars
  const starsEl = document.getElementById('product-detail-stars');
  if (starsEl) starsEl.innerHTML = DiscountSystem.buildStarsHTML(product.rating);

  // Stock
  const stockEl = document.getElementById('product-detail-stock');
  if (stockEl) stockEl.innerHTML = DiscountSystem.buildStockHTML(product.stock_quantity, config);

  // Skin type tags
  const skinEl = document.getElementById('product-skin-tags');
  if (skinEl && product.skin_type) {
    skinEl.innerHTML = product.skin_type.split(',').map(s =>
      `<span class="skin-tag">${s.trim()}</span>`).join('');
  }

  // Meta chips
  _setText('product-size',   product.size);
  _setText('product-origin', product.country_of_origin);

  // Tabs
  _setText('tab-ingredients-content', product.ingredients);
  _setText('tab-benefits-content',    product.benefits);
  if (product.usage) {
    const usageEl = document.getElementById('tab-usage-content');
    if (usageEl) {
      const steps = product.usage.split(/[\n,;]+/).filter(Boolean);
      usageEl.innerHTML = steps.map((step, i) => `
        <div class="usage-step">
          <span class="usage-step-num">${i + 1}</span>
          <span class="usage-step-text">${step.trim()}</span>
        </div>`).join('');
    }
  }

  // Wishlist heart
  const heartBtns = document.querySelectorAll('[data-wishlist-toggle]');
  heartBtns.forEach(btn => {
    if (!btn.dataset.wishlistToggle) btn.dataset.wishlistToggle = product.product_code || product.id;
  });
  WishlistSystem.refreshHearts();

  // Add to cart
  let qty = 1;
  const qtyVal  = document.getElementById('product-qty-value');
  const qtyDec  = document.getElementById('product-qty-dec');
  const qtyInc  = document.getElementById('product-qty-inc');
  const atcBtn  = document.getElementById('product-atc-btn');
  const orderBtn = document.getElementById('product-order-btn');

  if (qtyVal) qtyVal.textContent = qty;
  qtyDec?.addEventListener('click', () => { if (qty > 1) { qty--; if (qtyVal) qtyVal.textContent = qty; } });
  qtyInc?.addEventListener('click', () => {
    const max = parseInt(product.stock_quantity) || 99;
    if (qty < max) { qty++; if (qtyVal) qtyVal.textContent = qty; }
  });

  atcBtn?.addEventListener('click', () => {
    if (stockStatus === 'out') return;
    CartSystem.addToCart(product, qty);
    AppUtils.showToast(`🛒 Added ${qty}× to cart`, 'success');
    setTimeout(() => CartSystem.openDrawer(), 400);
  });

  orderBtn?.addEventListener('click', () => {
    const totals = DiscountSystem.calculateOrderTotal(
      [{ product, quantity: qty }], config
    );
    const name    = prompt('Your Name\nနာမည်') || '';
    const phone   = prompt('Phone\nဖုန်းနံပါတ်') || '';
    const address = prompt('Address\nလိပ်စာ') || '';
    const url = DiscountSystem.buildTelegramOrderURL({ name, phone, address }, totals, config);
    window.open(url, '_blank');
    if (config?.features?.confetti_on_order) AppUtils.launchConfetti();
  });

  // Share button
  document.getElementById('product-share-btn')?.addEventListener('click', () => {
    AppUtils.shareURL(product.name_en || product.name_mm, window.location.href);
  });

  // Copy SKU
  document.getElementById('product-copy-sku')?.addEventListener('click', () => {
    AppUtils.copyToClipboard(product.product_code, '✓ SKU copied!');
  });
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

/* ══════════════════════════════════════════════════════════
   CATEGORY PAGE INIT
══════════════════════════════════════════════════════════ */

async function _initCategoryPage(config) {
  const params   = new URLSearchParams(window.location.search);
  const category = params.get('cat')  || '';
  const brand    = params.get('brand')|| '';

  const filterState = {
    brands:     [],
    categories: category ? [category] : [],
    skinTypes:  [],
    priceMin:   undefined,
    priceMax:   undefined,
    onSaleOnly: false,
    inStockOnly:false,
    sortBy:     'popular',
  };

  function applyFilters() {
    const grid    = document.getElementById('products-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;
    ProductsSystem.showSkeletons(grid, 8);
    setTimeout(() => {
      const results = ProductsSystem.filter(filterState);
      if (countEl) countEl.textContent = results.length;
      ProductsSystem.renderProducts(grid, results);
    }, 100);
  }

  applyFilters();

  // Filter checkboxes
  document.addEventListener('change', e => {
    const checkbox = e.target.closest('[data-filter-brand]');
    if (checkbox) {
      const val = checkbox.dataset.filterBrand;
      checkbox.closest('.filter-option')?.classList.toggle('checked', checkbox.checked);
      if (checkbox.checked) filterState.brands.push(val);
      else filterState.brands = filterState.brands.filter(b => b !== val);
      applyFilters();
    }
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', e => {
    filterState.sortBy = e.target.value;
    applyFilters();
  });

  // Mobile filter toggle
  document.getElementById('filter-mobile-btn')?.addEventListener('click', () => {
    document.querySelector('.filter-sidebar')?.classList.toggle('open');
  });
  document.getElementById('filter-close-btn')?.addEventListener('click', () => {
    document.querySelector('.filter-sidebar')?.classList.remove('open');
  });

  // Build filter sidebar
  _buildFilterSidebar(filterState, applyFilters);
}

function _buildFilterSidebar(filterState, applyFilters) {
  const brands   = ProductsSystem.getBrands();
  const cats     = ProductsSystem.getCategories();
  const skinTypes = ProductsSystem.getSkinTypes();
  const priceRange = ProductsSystem.getPriceRange();

  const mountEl = document.getElementById('filter-sidebar-content');
  if (!mountEl) return;

  mountEl.innerHTML = `
    <!-- Brand -->
    <div class="filter-group">
      <div class="filter-group-title">Brand</div>
      <div class="filter-options">
        ${brands.slice(0,12).map(b => `
          <label class="filter-option">
            <span class="filter-checkbox">✓</span>
            <span>${b}</span>
            <span class="filter-count">${ProductsSystem.getByBrand(b).length}</span>
            <input type="checkbox" data-filter-brand="${b}" style="display:none;">
          </label>`).join('')}
      </div>
    </div>

    <!-- Category -->
    <div class="filter-group">
      <div class="filter-group-title">Category</div>
      <div class="filter-options">
        ${cats.map(c => `
          <label class="filter-option ${filterState.categories.includes(c) ? 'checked' : ''}">
            <span class="filter-checkbox">✓</span>
            <span>${c}</span>
            <span class="filter-count">${ProductsSystem.getByCategory(c).length}</span>
            <input type="checkbox" data-filter-cat="${c}"
              ${filterState.categories.includes(c) ? 'checked' : ''} style="display:none;">
          </label>`).join('')}
      </div>
    </div>

    <!-- Skin Type -->
    <div class="filter-group">
      <div class="filter-group-title">Skin Type</div>
      <div class="filter-options">
        ${skinTypes.map(s => `
          <label class="filter-option">
            <span class="filter-checkbox">✓</span>
            <span>${s}</span>
            <input type="checkbox" data-filter-skin="${s}" style="display:none;">
          </label>`).join('')}
      </div>
    </div>

    <!-- In Stock -->
    <div class="filter-group">
      <div class="filter-group-title">Availability</div>
      <div class="filter-options">
        <label class="filter-option">
          <span class="filter-checkbox">✓</span>
          <span>In Stock Only</span>
          <input type="checkbox" id="filter-instock" style="display:none;">
        </label>
        <label class="filter-option">
          <span class="filter-checkbox">✓</span>
          <span>On Sale</span>
          <input type="checkbox" id="filter-onsale" style="display:none;">
        </label>
      </div>
    </div>`;

  // Extra filter listeners
  document.addEventListener('change', e => {
    if (e.target.id === 'filter-instock') {
      filterState.inStockOnly = e.target.checked;
      e.target.closest('.filter-option')?.classList.toggle('checked', e.target.checked);
      applyFilters();
    }
    if (e.target.id === 'filter-onsale') {
      filterState.onSaleOnly = e.target.checked;
      e.target.closest('.filter-option')?.classList.toggle('checked', e.target.checked);
      applyFilters();
    }
    if (e.target.dataset.filterCat) {
      const val = e.target.dataset.filterCat;
      e.target.closest('.filter-option')?.classList.toggle('checked', e.target.checked);
      if (e.target.checked) filterState.categories.push(val);
      else filterState.categories = filterState.categories.filter(c => c !== val);
      applyFilters();
    }
    if (e.target.dataset.filterSkin) {
      const val = e.target.dataset.filterSkin;
      e.target.closest('.filter-option')?.classList.toggle('checked', e.target.checked);
      if (e.target.checked) filterState.skinTypes.push(val);
      else filterState.skinTypes = filterState.skinTypes.filter(s => s !== val);
      applyFilters();
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CHECKOUT PAGE INIT
══════════════════════════════════════════════════════════ */

function _initCheckoutPage(config) {
  CartSystem.refresh();

  // Populate order summary from cart
  const summaryEl = document.getElementById('checkout-order-summary');
  const items     = CartSystem.getItems();
  const totals    = CartSystem.getTotals();

  if (!totals || items.length === 0) {
    AppUtils.showToast('Your cart is empty!', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  if (summaryEl) {
    summaryEl.innerHTML = items.map(({ product, quantity }) => {
      const price = DiscountSystem.calculatePrice(product);
      return `
        <div class="order-item">
          <div style="position:relative;">
            <img src="${product.image1||'assets/images/placeholder.jpg'}" class="order-item-img"
              onerror="this.src='assets/images/placeholder.jpg'" />
            <span class="order-item-qty-badge">${quantity}</span>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:var(--text-sm);">${product.name_en||product.name_mm}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${product.product_code}</div>
          </div>
          <div style="font-weight:700;color:var(--rose-gold);">${price.finalFormatted}</div>
        </div>`;
    }).join('') + `
      <div class="order-summary-row"><span>Subtotal</span><span>${totals.subtotalFormatted}</span></div>
      <div class="order-summary-row"><span>Shipping</span><span>${totals.shippingFormatted}</span></div>
      <div class="order-summary-total"><span>Total</span><span class="order-summary-total-price">${totals.totalFormatted}</span></div>`;
  }

  // Payment option selection
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Submit
  document.getElementById('checkout-submit-btn')?.addEventListener('click', () => {
    const name    = document.getElementById('checkout-name')?.value?.trim();
    const phone   = document.getElementById('checkout-phone')?.value?.trim();
    const address = document.getElementById('checkout-address')?.value?.trim();
    const payment = document.querySelector('.payment-option.selected')?.querySelector('.payment-option-name')?.textContent || 'COD';
    const note    = document.getElementById('checkout-note')?.value?.trim();

    if (!name || !phone || !address) {
      AppUtils.showToast('Please fill all required fields.', 'error');
      return;
    }

    const url = DiscountSystem.buildTelegramOrderURL(
      { name, phone, address, paymentMethod: payment, note },
      totals,
      config
    );

    window.open(url, '_blank');
    CartSystem.clearCart();
    AppUtils.launchConfetti();
    AppUtils.showToast('🎉 Order sent via Telegram! Thank you!', 'success');

    setTimeout(() => {
      document.getElementById('checkout-success')?.classList.add('show');
    }, 600);
  });
}

/* ══════════════════════════════════════════════════════════
   VIEW COUNT LIVE TICKER
══════════════════════════════════════════════════════════ */

function _initViewCountTicker() {
  const el = document.getElementById('live-viewers');
  if (!el) return;
  const base = Math.floor(Math.random() * 20 + 5);
  el.textContent = base;
  setInterval(() => {
    const delta = Math.floor(Math.random() * 3) - 1;
    const val   = Math.max(1, parseInt(el.textContent) + delta);
    el.textContent = val;
  }, 8000);
}

/* ══════════════════════════════════════════════════════════
   PAGE TRANSITIONS
══════════════════════════════════════════════════════════ */

function _bindPageTransitions() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('tel:') || href.startsWith('mailto:') ||
        link.target === '_blank' || e.ctrlKey || e.metaKey) return;

    e.preventDefault();
    let overlay = document.getElementById('page-transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'page-transition-overlay';
      overlay.className = 'page-transition-overlay';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('enter');
    setTimeout(() => { window.location.href = href; }, 450);
  });
}

/* ══════════════════════════════════════════════════════════
   AI SKINCARE QUIZ
══════════════════════════════════════════════════════════ */

const QuizSystem = (() => {
  const questions = [
    {
      q: 'How does your skin feel after washing? မျက်နှာ သစ်ပြီးနောက် ဘယ်လိုခံစားရသလဲ?',
      options: [
        { emoji: '💧', text: 'Tight & dry',     sub: 'ဆွဲတင်းသော',     value: 'dry'        },
        { emoji: '✨', text: 'Normal & balanced', sub: 'ပုံမှန်',        value: 'normal'     },
        { emoji: '💦', text: 'Oily all over',   sub: 'အဆီများသော',     value: 'oily'       },
        { emoji: '🌗', text: 'Oily T-zone only',sub: 'T-zone အဆီများ', value: 'combination'},
      ],
    },
    {
      q: 'What is your main skin concern? အဓိက ဂရုစိုက်ချက် ဘာလဲ?',
      options: [
        { emoji: '🌟', text: 'Brightening',     sub: 'တောက်ပမှု',      value: 'brightening' },
        { emoji: '⏰', text: 'Anti-aging',      sub: 'အသက်ကြီးမှုကာကွယ်', value: 'anti-aging'},
        { emoji: '💧', text: 'Hydration',       sub: 'အစိုဓာတ်',      value: 'hydrating'  },
        { emoji: '🎯', text: 'Acne / Pores',   sub: 'ဝက်ျပွေ / ကျဲသော ကွက်', value: 'acne'},
      ],
    },
    {
      q: 'What\'s your skincare routine? သင်၏ အသားအရေ ဒိနစဉ် ကဘယ်လို?',
      options: [
        { emoji: '⚡', text: 'Minimal (2-3 steps)', sub: '၂-၃ ဆင့်', value: 'minimal' },
        { emoji: '📋', text: 'Standard (4-6 steps)', sub: '၄-၆ ဆင့်', value: 'standard'},
        { emoji: '💎', text: 'Full routine (7+)', sub: '၇ ဆင့်နှင့်အထက်', value: 'full'},
      ],
    },
    {
      q: 'What\'s your budget per product? တစ်ပစ္စည်း ဘတ်ဂျက်ဘယ်လောက်ကျ?',
      options: [
        { emoji: '💵', text: 'Under 30K MMK',  sub: '30K အောက်', value: 'budget'  },
        { emoji: '💰', text: '30K – 80K MMK',  sub: '30K-80K',   value: 'mid'     },
        { emoji: '💎', text: 'Above 80K MMK',  sub: '80K အထက်',  value: 'premium' },
      ],
    },
  ];

  const results = {
    dry:         { type: 'Dry',         label: 'Moisture Queen 💧',     recommend: 'Moisturizer, Hyaluronic Serum'    },
    normal:      { type: 'Normal',      label: 'Balanced Beauty ✨',    recommend: 'Essences, SPF, Vitamin C Serum'  },
    oily:        { type: 'Oily',        label: 'Oil Control Expert 🌿', recommend: 'Niacinamide, Clay Mask, Light SPF'},
    combination: { type: 'Combination', label: 'Harmony Seeker 🌗',     recommend: 'Balancing Toner, Light Moisturizer'},
  };

  let _answers  = {};
  let _step     = 0;
  let _overlay  = null;

  function open() {
    _answers = {};
    _step    = 0;
    if (!_overlay) {
      _overlay = document.createElement('div');
      _overlay.className = 'quiz-overlay';
      _overlay.innerHTML = `
        <div class="quiz-card">
          <button onclick="QuizSystem.close()"
            style="position:absolute;top:var(--space-4);right:var(--space-4);background:var(--surface-2);border:1px solid var(--border);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;color:var(--text-muted);">✕</button>
          <div id="quiz-inner"></div>
        </div>`;
      document.body.appendChild(_overlay);
    }
    _overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _render();
  }

  function close() {
    _overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function _render() {
    const inner = document.getElementById('quiz-inner');
    if (!inner) return;

    if (_step >= questions.length) { _showResult(inner); return; }

    const q = questions[_step];
    inner.innerHTML = `
      <div class="quiz-step-counter">Step ${_step + 1} of ${questions.length}</div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${(_step / questions.length) * 100}%"></div>
      </div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options" style="grid-template-columns:${q.options.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr'};">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="QuizSystem._pick(${i})">
            <span class="quiz-option-emoji">${opt.emoji}</span>
            <div class="quiz-option-text">${opt.text}</div>
            <div class="quiz-option-sub">${opt.sub}</div>
          </button>`).join('')}
      </div>`;
  }

  function _pick(idx) {
    const opt = questions[_step].options[idx];
    _answers[_step] = opt.value;
    // Visual feedback
    const btns = document.querySelectorAll('.quiz-option');
    btns[idx]?.classList.add('selected');
    setTimeout(() => { _step++; _render(); }, 350);
  }

  function _showResult(inner) {
    const skinType = _answers[0] || 'normal';
    const result   = results[skinType] || results.normal;

    inner.innerHTML = `
      <div style="text-align:center;">
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width:100%"></div>
        </div>
        <div style="font-size:3rem;margin:var(--space-6) 0;">🎉</div>
        <div class="quiz-result-type">${result.label}</div>
        <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;margin:var(--space-4) 0;">
          Your Skin Type: ${result.type}
        </h3>
        <p style="color:var(--text-soft);line-height:1.8;margin-bottom:var(--space-6);">
          Based on your answers, we recommend: <strong>${result.recommend}</strong>
        </p>
        <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary"
            onclick="QuizSystem.close();SearchSystem.executeSearch('${result.type} skin ${_answers[1]||''}')">
            See My Recommendations →
          </button>
          <button class="btn btn-outline" onclick="QuizSystem.open()">Retake Quiz</button>
        </div>
      </div>`;

    AppUtils.launchConfetti(40);
  }

  return { open, close, _pick };
})();

window.QuizSystem = QuizSystem;

/* ══════════════════════════════════════════════════════════
   GLOBAL CLICK DELEGATION (misc actions)
══════════════════════════════════════════════════════════ */

document.addEventListener('click', e => {
  // Open quiz
  if (e.target.closest('[data-open-quiz]')) QuizSystem.open();

  // Share page
  if (e.target.closest('[data-share-page]')) {
    AppUtils.shareURL(document.title, window.location.href);
  }
});

/* ══════════════════════════════════════════════════════════
   KICK OFF
══════════════════════════════════════════════════════════ */

// Apply theme before anything else (prevent flash)
(function() {
  const t = localStorage.getItem('lumiere_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

