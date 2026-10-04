// scripts/store/capture-store-raw.mjs
//
// 스토어 스크린샷 원본 촬영(Playwright). 예시 데이터는 src/dev/preview.web.ts(웹+개발 전용).
// 준비: pnpm exec expo start --web --port 8081 (다른 터미널), Playwright 설치(예: 임시 폴더에서 npm i playwright && npx playwright install chromium).
// 사용: node scripts/store/capture-store-raw.mjs <ko-KR|en-US> [장면,장면] [출력폴더]
//   기본 출력: assets/store/raw-all/<locale>/  (scan-0~7.png 프레임 등 후보 전체). 고른 것을
//   assets/store/raw/<locale>/NN-이름.png 로 복사한 뒤 node scripts/gen-store-screenshots.mjs.
// BASE_URL 환경변수로 서버 주소 변경, PLAYWRIGHT_MODULE 로 playwright 위치 지정 가능.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const locale = process.argv[2] || 'ko-KR';
const only = process.argv[3];
const OUT = path.resolve(process.argv[4] || path.join(__dirname, '../../assets/store/raw-all'), locale);
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:8081';
const scenes = [
  { name: 'scan', url: '/?sheet=scan', scheme: 'light', frames: [1250, 100, 100, 100, 100, 100, 100, 300] },
  { name: 'home', url: '/', scheme: 'light' },
  { name: 'result', url: '/?sheet=result', scheme: 'light' },
  { name: 'calendar', url: '/calendar', scheme: 'light' },
  { name: 'report', url: '/report/weekly', scheme: 'light', wait: 6000 },
  { name: 'report-dark', url: '/report/weekly', scheme: 'dark', wait: 6000 },
  { name: 'search', url: '/search', scheme: 'light' },
  { name: 'search-dark', url: '/search', scheme: 'dark' },
  { name: 'detail', url: '/captures/pv-wedding', scheme: 'light' },
  { name: 'parcel', url: '/parcel/pv-parcel-1', scheme: 'light' },
];
(async () => {
  const browser = await chromium.launch();
  for (const s of scenes) {
    if (only && !only.split(',').includes(s.name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: s.scheme, locale, timezoneId: 'Asia/Seoul' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    // 개발 전용 오버레이(Expo LogBox 오류 토스트)와 브라우저 포커스 테두리·커서를 숨긴다.
    await page.addInitScript(() => {
      const css = '#error-toast{display:none!important} *:focus,*:focus-visible{outline:none!important} input{caret-color:transparent!important}';
      const add = () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };
      if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
    });
    await page.goto(BASE + s.url, { waitUntil: 'load', timeout: 240000 });
    if (s.frames) {
      let i = 0;
      for (const ms of s.frames) { await page.waitForTimeout(ms); await page.screenshot({ path: `${OUT}/${s.name}-${i++}.png` }); }
    } else {
      await page.waitForTimeout(s.wait || 4500);
      if (s.name.startsWith('search')) {
        const input = page.locator('input').first();
        if (await input.count()) { await input.fill(locale === 'en-US' ? 'October' : '10월'); await page.waitForTimeout(2500); }
      }
      await page.screenshot({ path: `${OUT}/${s.name}.png` });
    }
    console.log(s.name, errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
})();
