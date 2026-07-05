// TASK-006 驗收腳本：先啟動 npm run dev，再 node tasks/006-combat-formula/verify.mjs [port]
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

await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
await page.waitForTimeout(800);

// ---------- 第一部分：純函式精確驗證（經 vite dev 動態 import）----------
const unit = await page.evaluate(async () => {
  const out = {};
  try {
    const cs = await import('/src/systems/CombatSystem.ts');
    if (typeof cs.resolveAttack !== 'function' || typeof cs.rollRange !== 'function') {
      return { missing: true };
    }
    const seq = (arr) => {
      let i = 0;
      const fn = () => arr[Math.min(i++, arr.length - 1)];
      fn.calls = () => i;
      return fn;
    };
    // rollRange 邊界
    out.rollLow = cs.rollRange({ min: 8, max: 12 }, () => 0);       // 8
    out.rollHigh = cs.rollRange({ min: 8, max: 12 }, () => 0.999);  // 12
    // hit：dodge=0 ≤ acc5；dmg=10；armour=2 → 8
    const A = { atk: { min: 10, max: 10 }, def: { min: 0, max: 0 }, accuracy: 5, agility: 0 };
    const D = { atk: { min: 0, max: 0 }, def: { min: 2, max: 2 }, accuracy: 0, agility: 9 };
    out.hit = cs.resolveAttack(A, D, seq([0.0, 0.5, 0.5]));
    // miss（閃避）：dodge=floor(.99*10)=9 > 5；且 RNG 仍恰好消耗 3 次
    const r2 = seq([0.99, 0.5, 0.5]);
    out.dodge = cs.resolveAttack(A, D, r2);
    out.dodgeCalls = r2.calls();
    // miss（格擋）：atk 2 vs def 5
    const A2 = { ...A, atk: { min: 2, max: 2 } };
    const D2 = { ...D, def: { min: 5, max: 5 } };
    out.block = cs.resolveAttack(A2, D2, seq([0.0, 0.5, 0.5]));
    // 資料表
    const cls = await import('/src/data/ClassStats.ts');
    const mon = await import('/src/data/MonsterStats.ts');
    const w = cls.CLASS_STATS.warrior; const m = cls.CLASS_STATS.mage; const t = cls.CLASS_STATS.taoist;
    out.classes = [w, m, t].map((c) => ({ atk: c.atk, def: c.def, accuracy: c.accuracy, agility: c.agility }));
    const sk = mon.MONSTER_DEFS.skeleton; const ch = mon.MONSTER_DEFS.chicken;
    out.skeleton = { atk: sk.atk, def: sk.def, accuracy: sk.accuracy, agility: sk.agility };
    out.chicken = { atk: ch.atk, accuracy: ch.accuracy, agility: ch.agility };
    // 升級成長
    const ls = await import('/src/systems/LevelSystem.ts');
    const st = { level: 1, xp: 0, maxHp: 90, hp: 90, atk: { min: 9, max: 13 }, def: { min: 1, max: 3 } };
    out.grow = ls.gainXp(st, 50).state;
  } catch (e) {
    out.error = String(e);
  }
  return out;
});

if (unit.missing || unit.error) {
  check('§1 CombatSystem 匯出 resolveAttack/rollRange', false, unit.error ?? 'API 缺失');
  console.log(results.join('\n'));
  console.log(`\n=== ${failed + 1} FAILED（未實作，行為測試跳過）===`);
  await browser.close();
  process.exit(1);
}
check('§1 rollRange 邊界 8..12', unit.rollLow === 8 && unit.rollHigh === 12, `low=${unit.rollLow} high=${unit.rollHigh}`);
check('§1 hit：10 − 2 = 8', unit.hit.result === 'hit' && unit.hit.damage === 8, JSON.stringify(unit.hit));
check('§1 閃避 miss 且 RNG 恰消耗 3 次', unit.dodge.result === 'miss' && unit.dodge.damage === 0 && unit.dodgeCalls === 3, JSON.stringify({ ...unit.dodge, calls: unit.dodgeCalls }));
check('§1 格擋 miss（armour ≥ damage）', unit.block.result === 'miss' && unit.block.damage === 0, JSON.stringify(unit.block));
const [w, m, t] = unit.classes;
check('§2 職業表：戰8-12/2-5/13/12 法14-22/0-1/10/10 道9-13/1-3/12/15',
  w.atk.min === 8 && w.atk.max === 12 && w.def.min === 2 && w.def.max === 5 && w.accuracy === 13 && w.agility === 12 &&
  m.atk.min === 14 && m.atk.max === 22 && m.def.max === 1 && m.accuracy === 10 && m.agility === 10 &&
  t.atk.min === 9 && t.atk.max === 13 && t.def.max === 3 && t.accuracy === 12 && t.agility === 15,
  JSON.stringify(unit.classes));
check('§2 骷髏 7-10/1-3/13/5、雞 0-0/acc3/agi15',
  unit.skeleton.atk.min === 7 && unit.skeleton.atk.max === 10 && unit.skeleton.def.max === 3 && unit.skeleton.accuracy === 13 && unit.skeleton.agility === 5 &&
  unit.chicken.atk.max === 0 && unit.chicken.accuracy === 3 && unit.chicken.agility === 15,
  JSON.stringify({ sk: unit.skeleton, ch: unit.chicken }));
