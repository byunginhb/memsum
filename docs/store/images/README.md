# 스토어 이미지 (Google Play)

`scripts/store/play_publish.py`가 이 폴더 구조를 그대로 읽어 올린다. 2026-10 리디자인(형광펜 & 코발트) 기준으로 채웠다.

| 경로 | 규격 | 상태 |
|---|---|---|
| `icon.png` | 512x512 PNG, 불투명(32비트 알파 허용, 투명 영역 없이) | 완료 (알파 없음) |
| `ko-KR/feature.png` | 1024x500 PNG, 불투명 | 완료 — `node scripts/gen-feature-graphic.mjs --lang ko` |
| `ko-KR/phone/01-....png` | 2~8장, 9:16 권장(1080x1920), 파일명 순서대로 표시 | 완료 6장 — `node scripts/gen-store-screenshots.mjs` |
| `en-US/feature.png`, `en-US/phone/*.png` | 위와 같음(영문 화면) | 완료 (피처 그래픽 `--lang en`, 스크린샷 6장) |
| `default/` | 언어 폴더가 없을 때 대신 쓰는 폴더 | 없음 |

## 아이콘 512 만들기 (새 아이콘이 `assets/images/icon.png`에 들어온 뒤 실행)

```bash
# macOS 기본 도구 sips 사용. 원본은 1024 정사각·불투명이어야 한다.
sips -z 512 512 assets/images/icon.png --out docs/store/images/icon.png
sips -g pixelWidth -g pixelHeight -g hasAlpha docs/store/images/icon.png
```

`hasAlpha: yes`가 나오고 가장자리가 투명하면 콘솔이 거부할 수 있다. 그때는
`assets/images/icon-1024-noalpha.png` 같은 불투명 원본에서 다시 만든다.

## 주의
- 스크린샷은 **실제 앱 화면**만 쓴다(가짜 후기·최상급 문구 금지, 라이브 기능만).
- 옛 보라색 스크린샷(`assets/store/screenshots/`)은 삭제했다.

## 휴대전화 스크린샷 다시 만들기
1. 개발 웹 서버: `pnpm exec expo start --web --port 8081` (예시 데이터 `src/dev/preview.web.ts`, 웹+개발 전용, 상호·상표는 모두 가상 이름).
2. 원본 촬영: Playwright 가 필요하다(저장소 의존성 아님 — 임시 폴더에서 `npm i playwright && npx playwright install chromium`).
   ```bash
   export PLAYWRIGHT_MODULE=<임시폴더>/node_modules/playwright
   node scripts/store/capture-store-raw.mjs ko-KR home,result,calendar,report,search,scan <출력폴더>
   node scripts/store/capture-store-raw.mjs en-US home,result,calendar,report,search,scan <출력폴더>
   ```
   360x640, 배율 3(=1080x1920). 앱 언어는 브라우저 locale 을 따른다. Expo 오류 토스트·포커스 테두리는 스크립트가 CSS 로 숨긴다.
3. 고르기: `scan-0~7.png` 는 스캔 연출 프레임이다. **형광펜이 모든 줄에 칠해진 선명한 프레임(현재 `scan-4.png`)** 을 `01-scan.png` 로 쓴다.
   나머지는 `home→02-home`, `result→03-result`, `calendar→04-calendar`, `report→05-report`, `search→06-search` 로 `assets/store/raw/<lang>/` 에 복사.
4. `node scripts/gen-store-screenshots.mjs` — 캡션은 스크립트 안 `CAPTIONS`(등록정보 `listings/<lang>/full.txt`의 라이브 기능과 맞출 것).
5. 피처 그래픽: `node scripts/gen-feature-graphic.mjs --lang all`.
