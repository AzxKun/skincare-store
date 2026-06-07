// telegram.js – Order and back-in-stock alert
function orderViaTelegramById(productId) {
    const product = products.find(p => p.id === productId || p.product_code === productId);
    if (!product) return;

    const qtyInput = document.getElementById('qtyInput');
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    let priceSection = '';
    if (product.discount_percent > 0) {
        const original = Math.round(product.original_price);
        const discounted = Math.round(product.price);
        const total = discounted * quantity;
        priceSection =
            `💰 မူရင်းစျေး (Original): ${original.toLocaleString()} MMK\n` +
            `🏷️ လျော့စျေး (Discount): -${product.discount_percent}%\n` +
            `💵 လျော့စျေးဖြင့်စျေး (Discounted): ${discounted.toLocaleString()} MMK\n` +
            `🧾 အရေအတွက် (Qty): ${quantity}\n` +
            `📌 ကျသင့်ငွေ (Total): ${total.toLocaleString()} MMK`;
    } else {
        const total = product.price * quantity;
        priceSection =
            `💰 စျေးနှုန်း (Price): ${Math.round(product.price).toLocaleString()} MMK\n` +
            `🧾 အရေအတွက် (Qty): ${quantity}\n` +
            `📌 ကျသင့်ငွေ (Total): ${total.toLocaleString()} MMK`;
    }

    const message =
        `🧴 *မှာယူမှုအသစ်* 🧴\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🛍️ ${product.name}\n` +
        `📦 Product Code: ${product.product_code}\n` +
        `━━━━━━━━━━━━━━━\n` +
        priceSection + `\n` +
        `💬 မှာစာတွင်ထည့်ရန် (Customer Note):\n` +
        `_ _`;

    const url = `https://t.me/${CONFIG.TELEGRAM_USERNAME.replace('@','')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Back-in-stock alert
function notifyBackInStock(productId) {
    const product = products.find(p => p.id === productId || p.product_code === productId);
    if (!product) return;

    const message = encodeURIComponent(
        `🔔 *Back in Stock Alert*\n\n` +
        `📦 Product Code: ${product.product_code}\n` +
        `🛍️ Product: ${product.name}\n\n` +
        `ကျေးဇူးပြု၍ ဤပစ္စည်းပြန်ရပါက အသိပေးပါ။ (Please notify me when this product is back in stock.)`
    );

    const url = `https://t.me/${CONFIG.TELEGRAM_USERNAME.replace('@','')}?text=${message}`;
    window.open(url, '_blank');
}