check('§2 升級成長：atk +1/+1、def.max +1、HP+10 回滿',
  unit.grow.level === 2 && unit.grow.maxHp === 100 && unit.grow.hp === 100 &&
  unit.grow.atk.min === 10 && unit.grow.atk.max === 14 && unit.grow.def.min === 1 && unit.grow.def.max === 4,
  JSON.stringify(unit.grow));

// ---------- 第二部分：實戰整合驗證 ----------
await page.keyboard.press('3'); // 道士（agi 15，最容易觀察 MISS）
await page.waitForTimeout(800);
await page.evaluate(() => {
  const tm = window.__game.textures;
  const orig = tm.addCanvas.bind(tm);
  let uid = 0;
  tm.addCanvas = (key, canvas, skipCache) => orig(`${key}-vfy${++uid}`, canvas, skipCache);
});

const state = () =>
  page.evaluate(() => {
    const v = window.__game.scene.getScene('Village');
    if (!v?.player?.stats) return null;
    return {
      player: { x: v.player.x, y: v.player.y, hp: v.player.stats.hp, xp: v.player.stats.xp,
        combat: v.player.combatStats ?? null },
      monsters: (v.monsters ?? []).map((mo) => ({ id: mo.monsterId, x: mo.x, y: mo.y, alive: mo.alive })),
      dummies: v.dummies.map((d) => ({ x: d.x, y: d.y, hp: d.hp, alive: d.alive })),
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

let s = await state();
check('§4 player.combatStats 即時暴露（道士 9-13/1-3/12/15）',
  !!s.player.combat && s.player.combat.atk.min === 9 && s.player.combat.agility === 15, JSON.stringify(s.player.combat));

// 打假人 5 刀：每刀傷害 ∈ [6..12]（9-13 − 1-3），且至少兩種不同值（變異性）
await clickWorld(640, 496);
await page.waitForTimeout(4500);
const deltas = [];
let prevHp = null;
for (let i = 0; i < 5; i++) {
  const d0 = (await state()).dummies[0];
  if (!d0.alive) { await page.waitForTimeout(3200); continue; } // 重生等待
  prevHp = d0.hp;
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
  const d1 = (await state()).dummies[0];
  if (d1.alive && d1.hp < prevHp) deltas.push(prevHp - d1.hp);
  else if (!d1.alive) deltas.push(prevHp); // 擊殺：至少造成 prevHp 傷害，僅計變異用
}
check('§3 假人傷害皆在 [6..12] 且永不 MISS（agi 0）', deltas.length >= 3 && deltas.every((x) => x >= 6 && x <= 12), JSON.stringify(deltas));
check('§1 傷害有變異（≥2 種值）', new Set(deltas).size >= 2, JSON.stringify(deltas));

// 站在史萊姆旁 24 秒：道士 agi15 vs 史萊姆 acc10 → 31% MISS；受傷 ∈ [1..5]
s = await state();
const sl = s.monsters.filter((mo) => mo.id === 'slime' && mo.alive)
  .reduce((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) < Math.hypot(b.x - s.player.x, b.y - s.player.y) ? a : b);
await clickWorld(sl.x, sl.y);
await page.waitForTimeout(4000);
let missSeen = false;
const hurt = [];
let ph = (await state()).player.hp;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(300);
  const st = await state();
  if (st.player.hp < ph) { hurt.push(ph - st.player.hp); }
  ph = st.player.hp;
  if (!missSeen) {
    missSeen = await page.evaluate(() => {
      const v = window.__game.scene.getScene('Village');
      return v.children.list.some((c) => c.text !== undefined && String(c.text).includes('MISS'));
    });
  }
  if (missSeen && hurt.length >= 3) break;
}
check('§3 史萊姆攻擊傷害 ∈ [1..5]（4-6 − 1-3，扣除格擋歸零幀）', hurt.length >= 3 && hurt.every((x) => x >= 1 && x <= 5), JSON.stringify(hurt));
check('§3 出現灰色 MISS 浮動字', missSeen);

// 存檔格式：殺附近的雞觸發存檔 → atk 為範圍物件
s = await state();
const ch2 = s.monsters.filter((mo) => mo.id === 'chicken' && mo.alive)
  .reduce((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) < Math.hypot(b.x - s.player.x, b.y - s.player.y) ? a : b, s.monsters.find((mo) => mo.id === 'chicken'));
if (ch2) {
  await clickWorld(ch2.x, ch2.y);
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) {
    const st = await state();
    const c = st.monsters.filter((mo) => mo.id === 'chicken' && mo.alive)
      .sort((a, b) => Math.hypot(a.x - st.player.x, a.y - st.player.y) - Math.hypot(b.x - st.player.x, b.y - st.player.y))[0];
    if (!c) break;
    if (Math.hypot(c.x - st.player.x, c.y - st.player.y) > 50) { await clickWorld(c.x, c.y); await page.waitForTimeout(2500); }
    await page.keyboard.press('Space');
    await page.waitForTimeout(1100);
    if ((await state()).player.xp > s.player.xp) break;
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('legend-newbie-save-v1') ?? 'null'));
  check('§2 存檔 atk/def 為範圍格式', !!saved && typeof saved.atk === 'object' && typeof saved.atk.min === 'number' && typeof saved.def.max === 'number', JSON.stringify(saved?.atk));
}

check('無 page errors', pageErrors.length === 0, pageErrors.join('; '));

console.log(results.join('\n'));
console.log(failed === 0 ? '\n=== ALL PASS ===' : `\n=== ${failed} FAILED ===`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
