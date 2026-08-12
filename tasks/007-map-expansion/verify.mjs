// TASK-007 驗收腳本：先啟動 npm run dev，再 node tasks/007-map-expansion/verify.mjs [port]
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

// 與 IsoMap.ts 相同的座標公式（MAP_ROWS/TILE_W/TILE_H/MAP_OFFSET_Y 依 SPEC 不可更動）
const TILE_W = 64;
const TILE_H = 32;
const MAP_OFFSET_X = 512; // (16-1)*32+32
const MAP_OFFSET_Y = 64;
const tileToWorld = (col, row) => ({
  x: (col - row) * (TILE_W / 2) + MAP_OFFSET_X,
  y: (col + row) * (TILE_H / 2) + MAP_OFFSET_Y,
});
const birthPos = (col, row) => {
  const { x, y } = tileToWorld(col, row);
  return { x, y: y + TILE_H / 2 + 6 };
};

const state = () =>
  page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    if (!v || !v.player || !v.player.stats) return null;
    return {
      player: { x: v.player.x, y: v.player.y, gold: v.player.gold, ...v.player.stats },
      monsters: (v.monsters ?? []).map((m) => ({ id: m.monsterId ?? null, x: m.x, y: m.y, hp: m.hp, alive: m.alive })),
      worldBounds: { w: v.physics.world.bounds.width, h: v.physics.world.bounds.height },
    };
  });

const waitFor = async (fn, timeoutMs, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true;
    await page.waitForTimeout(250);
  }
  check(`waitFor timeout: ${label}`, false, `${timeoutMs}ms`);
  return false;
};

const clickWorld = async (wx, wy) => {
  const cam = await page.evaluate(() => {
    const c = window.__game.scene.getScene('Village').cameras.main;
    return { cx: c.worldView.centerX, cy: c.worldView.centerY, zoom: c.zoom };
  });
  const box = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(box.x + 400 + (wx - cam.cx) * cam.zoom, box.y + 300 + (wy - cam.cy) * cam.zoom);
};

const walkTo = async (wx, wy, tol, label) => {
  await clickWorld(wx, wy);
  return waitFor(async () => {
    const st = await state();
    return st && Math.hypot(st.player.x - wx, st.player.y - wy) < tol;
  }, 20000, label);
};

// 不斷言成敗的移動（供分段長途移動使用；沿途卡到障礙物也不視為失敗，只看最終是否夠接近目標）
const moveTowardSilent = async (wx, wy, tol, timeoutMs) => {
  await clickWorld(wx, wy);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st = await state();
    if (st && Math.hypot(st.player.x - wx, st.player.y - wy) < tol) return true;
    await page.waitForTimeout(250);
  }
  return false;
};

await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
await page.waitForTimeout(800);
await page.keyboard.press('1'); // 戰士
await page.waitForTimeout(800);

// §1 世界尺寸：MAP_COLS 20→30，公式衍生後 WORLD_WIDTH=(30+16)*32=1472，WORLD_HEIGHT=(30+16-1)*16+32+64=816
let s = await state();
check('§1 世界寬度擴大（≈1472，允許 ±40）', Math.abs(s.worldBounds.w - 1472) <= 40, `w=${s.worldBounds.w}`);
check('§1 世界高度擴大（≈816，允許 ±40）', Math.abs(s.worldBounds.h - 816) <= 40, `h=${s.worldBounds.h}`);

// §3/§4 新貼圖
check('§3 tile-wild 貼圖已生成', await page.evaluate(() => window.__game.textures.exists('tile-wild')));
check('§4 rock 貼圖已生成', await page.evaluate(() => window.__game.textures.exists('rock')));

// §5 怪物總數與分布：13(既有) + 8(新) = 21
const countBy = (list, id) => list.filter((m) => m.id === id).length;
check('§5 monsters 陣列共 21 隻', s.monsters.length === 21, `len=${s.monsters.length}`);
check(
  '§5 slime×8 / chicken×3 / deer×5 / skeleton×5',
  countBy(s.monsters, 'slime') === 8 &&
    countBy(s.monsters, 'chicken') === 3 &&
    countBy(s.monsters, 'deer') === 5 &&
    countBy(s.monsters, 'skeleton') === 5,
  JSON.stringify({
    slime: countBy(s.monsters, 'slime'),
    chicken: countBy(s.monsters, 'chicken'),
    deer: countBy(s.monsters, 'deer'),
    skeleton: countBy(s.monsters, 'skeleton'),
  }),
);

// §5 新出生點座標核對（誤差 4px 內，對應 tileToWorld + TILE_H/2 + 6）
const expectedSpawns = [
  { id: 'skeleton', col: 23, row: 3 },
  { id: 'skeleton', col: 26, row: 6 },
  { id: 'skeleton', col: 29, row: 8 },
  { id: 'deer', col: 21, row: 5 },
  { id: 'deer', col: 24, row: 8 },
  { id: 'deer', col: 27, row: 2 },
  { id: 'slime', col: 22, row: 1 },
  { id: 'slime', col: 28, row: 4 },
];
for (const spawn of expectedSpawns) {
  const p = birthPos(spawn.col, spawn.row);
  const found = s.monsters.some(
    (m) => m.id === spawn.id && Math.hypot(m.x - p.x, m.y - p.y) < 4,
  );
  check(
    `§5 出生點 ${spawn.id}(${spawn.col},${spawn.row}) 座標正確`,
    found,
    `expect≈(${p.x.toFixed(1)},${p.y.toFixed(1)})`,
  );
}

// 回歸：既有出生點未被刪改（原 13 筆位置仍存在存活個體，取樣兩筆）
{
  const p1 = birthPos(3, 9); // 原 slime 出生點
  const p2 = birthPos(1, 9); // 原 skeleton 出生點
  check(
    '回歸：既有 slime 出生點(3,9)未被更動',
    s.monsters.some((m) => m.id === 'slime' && Math.hypot(m.x - p1.x, m.y - p1.y) < 4),
  );
  check(
    '回歸：既有 skeleton 出生點(1,9)未被更動',
    s.monsters.some((m) => m.id === 'skeleton' && Math.hypot(m.x - p2.x, m.y - p2.y) < 4),
  );
}

// 可達性：玩家可從村莊走到荒野深處（(29,8) 骷髏出生點附近）而不脫離世界/卡死
// 目標點常遠超出單次點擊可視範圍（畫布 800×600、zoom 1.1），分段沿途走以確保每次點擊落在畫布內
const deepWild = tileToWorld(29, 8);
{
  const HOP = 280; // 略小於單邊可視世界距離（~800/2/1.1≈364），保留餘裕
  for (let i = 0; i < 25; i++) {
    const cur = (await state()).player;
    const dx = deepWild.x - cur.x;
    const dy = deepWild.y - cur.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 60) break;
    const step = Math.min(HOP, dist);
    const wx = cur.x + (dx / dist) * step;
    const wy = cur.y + (dy / dist) * step;
    await moveTowardSilent(wx, wy, 40, 8000);
  }
}
s = await state();
check(
  '§6 荒野區可達（玩家抵達(29,8)附近）',
  Math.hypot(s.player.x - deepWild.x, s.player.y - deepWild.y) < 60,
  `player=(${s.player.x.toFixed(0)},${s.player.y.toFixed(0)})`,
);

check('無 page errors', pageErrors.length === 0, pageErrors.join('; '));

console.log(results.join('\n'));
console.log(failed === 0 ? '\n=== ALL PASS ===' : `\n=== ${failed} FAILED ===`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
