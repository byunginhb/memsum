// scripts/gen-store-screenshots.mjs
//
// 스토어 이미지 생성기 — assets/store/templates/ 의 HTML을 스토어 규격으로 렌더한다.
// - frame{1..6}.html → Play(1080×1920)·App Store(1290×2796) 스크린샷
// - fg.html          → Play 피처 그래픽(1024×500)
//
// 실행: node scripts/gen-store-screenshots.mjs [프레임번호... | fg]
//   node scripts/gen-store-screenshots.mjs        # 스크린샷 6종 + 피처 그래픽 전부
//   node scripts/gen-store-screenshots.mjs 1      # frame1만
//   node scripts/gen-store-screenshots.mjs fg     # 피처 그래픽만
//
// 산출: assets/store/screenshots/{play,appstore}/{1..6}.png, assets/store/feature-graphic.png
//
// 피처 그래픽의 소스는 fg.html 하나다. 예전엔 gen-feature-graphic.mjs(resvg)가 같은 PNG를
// 구버전 디자인으로 덮어쓰는 이원화 상태였어서, 그 스크립트를 지우고 여기로 합쳤다.
//
// ⚠️ appstore/(1290×2796)는 Play에 올리면 거부된다 — Play는 "긴 변 ≤ 짧은 변 × 2"를 요구하는데
//    2.17배다. Play엔 play/(1080×1920, 1.78배)만 올릴 것.
//
// why 헤드리스 Chrome:
// - 템플릿 치수가 전부 vw/vh라 뷰포트만 규격에 맞추면 두 해상도에서 비례가 유지된다.
//   (기기 에뮬레이션이 아니라 "캔버스 크기 지정"이므로 --window-size로 충분하다.)
// - 폰트(Pretendard)를 CDN에서 받으므로 렌더 전 네트워크 유휴 대기가 필요하다
//   → --virtual-time-budget 으로 타이머·폰트 로딩을 가상 시간으로 소진시킨다.

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TPL_DIR = join(ROOT, 'assets', 'store', 'templates');
const OUT_ROOT = join(ROOT, 'assets', 'store', 'screenshots');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** 스토어별 스크린샷 규격. 앱스토어는 6.7"(iPhone 15 Pro Max) 기준. */
const TARGETS = [
  { name: 'play', dir: 'play', width: 1080, height: 1920 },
  { name: 'appstore', dir: 'appstore', width: 1290, height: 2796 },
];

// 폰트 로딩·레이아웃 안정화를 위한 가상 시간(ms). 실제 대기 시간이 아니다.
const VIRTUAL_TIME_BUDGET = 8000;

/** HTML 하나를 지정 캔버스 크기로 렌더한다. */
function shoot(src, out, width, height) {
  if (!existsSync(src)) throw new Error(`템플릿 없음: ${src}`);
  mkdirSync(dirname(out), { recursive: true });

  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--virtual-time-budget=${VIRTUAL_TIME_BUDGET}`,
      `--window-size=${width},${height}`,
      `--screenshot=${out}`,
      pathToFileURL(src).href,
    ],
    { stdio: 'pipe' },
  );

  return statSync(out).size;
}

/** 피처 그래픽(1024×500) — 소스는 fg.html 하나뿐. */
function renderFeatureGraphic() {
  const out = join(ROOT, 'assets', 'store', 'feature-graphic.png');
  const bytes = shoot(join(TPL_DIR, 'fg.html'), out, 1024, 500);
  console.log(`✓ feature-graphic.png  1024×500  ${(bytes / 1024).toFixed(0)}KB`);
}

const args = process.argv.slice(2);
const wantsFg = args.length === 0 || args.includes('fg');
const frames = args.filter((a) => /^[1-6]$/.test(a)).map(Number);
const targetFrames = frames.length ? frames : args.length === 0 ? [1, 2, 3, 4, 5, 6] : [];

for (const frame of targetFrames) {
  for (const target of TARGETS) {
    const out = join(OUT_ROOT, target.dir, `${frame}.png`);
    const bytes = shoot(join(TPL_DIR, `frame${frame}.html`), out, target.width, target.height);
    console.log(`✓ ${target.dir}/${frame}.png  ${target.width}×${target.height}  ${(bytes / 1024).toFixed(0)}KB`);
  }
}

if (wantsFg) renderFeatureGraphic();
