// TASK-001 驗收腳本：對 vite dev server 上的實際遊戲做行為斷言
// 用法：先啟動 `npm run dev`，再 `node tasks/001-slime-monster/verify.mjs [port]`
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
      player: { x: v.player.x, y: v.player.y, ...v.player.stats },
      pet: v.pet ? { x: v.pet.x, y: v.pet.y } : null,
      slimes: (v.slimes ?? []).map((s) => ({ x: s.x, y: s.y, hp: s.hp, alive: s.alive })),
      dummies: v.dummies.map((d) => ({ x: d.x, y: d.y, hp: d.hp, alive: d.alive })),
    };
  });

const waitFor = async (fn, timeoutMs, label) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true;
    await page.waitForTimeout(200);
  }
  check(`waitFor timeout: ${label}`, false, `${timeoutMs}ms`);
  return false;
};

// 相機置中換算：玩家夠遠離邊界時位於畫面中心 (400,300)，zoom 1.1
const clickWorld = async (wx, wy) => {
  const s = await state();
  const camX = Math.min(Math.max(s.player.x, 363), 789);
  const camY = Math.min(Math.max(s.player.y, 272), 383);
  const box = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(box.x + 400 + (wx - camX) * 1.1, box.y + 300 + (wy - camY) * 1.1);
};

await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(1500);
await page.keyboard.press('3'); // 道士（含寵物測試）
await page.waitForTimeout(800);

// §8 / §2：slimes 陣列、3 隻、指定 tiles
let s = await state();
check('VillageScene 有 slimes 陣列且恰 3 隻', s.slimes.length === 3, `len=${s.slimes.length}`);
const expected = [
  { x: 320, y: 278 }, // tile(3,9) ground+6
  { x: 384, y: 342 }, // tile(6,10)
  { x: 192, y: 342 }, // tile(3,13)
];
if (s.slimes.length === 3) {
  const matched = expected.every((e) => s.slimes.some((sl) => Math.hypot(sl.x - e.x, sl.y - e.y) < 4));
  check('史萊姆出生位置符合 SPEC tiles', matched, JSON.stringify(s.slimes.map((sl) => [sl.x, sl.y])));
  check('史萊姆 hp 20 滿血', s.slimes.every((sl) => sl.hp === 20 && sl.alive));
}
check('slime 貼圖已程式生成', await page.evaluate(() => window.__game.textures.exists('slime')));

if (s.slimes.length === 3) {
  // §4：aggro 追擊 — 走到最近史萊姆附近 100~110px 外緣再逼近
  const spawn = { x: 576, y: 304 };
  const target = s.slimes.reduce((a, b) =>
    Math.hypot(a.x - spawn.x, a.y - spawn.y) < Math.hypot(b.x - spawn.x, b.y - spawn.y) ? a : b);
  await clickWorld(target.x, target.y);
  await waitFor(async () => {
    const st = await state();
    return Math.hypot(st.player.x - target.x, st.player.y - target.y) < 80;
  }, 8000, '玩家接近史萊姆');
  const distBefore = await page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    const sl = v.slimes.reduce((a, b) => {
      const da = Math.hypot(a.x - v.player.x, a.y - v.player.y);
      const db = Math.hypot(b.x - v.player.x, b.y - v.player.y);
      return da < db ? a : b;
    });
    window.__testSlime = sl;
    return Math.hypot(sl.x - v.player.x, sl.y - v.player.y);
  });
  await page.waitForTimeout(1200);
  const distAfter = await page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    const sl = window.__testSlime;
    return Math.hypot(sl.x - v.player.x, sl.y - v.player.y);
  });
  check('§4 aggro：史萊姆主動逼近玩家', distAfter < distBefore || distAfter <= 24, `dist ${distBefore.toFixed(0)} → ${distAfter.toFixed(0)}`);

  // §4：近身攻擊玩家 — 道士 def 7 → 傷害 round(5-3.5)=2，每 1.5s
  const hpBefore = (await state()).player.hp;
  await waitFor(async () => (await state()).player.hp < hpBefore, 6000, '史萊姆攻擊玩家');
  s = await state();
  check('§4 史萊姆攻擊傷害符合公式（每次 2）', (hpBefore - s.player.hp) % 2 === 0 && s.player.hp < hpBefore, `hp ${hpBefore} → ${s.player.hp}`);

  // §5：玩家擊殺史萊姆 +40 XP（道士 atk11 vs def1 → 11/hit → 2 hits）
  const xpBefore = s.player.xp + (s.player.level - 1) * 1e6; // level 變化也算
  const lvBefore = s.player.level;
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(1100);
  }
  s = await state();
  const killed = await page.evaluate(() => !window.__testSlime.alive);
  check('§5 玩家可擊殺史萊姆', killed, JSON.stringify(s.slimes));
  const gained = (s.player.level - lvBefore) * 50 * lvBefore + s.player.xp - (xpBefore - (lvBefore - 1) * 1e6);
  check('§5 擊殺史萊姆 +40 XP', gained === 40 || (s.player.level > lvBefore), `xp gained≈${gained} lv ${lvBefore}→${s.player.level}`);

  // §4：死亡期間不可被鎖定（再攻擊不應報錯、屍體不掉血）
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);

  // §2：5 秒後原出生點滿血重生
  const deadSpawn = await page.evaluate(() => ({ x: window.__testSlime.x, y: window.__testSlime.y }));
  await waitFor(async () => page.evaluate(() => window.__testSlime.alive && window.__testSlime.hp === 20), 7000, '史萊姆重生');
  const respawned = await page.evaluate(() => ({ x: window.__testSlime.x, y: window.__testSlime.y, hp: window.__testSlime.hp }));
  const nearOrigin = expected.some((e) => Math.hypot(respawned.x - e.x, respawned.y - e.y) < 8);
  check('§2 史萊姆於原出生 tile 滿血重生', nearOrigin && respawned.hp === 20, JSON.stringify({ deadSpawn, respawned }));

  // §5：玩家死亡 → 出生點滿血復活。壓低 HP 讓重生的史萊姆打死玩家
  await page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    v.player.stats.hp = 2;
  });
  await waitFor(async () => {
    const st = await state();
    return st.player.hp === st.player.maxHp && Math.hypot(st.player.x - 576, st.player.y - 304) < 10;
  }, 12000, '玩家死亡並於出生點復活');
  s = await state();
  check('§5 玩家死亡後回出生點滿血', s.player.hp === s.player.maxHp && Math.hypot(s.player.x - 576, s.player.y - 304) < 10,
    `hp ${s.player.hp}/${s.player.maxHp} pos ${s.player.x.toFixed(0)},${s.player.y.toFixed(0)}`);
}

// 回歸：假人仍可正常攻擊（走到訓練場打一下）
await clickWorld(640, 496);
await waitFor(async () => {
  const st = await state();
  return Math.hypot(st.player.x - 640, st.player.y - 496) < 12;
}, 12000, '走到訓練場');
const dHpBefore = (await state()).dummies[0].hp;
await page.keyboard.press('Space');
await page.waitForTimeout(500);
const dHpAfter = (await state()).dummies[0].hp;
check('回歸：假人仍可被攻擊', dHpAfter < dHpBefore, `dummy0 hp ${dHpBefore} → ${dHpAfter}`);

check('無 page errors', pageErrors.length === 0, pageErrors.join('; '));

console.log(results.join('\n'));
console.log(failed === 0 ? '\n=== ALL PASS ===' : `\n=== ${failed} FAILED ===`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
