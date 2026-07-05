// TASK-003 驗收腳本：先啟動 npm run dev，再 node tasks/003-wander-spawn/verify.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 820, height: 640 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

const results = [];
let failed = 0;
const check = (name, cond, detail) => {
  if (!cond) failed++;
  results.push(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
};

const state = () =>
  page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    return {
      player: { x: v.player.x, y: v.player.y, gold: v.player.gold, ...v.player.stats },
      slimes: v.slimes.map((s) => ({ x: s.x, y: s.y, hp: s.hp, alive: s.alive })),
    };
  });

const clickWorld = async (wx, wy) => {
  const cam = await page.evaluate(() => {
    const c = window.__game.scene.getScene('Village').cameras.main;
    return { cx: c.worldView.centerX, cy: c.worldView.centerY, zoom: c.zoom };
  });
  const box = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(box.x + 400 + (wx - cam.cx) * cam.zoom, box.y + 300 + (wy - cam.cy) * cam.zoom);
};

await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(1500);
await page.keyboard.press('1'); // 戰士
await page.waitForTimeout(800);

// §3：共 6 隻、含右上刷怪區三點
let s = await state();
check('§3 共 6 隻史萊姆', s.slimes.length === 6, `len=${s.slimes.length}`);
const zone = [
  { x: 928, y: 358 }, // (15,2) ground+6 = (15+2)*16+64 + 16 + 6
  { x: 960, y: 406 }, // (17,3)
  { x: 832, y: 406 }, // (15,5)
];
check(
  '§3 右上刷怪區三點就位',
  zone.every((e) => s.slimes.some((sl) => Math.hypot(sl.x - e.x, sl.y - e.y) < 4)),
  JSON.stringify(s.slimes.map((sl) => [Math.round(sl.x), Math.round(sl.y)])),
);

// §2：遊蕩 — 玩家待在出生點（所有史萊姆都在 aggro 之外），觀察 14 秒
const births = s.slimes.map((sl) => ({ x: sl.x, y: sl.y }));
let maxMove = 0;      // 任一史萊姆離「初始取樣位置」的最大距離（證明有動）
let maxFromBirth = 0; // 離出生點最遠距離（證明守半徑）
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(1000);
  const st = await state();
  st.slimes.forEach((sl, idx) => {
    if (!sl.alive) return;
    maxMove = Math.max(maxMove, Math.hypot(sl.x - births[idx].x, sl.y - births[idx].y));
    maxFromBirth = Math.max(maxFromBirth, Math.hypot(sl.x - births[idx].x, sl.y - births[idx].y));
  });
}
check('§2 閒置時會遊走（14 秒內有位移 ≥ 8px）', maxMove >= 8, `maxMove=${maxMove.toFixed(1)}px`);
check('§2 遊蕩不超出半徑（≤ 80 + 10 容忍）', maxFromBirth <= 90, `maxFromBirth=${maxFromBirth.toFixed(1)}px`);

// §2：aggro 優先 — 靠近一隻，它要主動逼近
s = await state();
const nearest = s.slimes.filter((x) => x.alive).reduce((a, b) =>
  Math.hypot(a.x - s.player.x, a.y - s.player.y) < Math.hypot(b.x - s.player.x, b.y - s.player.y) ? a : b);
await clickWorld(nearest.x, nearest.y);
await page.waitForTimeout(3500);
const s2 = await state();
const nowNearest = Math.min(...s2.slimes.filter((x) => x.alive).map((sl) => Math.hypot(sl.x - s2.player.x, sl.y - s2.player.y)));
check('§2 aggro 優先於遊走（史萊姆貼近玩家 ≤ 40px）', nowNearest <= 40, `nearest=${nowNearest.toFixed(0)}px`);

// 回歸：擊殺 → 掉寶 → 金幣入帳（TASK-002 行為不退化）
await page.evaluate(() => {
  const tm = window.__game.textures;
  const orig = tm.addCanvas.bind(tm);
  let uid = 0;
  tm.addCanvas = (key, canvas, skipCache) => orig(`${key}-vfy${++uid}`, canvas, skipCache);
  window.__origRandom = Math.random;
  Math.random = () => 0;
});
const goldBefore = (await state()).player.gold;
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
  if ((await state()).player.gold > goldBefore) break;
}
await page.evaluate(() => { Math.random = window.__origRandom; });
s = await state();
for (const l of (await page.evaluate(() => window.__game.scene.getScene('Village').loots.map((x) => ({ x: x.x, y: x.y }))))) {
  await clickWorld(l.x, l.y);
  await page.waitForTimeout(1200);
}
s = await state();
check('回歸：擊殺掉寶金幣入帳', s.player.gold >= goldBefore + 3, `gold ${goldBefore} → ${s.player.gold}`);

// 回歸：死亡重生後恢復遊蕩（等重生 + 觀察 10s）
await page.waitForTimeout(5500);
s = await state();
const reborn = s.slimes.every((sl) => sl.alive);
check('回歸：史萊姆重生', reborn, JSON.stringify(s.slimes.map((sl) => sl.alive)));

check('無 page errors', pageErrors.length === 0, pageErrors.join('; '));

console.log(results.join('\n'));
console.log(failed === 0 ? '\n=== ALL PASS ===' : `\n=== ${failed} FAILED ===`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
