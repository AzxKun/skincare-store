// telegram.js – Modern, clean order message for Telegram
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
