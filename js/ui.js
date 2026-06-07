// ui.js – Render products, detail page with slideshow & video, filters, countdown
function renderProducts(productArray, containerId = 'featured-section') {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (productArray.length === 0) {
        container.innerHTML = '<p class="empty-state">ပစ္စည်းများမရှိသေးပါ (No products).</p>';
        return;
    }
    container.innerHTML = productArray.map(createProductCard).join('');
    attachCardClickEvents();
    startAllCountdowns();
}

function createProductCard(product) {
    const imgSrc = product.images.length > 0 ? product.images[0] : 'assets/placeholder.jpg';
    let priceHTML = '';
    if (product.discount_percent > 0) {
        priceHTML = `
            <div class="price-stack">
                <span class="original-price">${Math.round(product.original_price).toLocaleString()} MMK</span>
                <span class="current-price">${Math.round(product.price).toLocaleString()} MMK</span>
            </div>
            ${product.discount_end ? `<div class="countdown" data-end="${product.discount_end}" data-id="${product.id}"></div>` : ''}
        `;
    } else {
        priceHTML = `<span class="price">${Math.round(product.price).toLocaleString()} MMK</span>`;
    }

    return `
        <article class="product-card" data-id="${product.id}" data-product-code="${product.product_code}">
            <div class="card-image-container">
                <img src="${imgSrc}" alt="${product.name}" loading="lazy">
                ${product.discount_percent > 0 ? `<span class="discount-badge">-${product.discount_percent}%</span>` : ''}
            </div>
            <div class="product-info">
                <span class="product-code">${product.product_code}</span>
                <h3>${product.name}</h3>
                <p class="short-desc">${product.short_description || ''}</p>
                ${priceHTML}
                <button class="btn-detail" data-id="${product.id}">အသေးစိတ် (Details)</button>
            </div>
        </article>
    `;
}

function attachCardClickEvents() {
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.location.href = `product-detail.html?id=${encodeURIComponent(id)}`;
        });
    });
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            window.location.href = `product-detail.html?id=${encodeURIComponent(id)}`;
        });
    });
}

