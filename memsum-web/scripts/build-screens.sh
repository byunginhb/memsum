#!/usr/bin/env bash
# 앱 새 디자인 원본 캡처(assets/store/raw/<locale>/0N-*.png, 1080x1920)를
# (홈·결과·리포트·자료실 4장만) 웹용 webp(720x1280, 품질 82)로 변환해 public/screens/<ko|en>/ 에 둔다.
# why 720: 화면에서 가장 크게 쓰는 폭이 약 360 CSS px → 2배 밀도까지 선명하고 용량은 1/5 수준.
# 필요: cwebp (brew install webp). 실행: bash scripts/build-screens.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=../assets/store/raw
for pair in "ko-KR:ko" "en-US:en"; do
  src="${pair%%:*}"; dst="public/screens/${pair##*:}"
  mkdir -p "$dst"
  for f in "$RAW/$src"/0[2356]-*.png; do
    name=$(basename "$f" .png); name=${name#0?-}
    cwebp -quiet -q 82 -m 6 -resize 720 1280 "$f" -o "$dst/$name.webp"
  done
done
ls -la public/screens/*
