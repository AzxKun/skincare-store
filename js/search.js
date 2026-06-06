// search.js – Smart Search (SKU, fuzzy, category detection)
const CATEGORY_KEYWORDS = {
    cleanser: ['cleanser', 'ဆပ်ပြာ', 'မျက်နှာသစ်ဆေး'],
    serum: ['serum', 'ဆီရမ်'],
    toner: ['toner', 'တိုနာ'],
    moisturizer: ['moisturizer', 'မွတ်စ်ချာရိုက်ဆာ', 'အစိုဓာတ်ထိန်းခရင်'],
    sunscreen: ['sunscreen', 'နေရောင်ကာခရင်', 'suncare']
};

function searchProducts(query) {
    if (!query || query.trim() === '') return [];
    const q = query.trim().toLowerCase();

    // 1. Exact SKU match
    const exactSKU = products.filter(p => p.product_code.toLowerCase() === q);
    if (exactSKU.length > 0) return exactSKU;

    // 2. Partial SKU (prefix)
    const prefixSKU = products.filter(p => p.product_code.toLowerCase().startsWith(q));
    if (prefixSKU.length > 0) return prefixSKU;

    // 3. Name search
    const nameMatches = products.filter(p => p.name.toLowerCase().includes(q));
    if (nameMatches.length > 0) return nameMatches;

    // 4. Fuzzy fallback: remove last 2 chars, then one by one
    for (let remove = 2; remove < q.length; remove++) {
        const test = q.slice(0, -remove);
        if (test.length === 0) break;
        const fuzzy = products.filter(p => p.name.toLowerCase().includes(test));
        if (fuzzy.length > 0) return fuzzy;
    }

    // 5. Category detection
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
            if (q.includes(kw)) {
                const catMatches = products.filter(p => p.category.toLowerCase() === category);
                if (catMatches.length > 0) return catMatches;
            }
        }
    }

    return []; // no result
}

function handleSearch(query) {
    const results = searchProducts(query);
    const container = document.getElementById('featured-section');
    if (results.length > 0) {
        renderProducts(results);
        // remove any old fallback message
        const oldMsg = document.querySelector('.search-fallback-message');
        if (oldMsg) oldMsg.remove();
    } else if (query.trim() !== '') {
        const featured = products.filter(p => p.featured);
        if (featured.length > 0) {
            renderProducts(featured);
            if (container) {
                const msg = document.createElement('div');
                msg.className = 'search-fallback-message';
                msg.innerHTML = '<p>⚠️ ရှာမတွေ့ပါ။ အောက်ပါထူးခြားသောပစ္စည်းများကို ကြည့်ပါ (No exact match, showing featured).</p>';
                container.prepend(msg);
            }
        } else {
            renderProducts([]);
        }
    } else {
        const allOrFeatured = products.filter(p => p.featured).length > 0 ? products.filter(p => p.featured) : products;
        renderProducts(allOrFeatured);
    }
}
