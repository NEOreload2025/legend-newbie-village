// TASK-002 驗收腳本：先啟動 npm run dev，再 node tasks/002-loot-pickup/verify.mjs [port]
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
      loots: (v.loots ?? []).map((l) => ({ x: l.x, y: l.y, type: l.type ?? null })),
      slimes: v.slimes.map((s) => ({ x: s.x, y: s.y, hp: s.hp, alive: s.alive })),
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
await page.keyboard.press('1'); // 戰士（def 12 高，被史萊姆打只掉 1，戰鬥中不易死）
await page.waitForTimeout(800);

// 防呆：stub Math.random 會讓 Phaser UUID() 重複 → Text 貼圖 key 撞名 → addCanvas 回傳 null 而崩潰。
// 幫 addCanvas 的 key 加流水號（純測試 harness 層 patch，不影響遊戲邏輯）。
await page.evaluate(() => {
  const tm = window.__game.textures;
  const orig = tm.addCanvas.bind(tm);
  let uid = 0;
  tm.addCanvas = (key, canvas, skipCache) => orig(`${key}-vfy${++uid}`, canvas, skipCache);
});

let s = await state();
check('VillageScene 有 loots 陣列（初始空）', Array.isArray((await page.evaluate(() => window.__game.scene.getScene('Village').loots ?? null))) , JSON.stringify(s.loots));
check('player.gold 欄位存在且為 0', s.player.gold === 0, `gold=${s.player.gold}`);
check('loot 貼圖已生成', await page.evaluate(() => window.__game.textures.exists('loot-gold') && window.__game.textures.exists('loot-potion')));

// 走到最近史萊姆（320,278）
await clickWorld(320, 278);
await waitFor(async () => {
  const st = await state();
  return Math.hypot(st.player.x - 320, st.player.y - 278) < 70;
}, 9000, '接近史萊姆');

// stub Math.random → 0：金幣必為 goldMin=3、藥水必掉（0 < 0.3）
await page.evaluate(() => {
  window.__origRandom = Math.random;
  Math.random = () => 0;
});

// 戰士 atk10 vs slime def1 → round(10-0.5)=10 → 2 刀擊殺
const goldBefore = (await state()).player.gold;
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
}
await page.evaluate(() => { Math.random = window.__origRandom; });

s = await state();
const killedSlime = s.slimes.filter((x) => !x.alive).length >= 1;
check('史萊姆已被擊殺', killedSlime, JSON.stringify(s.slimes));
// 註：不單獨檢查地面掉落物——玩家站在死亡點旁可能瞬間自動拾取，以下用金幣入帳驗證掉落

// 走到每個掉落物上拾取（散落半徑 16 可能超出 pickupRange 20）
for (const loot of s.loots) {
  await clickWorld(loot.x, loot.y);
  await page.waitForTimeout(1200);
}
await waitFor(async () => (await state()).player.gold === goldBefore + 3, 6000, '金幣 +3 入帳');
s = await state();
check('§2/§4 金幣必掉且值=goldMin(3)、自動拾取', s.player.gold === goldBefore + 3, `gold ${goldBefore} → ${s.player.gold}`);

// 藥水（random=0 必掉）：戰鬥中被史萊姆打過會缺血 → 撿藥水回血；若滿血則消耗不變
// 先確認藥水效果：hp 不低於拾取前，且若拾取前缺血 ≥20 則 +20
const hpNow = s.player.hp;
const maxHp = s.player.maxHp;
await page.waitForTimeout(1500);
s = await state();
check('§4 藥水拾取後 HP 不超過上限', s.player.hp <= maxHp, `hp=${s.player.hp}/${maxHp}`);
check('§4 藥水已被拾取（地上無殘留藥水）', !s.loots.some((l) => l.type === 'potion'), JSON.stringify(s.loots));
check('拾取後地面掉落物清空', s.loots.length === 0, `loots=${s.loots.length}`);

// HUD 顯示 Gold
const hudHasGold = await page.evaluate(() => {
  const hud = window.__game.scene.getScene('Hud');
  return hud.children.list.some((c) => c.text !== undefined && String(c.text).includes('Gold'));
});
check('§5 HUD 顯示 Gold', hudHasGold);

// 缺血時藥水確實回血：擊殺瞬間掉落物會被貼身自動拾取，
// 所以「擊殺前」先設 hp = max-30 且 xp = 0（避免升級回滿遮蔽藥水 +20）
const goldBefore2 = (await state()).player.gold;
await page.evaluate(() => {
  const v = window.__game.scene.getScene('Village');
  v.player.stats.hp = v.player.stats.maxHp - 30;
  v.player.stats.xp = 0; // 下一殺 +40 < 升級門檻，不會觸發回滿
  v.player.emit('stats-changed', v.player.stats);
});
const beforePotion = (await state()).player;
await page.evaluate(() => { window.__origRandom = Math.random; Math.random = () => 0; });
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
  if ((await state()).player.gold > goldBefore2) break;
}
await page.evaluate(() => { Math.random = window.__origRandom; });
// 撿走可能散落在拾取範圍外的殘餘掉落物
s = await state();
for (const loot of s.loots) {
  await clickWorld(loot.x, loot.y);
  await page.waitForTimeout(1300);
}
await waitFor(async () => (await state()).player.gold >= goldBefore2 + 3, 6000, '第二枚金幣入帳');
s = await state();
const healed = s.player.hp - beforePotion.hp;
// 預期 +20（容忍測試期間被史萊姆咬 1~5 下：每下 1）
check('§4 缺血時藥水回血 ≈ potionHeal(20)', healed >= 15 && healed <= 21 && s.player.hp <= s.player.maxHp, `hp ${beforePotion.hp} → ${s.player.hp}/${s.player.maxHp} (+${healed})`);

// 回歸：假人擊殺不掉落
await clickWorld(640, 496);
await waitFor(async () => {
  const st = await state();
  return Math.hypot(st.player.x - 640, st.player.y - 496) < 12;
}, 15000, '走到訓練場');
const lootsBefore = (await state()).loots.length;
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
}
s = await state();
check('回歸：假人死亡不掉落', s.loots.length === lootsBefore, `loots ${lootsBefore} → ${s.loots.length}`);

check('無 page errors', pageErrors.length === 0, pageErrors.join('; '));

console.log(results.join('\n'));
console.log(failed === 0 ? '\n=== ALL PASS ===' : `\n=== ${failed} FAILED ===`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