/* ========== PRODUCT DETAIL PAGE ========== */
function renderProductDetail(product) {
    const root = document.getElementById('product-detail-root');
    if (!root) return;

    const images = product.images.length > 0 ? product.images : ['assets/placeholder.jpg'];
    const mainImg = images[0];
    const thumbnails = images.map((img, idx) => `
        <img src="${img}" alt="thumbnail ${idx+1}" class="thumbnail ${idx === 0 ? 'active' : ''}" onclick="setMainImage(${idx})">
    `).join('');

    let videoHTML = '';
    if (product.video) {
        videoHTML = `
            <div class="product-video">
                <video autoplay muted loop playsinline controls>
                    <source src="${product.video}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }

    let priceBlock = '';
    if (product.discount_percent > 0) {
        priceBlock = `
            <div class="discount-detail">
                <span class="original-price">မူရင်းစျေး: ${Math.round(product.original_price).toLocaleString()} MMK</span>
                <span class="current-price">လျော့စျေး: ${Math.round(product.price).toLocaleString()} MMK</span>
                <span class="discount-badge large">-${product.discount_percent}%</span>
            </div>
            ${product.discount_end ? `<div class="countdown large" data-end="${product.discount_end}" data-id="${product.id}"></div>` : ''}
        `;
    } else {
        priceBlock = `<div class="detail-price">${Math.round(product.price).toLocaleString()} MMK</div>`;
    }

    // Stock badge + order button
    let stockStatus = '';
    let orderButton = '';
    if (product.stock_quantity > 10) {
        stockStatus = '<span class="stock-badge in-stock">ရှိသည် (In Stock)</span>';
        orderButton = `
            <div class="order-section">
                <div class="quantity-selector">
                    <label for="qtyInput">အရေအတွက် (Qty):</label>
                    <div class="qty-control">
                        <button type="button" onclick="changeQty(-1)">−</button>
                        <input type="number" id="qtyInput" value="1" min="1" max="${product.stock_quantity || 99}" readonly>
                        <button type="button" onclick="changeQty(1)">+</button>
                    </div>
                </div>
                <button class="btn-order telegram-order" onclick="orderViaTelegramById('${product.id}')">
                    💬 Telegram မှာယူရန် (Order)
                </button>
            </div>
        `;
    } else if (product.stock_quantity > 0) {
        stockStatus = '<span class="stock-badge low-stock">နောက်ဆုံးကျန် (Low Stock)</span>';
        orderButton = `
            <div class="order-section">
                <div class="quantity-selector">
                    <label for="qtyInput">အရေအတွက် (Qty):</label>
                    <div class="qty-control">
                        <button type="button" onclick="changeQty(-1)">−</button>
                        <input type="number" id="qtyInput" value="1" min="1" max="${product.stock_quantity || 99}" readonly>
                        <button type="button" onclick="changeQty(1)">+</button>
                    </div>
                </div>
                <button class="btn-order telegram-order" onclick="orderViaTelegramById('${product.id}')">
                    💬 Telegram မှာယူရန် (Order)
                </button>
            </div>
        `;
    } else {
        stockStatus = '<span class="stock-badge out-of-stock">ကုန်သွားပါပြီ (Out of Stock)</span>';
        // Back-in-stock alert button
        orderButton = `
            <div class="order-section">
                <button class="btn-order notify-btn" onclick="notifyBackInStock('${product.id}')">
                    🔔 ပြန်ရရှိပါက အသိပေးရန် (Notify Me)
                </button>
            </div>
        `;
    }

    root.innerHTML = `
        <div class="product-detail-container">
            <div class="product-gallery">
                <div class="main-image-wrapper">
                    <img src="${mainImg}" alt="${product.name}" class="main-image" id="mainImage">
                    ${images.length > 1 ? `
                        <button class="slideshow-btn prev" onclick="slideImage(-1)">❮</button>
                        <button class="slideshow-btn next" onclick="slideImage(1)">❯</button>
                    ` : ''}
                </div>
                <div class="thumbnail-list">${thumbnails}</div>
                ${videoHTML}
            </div>
            <div class="detail-info">
                <span class="product-code-large">${product.product_code}</span>
                <h1>${product.name}</h1>
                <p class="brand">${product.brand || ''}</p>
                ${priceBlock}
                ${stockStatus}
                <div class="description-block">
                    <h3>ဖော်ပြချက် (Description)</h3>
                    <p>${product.full_description || product.short_description}</p>
                </div>
                ${product.ingredients ? `<div class="description-block"><h3>ပါဝင်ပစ္စည်းများ (Ingredients)</h3><p>${product.ingredients}</p></div>` : ''}
                ${product.usage_instructions ? `<div class="description-block"><h3>အသုံးပြုနည်း (Usage)</h3><p>${product.usage_instructions}</p></div>` : ''}
                <div class="meta">
                    <p>အမျိုးအစား (Category): ${product.category}</p>
                    <p>အသားအရေ (Skin Type): ${product.skin_type}</p>
                    <p>အရွယ်အစား (Size): ${product.size}</p>
                    <p>မူလနိုင်ငံ (Origin): ${product.country_of_origin}</p>
                </div>
                ${orderButton}
            </div>
        </div>
    `;

    window.productImages = images;
    window.currentImageIndex = 0;
    window.setMainImage = function(index) {
        window.currentImageIndex = index;
        document.getElementById('mainImage').src = window.productImages[index];
        document.querySelectorAll('.thumbnail').forEach((t, i) => t.classList.toggle('active', i === index));
    };
    window.slideImage = function(delta) {
        const newIndex = (window.currentImageIndex + delta + window.productImages.length) % window.productImages.length;
        setMainImage(newIndex);
    };
    window.changeQty = function(delta) {
        const input = document.getElementById('qtyInput');
        if (!input) return;
        let val = parseInt(input.value) || 1;
        val += delta;
        if (val < 1) val = 1;
        const max = parseInt(input.max) || 99;
        if (val > max) val = max;
        input.value = val;
    };

    startAllCountdowns();
}

function filterProducts({ category = null, skin_type = null, maxPrice = null } = {}) {
    let filtered = [...products];
    if (category) filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    if (skin_type) filtered = filtered.filter(p => p.skin_type.toLowerCase().includes(skin_type.toLowerCase()));
    if (maxPrice !== null) filtered = filtered.filter(p => p.price <= maxPrice);
    renderProducts(filtered);
}

function startAllCountdowns() {
    document.querySelectorAll('.countdown[data-end]').forEach(el => {
        const endDateStr = el.getAttribute('data-end');
        const endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) return;
        const update = () => {
            const now = new Date();
            const diff = endDate - now;
            if (diff <= 0) {
                el.innerHTML = '⏳ ကုန်ဆုံး (Ended)';
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (86400000)) / (3600000));
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            el.innerHTML = `⏳ ${days}ရက် ${hours}နာရီ ${minutes}မိနစ် ${seconds}စက္ကန့်`;
        };
        update();
        const interval = setInterval(update, 1000);
        el.setAttribute('data-interval-id', interval);
    });
}
