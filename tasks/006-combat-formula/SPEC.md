# TASK-006 — 原版三擲骰戰鬥公式（Mir2/Crystal Combat Formula）

> 遵循 `AGENTS.md` 慣例。驗收：`tasks/006-combat-formula/verify.mjs`（不可修改）。
> 公式取自開源 Crystal M2（Suprcode/mir2）`Server/MirObjects/MapObject.cs` 的
> `GetArmour`/`GetAttackPower`/`Attacked`，按本專案尺度映射。

## 0. 目標

把「必中、定值傷害」改為原版的三擲骰：**命中判定 → 傷害擲骰 → 防禦擲骰**，
未命中或被防禦吃掉時顯示灰色 MISS。

## 1. 戰鬥核心（改寫 `src/systems/CombatSystem.ts`——本任務唯一解禁的 systems 檔）

保持純函式、與場景解耦。**擲骰順序與 RNG 呼叫次數必須嚴格如下**（驗證腳本以 stub 斷言）：

```ts
export interface StatRange { min: number; max: number }
export interface CombatantStats {
  atk: StatRange;   // MinDC..MaxDC
  def: StatRange;   // MinAC..MaxAC
  accuracy: number;
  agility: number;
}
export type AttackOutcome = { result: 'miss' | 'hit'; damage: number };

/** 區間整數擲骰：floor(rng() * (max - min + 1)) + min；max < min 時取 min */
export function rollRange(range: StatRange, rng: () => number): number;

/**
 * 完整攻擊判定。RNG「恰好、依序」呼叫 3 次——即使第 1 骰已判定 miss，
 * 仍須照樣消耗第 2、3 骰（結果不變），讓 RNG 序列固定可測：
 * 1) 命中骰：dodge = floor(rng() * (defender.agility + 1))；dodge > attacker.accuracy → miss
 * 2) 傷害骰：damage = rollRange(attacker.atk, rng)
 * 3) 防禦骰：armour = rollRange(defender.def, rng)
 * 未命中 → { result:'miss', damage: 0 }
 * armour >= damage → { result:'miss', damage: 0 }（被防禦硬吃）
 * 否則 → { result:'hit', damage: damage - armour }（此時必然 ≥ 1）
 */
export function resolveAttack(attacker: CombatantStats, defender: CombatantStats, rng?: () => number): AttackOutcome;
```

- `rng` 預設 `Math.random`
- 舊 `computeDamage` 刪除；`findNearestTarget` 保留不動

## 2. 屬性改制（`src/data/ClassStats.ts`、`src/data/MonsterStats.ts`）

職業（HP／攻速／主色／特性不變）：

| 職業 | atk | def | accuracy | agility |
|------|-----|-----|----------|---------|
| 戰士 | 8–12 | 2–5 | 13 | 12 |
| 法師 | 14–22 | 0–1 | 10 | 10 |
| 道士 | 9–13 | 1–3 | 12 | 15 |

怪物（其餘欄位不變）：

| id | atk | def | accuracy | agility |
|----|-----|-----|----------|---------|
| slime | 4–6 | 0–2 | 10 | 5 |
| chicken | 0–0 | 0–0 | 3 | 15 |
| deer | 2–4 | 0–0 | 8 | 8 |
| skeleton | 7–10 | 1–3 | 13 | 5 |

- 訓練假人：def 1–3、agility 0（永遠會被打中）、accuracy 0
- 寵物：atk 2–4、accuracy 10、agility 10
- 升級成長改為：maxHP +10 回滿、atk.min +1 且 atk.max +1、def.max +1（accuracy/agility 不變）
- `LevelState` 的 atk/def 型別改為 `StatRange`（`src/systems/LevelSystem.ts` **允許同步修改型別與成長邏輯**，
  但升級門檻公式與溢出邏輯不得變）
- 存檔（SaveSystem）欄位同步：**允許修改 `src/systems/SaveSystem.ts`** 的 SaveData 讓 atk/def 存範圍；
  讀到舊格式（number）視為無效存檔回傳 null 即可

## 3. 表現層

- 所有攻擊（玩家/寵物/怪物）改走 `resolveAttack`
- `miss` → 目標頭上灰色「MISS」浮動字（樣式仿傷害數字，灰 #aaaaaa）；不觸發紅閃
- `hit` → 照舊傷害數字/紅閃/擊殺流程
- ClassSelect 面板數值顯示改為 `ATK 8-12`、`DEF 2-5` 格式

## 4. 硬性要求

- `npx tsc` 與 `npm run build` 零錯誤（根目錄跑整包）；禁用 `any`
- 不得修改：`tasks/**`；systems 僅允許動 CombatSystem.ts / LevelSystem.ts / SaveSystem.ts 中本 SPEC 指名的部分
- 不啟動 dev server、不裝新依賴
- Player 需暴露 `combatStats`（CombatantStats，即時反映等級成長）；Monster 需暴露 `combatStats`（驗證腳本讀取）
- README「規格未明處決策」補上新決策（若有）
