#!/usr/bin/env bash
# Worker deploy qilingandan keyin ishga tushiring:
#   bash cloudflare/verify-cdn.sh
set -u

CDN="https://firebase-cdn.bekstar11.workers.dev"
BUCKET="ielts-portal-v1.firebasestorage.app"

# Mavjud ochiq fayl (thumbnail) — muvaffaqiyatli yo'lni tekshirish uchun.
OK_URL="$CDN/v0/b/$BUCKET/o/thumbnails%2FGemini_Generated_Image_vx0h6mvx0h6mvx0h-squished.webp?alt=media&token=03a2fab5-c0db-46c9-af03-dd556fb08fde"
# Mavjud bo'lmagan fayl — xato javob KESHLANMASLIGI kerak.
BAD_URL="$CDN/v0/b/$BUCKET/o/thumbnails%2F__no_such_file__.webp?alt=media&token=abc"

hdr() { curl -s -o /dev/null -D - -m 30 "$@"; }

echo "── 1. Kesh: MISS → HIT bo'lishi kerak"
hdr "$OK_URL" | grep -iE "^(HTTP|cf-cache-status|cache-control)" | tr '\n' ' '; echo
hdr "$OK_URL" | grep -iE "^(HTTP|cf-cache-status)" | tr '\n' ' '; echo

echo "── 2. Range so'rovi: 206 + Content-Range bo'lishi kerak (audio seek)"
hdr -H "Range: bytes=0-99" "$OK_URL" | grep -iE "^(HTTP|content-range|cf-cache-status)" | tr '\n' ' '; echo

echo "── 3. CORS: preflight 204/200 va Allow-Origin: *"
hdr -X OPTIONS -H "Origin: https://ielts-portal-v1.web.app" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: range" "$OK_URL" \
    | grep -iE "^(HTTP|access-control-allow-origin|access-control-allow-headers)" | tr '\n' ' '; echo

echo "── 4. Xato javob KESHLANMASLIGI kerak: har uchala qatorda 'no-store' va MISS/DYNAMIC"
for i in 1 2 3; do
  hdr "$BAD_URL" | grep -iE "^(HTTP|cf-cache-status|cache-control)" | tr '\n' ' '; echo
done

echo "── 5. Yozuv metodlari rad etilishi kerak: 405"
hdr -X DELETE "$OK_URL" | grep -iE "^HTTP" | tr '\n' ' '; echo
