#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "Creating placeholder assets for ÉCLAT NOIR..."

mkdir -p assets/images
mkdir -p assets/icons

cat > assets/images/placeholder.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A0A0A"/>
      <stop offset="50%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="48%">
      <stop offset="0%" stop-color="#FF0040" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#FF0040" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg)"/>
  <rect width="800" height="1000" fill="url(#glow)"/>
  <rect x="110" y="120" width="580" height="760" rx="36" fill="#111111" stroke="#FF0040" stroke-opacity="0.5"/>
  <circle cx="400" cy="390" r="110" fill="#1F1F1F" stroke="#D4AF37" stroke-opacity="0.7"/>
  <rect x="315" y="260" width="170" height="250" rx="24" fill="#2A2A2A" stroke="#FFFFFF" stroke-opacity="0.2"/>
  <rect x="220" y="630" width="360" height="24" rx="12" fill="#D4AF37" fill-opacity="0.85"/>
  <rect x="270" y="680" width="260" height="18" rx="9" fill="#FFFFFF" fill-opacity="0.6"/>
  <text x="400" y="760" fill="#FFFFFF" font-size="34" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="4">ÉCLAT NOIR</text>
  <text x="400" y="805" fill="#CFCFCF" font-size="22" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="3">PRODUCT IMAGE</text>
</svg>
EOF

cat > assets/images/hero-1.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="50%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#18090E"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg1)"/>
  <circle cx="300" cy="220" r="220" fill="#FF0040" fill-opacity="0.12"/>
  <circle cx="1220" cy="180" r="180" fill="#D4AF37" fill-opacity="0.08"/>
  <circle cx="1180" cy="720" r="240" fill="#FF2060" fill-opacity="0.08"/>
  <text x="140" y="420" fill="#FFFFFF" font-size="88" font-family="Georgia, serif">Luxury Skincare</text>
  <text x="145" y="505" fill="#D4AF37" font-size="34" font-family="Arial, sans-serif" letter-spacing="6">ÉCLAT NOIR</text>
  <text x="145" y="565" fill="#CFCFCF" font-size="24" font-family="Arial, sans-serif">Curated premium skincare for Myanmar</text>
</svg>
EOF

cat > assets/images/hero-2.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090909"/>
      <stop offset="50%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#1A0A12"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg2)"/>
  <circle cx="260" cy="650" r="250" fill="#FF0040" fill-opacity="0.10"/>
  <circle cx="1300" cy="180" r="190" fill="#D4AF37" fill-opacity="0.09"/>
  <rect x="980" y="160" width="320" height="480" rx="40" fill="#111111" stroke="#FF0040" stroke-opacity="0.4"/>
  <text x="120" y="390" fill="#FFFFFF" font-size="82" font-family="Georgia, serif">New Arrivals</text>
  <text x="126" y="470" fill="#D4AF37" font-size="34" font-family="Arial, sans-serif" letter-spacing="6">MODERN BEAUTY DROP</text>
  <text x="126" y="530" fill="#CFCFCF" font-size="24" font-family="Arial, sans-serif">Fresh premium products loaded from your store data</text>
</svg>
EOF

cat > assets/images/hero-3.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="50%" stop-color="#120A0D"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg3)"/>
  <circle cx="330" cy="220" r="220" fill="#D4AF37" fill-opacity="0.10"/>
  <circle cx="1260" cy="700" r="260" fill="#FF0040" fill-opacity="0.10"/>
  <rect x="1080" y="180" width="240" height="240" rx="28" fill="#FF0040" fill-opacity="0.12" stroke="#FF0040" stroke-opacity="0.36"/>
  <text x="140" y="390" fill="#FFFFFF" font-size="86" font-family="Georgia, serif">Flash Sale</text>
  <text x="145" y="470" fill="#FF0040" font-size="34" font-family="Arial, sans-serif" letter-spacing="6">LIMITED TIME OFFERS</text>
  <text x="145" y="530" fill="#CFCFCF" font-size="24" font-family="Arial, sans-serif">Highlight premium discounts with a bold luxury presentation</text>
</svg>
EOF

cat > assets/images/og-image.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="50%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#18090E"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <circle cx="180" cy="120" r="160" fill="#FF0040" fill-opacity="0.14"/>
  <circle cx="1030" cy="510" r="180" fill="#D4AF37" fill-opacity="0.10"/>
  <text x="90" y="270" fill="#FFFFFF" font-size="74" font-family="Georgia, serif">ÉCLAT NOIR</text>
  <text x="95" y="340" fill="#D4AF37" font-size="28" font-family="Arial, sans-serif" letter-spacing="5">LUXURY SKINCARE MYANMAR</text>
  <text x="95" y="400" fill="#D0D0D0" font-size="22" font-family="Arial, sans-serif">Dark modern premium beauty storefront</text>
</svg>
EOF

cat > assets/icons/favicon.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0A0A0A"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#FF0040" stroke-width="3"/>
  <text x="32" y="39" text-anchor="middle" fill="#D4AF37" font-size="22" font-family="Georgia, serif">E</text>
</svg>
EOF

cat > assets/icons/icon-192.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#0A0A0A"/>
  <circle cx="96" cy="96" r="64" fill="none" stroke="#FF0040" stroke-width="8"/>
  <circle cx="96" cy="96" r="42" fill="rgba(212,175,55,0.12)" stroke="#D4AF37" stroke-width="3"/>
  <text x="96" y="112" text-anchor="middle" fill="#FFFFFF" font-size="58" font-family="Georgia, serif">E</text>
</svg>
EOF

cat > assets/icons/icon-512.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="110" fill="#0A0A0A"/>
  <circle cx="256" cy="256" r="170" fill="none" stroke="#FF0040" stroke-width="18"/>
  <circle cx="256" cy="256" r="110" fill="rgba(212,175,55,0.12)" stroke="#D4AF37" stroke-width="8"/>
  <text x="256" y="295" text-anchor="middle" fill="#FFFFFF" font-size="160" font-family="Georgia, serif">E</text>
</svg>
EOF

echo "Placeholder SVG files created."

echo "If ImageMagick is installed, converting SVG copies to PNG..."
if command -v magick >/dev/null 2>&1; then
  magick assets/images/placeholder.svg assets/images/placeholder.png || true
  magick assets/images/hero-1.svg assets/images/hero-1.png || true
  magick assets/images/hero-2.svg assets/images/hero-2.png || true
  magick assets/images/hero-3.svg assets/images/hero-3.png || true
  magick assets/images/og-image.svg assets/images/og-image.png || true
  magick assets/icons/favicon.svg assets/icons/favicon.png || true
  magick assets/icons/icon-192.svg assets/icons/icon-192.png || true
  magick assets/icons/icon-512.svg assets/icons/icon-512.png || true
  echo "PNG versions created too."
else
  echo "ImageMagick not found. SVG placeholders are ready."
  echo "Install it with: pkg install imagemagick"
fi

echo "Done."
echo "Created files:"
find assets/images assets/icons -maxdepth 1 -type f | sort

