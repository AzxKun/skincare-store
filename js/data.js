// data.js – Fetch and parse Google Sheets as product database
let products = [];
let productFetchPromise = null;

async function fetchProducts(forceRefresh = false) {
    if (products.length > 0 && !forceRefresh) return Promise.resolve(products);
    if (productFetchPromise) return productFetchPromise;

    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${CONFIG.SHEET_NAME}`;

    productFetchPromise = fetch(url)
        .then(response => response.text())
        .then(text => {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            products = parseSheetData(json.table);
            console.log(`✅ ${products.length} products loaded`);
            return products;
        })
        .catch(error => {
            console.error('❌ Failed to load products:', error);
            products = [];
            throw error;
        })
        .finally(() => { productFetchPromise = null; });

    return productFetchPromise;
}

function parseSheetData(table) {
    if (!table || !table.rows || table.rows.length < 2) return [];
    const headers = table.rows[0].c.map(cell => cell ? String(cell.v).trim().toLowerCase().replace(/ /g, '_') : '');
    const dataRows = table.rows.slice(1);

    return dataRows.map(row => {
        const obj = {};
        row.c.forEach((cell, index) => {
            if (cell === null || cell === undefined) return;
            const value = cell.v;
            const key = headers[index] ? headers[index] : `col_${index}`;
            obj[key] = value;
        });

        // Normalise fields
        obj.product_code = obj.product_code || '';
        obj.id = obj.id || obj.product_code;
        obj.name = obj.name || '';
        obj.price = parseFloat(obj.price) || 0;
        obj.stock_quantity = parseInt(obj.stock_quantity) || 0;
        obj.featured = String(obj.featured).toLowerCase() === 'true';
        obj.category = obj.category || '';
        obj.skin_type = obj.skin_type || '';
        obj.brand = obj.brand || '';
        obj.short_description = obj.short_description || '';
        obj.full_description = obj.full_description || '';
        obj.benefits = obj.benefits || '';
        obj.ingredients = obj.ingredients || '';
        obj.usage_instructions = obj.usage_instructions || '';
        obj.size = obj.size || '';
        obj.country_of_origin = obj.country_of_origin || '';

        // Images (image1 … image12)
        obj.images = [];
        for (let i = 1; i <= 12; i++) {
            const imgKey = 'image' + i;
            if (obj[imgKey] && String(obj[imgKey]).trim() !== '') {
                obj.images.push(String(obj[imgKey]).trim());
            }
            delete obj[imgKey];
        }
        // Fallback to single image1 field (if present in sheet but not captured as image1-12)
        if (obj.images.length === 0 && obj.image1) obj.images = [obj.image1];

        // Discount fields
        obj.discount_percent = parseFloat(obj.discount_percent) || 0;
        obj.original_price = parseFloat(obj.original_price) || 0;
        obj.discount_end = obj.discount_end || null;
        if (obj.discount_percent > 0 && obj.original_price === 0) {
            obj.original_price = obj.price / ((100 - obj.discount_percent) / 100);
        }

        return obj;
    });
}
