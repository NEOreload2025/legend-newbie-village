# TASK-001 — 史萊姆怪物（Slime Monster）

> 實作者：依本文件實作，不足之處遵循 `AGENTS.md` 與根目錄 `SPEC.md` 的既有慣例。
> 驗收：`tasks/001-slime-monster/verify.mjs`（不可修改）。

## 0. 目標

新增會反擊的史萊姆怪物：待機 → 追擊玩家 → 近身攻擊。
玩家與寵物可擊殺史萊姆；玩家擊殺得 40 XP；玩家 HP 歸零時於出生點復活。

## 1. 數值（新檔 `src/data/MonsterStats.ts`，禁止散落）

```ts
export const SLIME_CONST = {
  hp: 20,
  atk: 5,
  def: 1,
  moveSpeed: 40,        // px/s
  aggroRange: 90,       // px，開始追擊
  attackRange: 22,      // px，停下攻擊
  attackIntervalMs: 1500,
  xpReward: 40,         // 玩家親自擊殺才給
  respawnMs: 5000,
  hitFlashMs: 100,
} as const;
```

## 2. 出生位置（`src/utils/IsoMap.ts` 新增 `SLIME_TILES`）

tiles `(3,9)`、`(6,10)`、`(3,13)`，世界座標同假人模式（tile 中心 groundY + 6）。
死亡後於**原出生 tile** 重生。

## 3. 外觀（BootScene 程式生成，禁用外部素材）

- 貼圖 key `'slime'`：約 22×16 綠色果凍半圓（主體 0x55cc44 系）、頂部高光、兩顆黑眼睛
- 待機時輕微 squash & stretch（scale tween 循環）
- 受擊紅閃 `hitFlashMs`；死亡：粒子飛散 + 縮扁淡出，重生時外觀完全復原

## 4. 行為（新檔 `src/entities/Slime.ts`）

- `Phaser.Physics.Arcade.Sprite`，body 約 18×12 貼齊腳底，與障礙物碰撞、不可離開世界邊界
- 距玩家 ≤ `aggroRange`：以 `moveSpeed` 追向玩家
- 距玩家 > `aggroRange`：停止移動（不需回出生點）
- 距玩家 ≤ `attackRange`：停止移動，每 `attackIntervalMs` 攻擊玩家一次
  - 傷害共用 `CombatSystem.computeDamage(SLIME_CONST.atk, player.def)`
  - 玩家頭上顯示傷害數字（normal 樣式）＋玩家紅 tint 閃 100ms
- 死亡期間：不移動、不攻擊、**不可被選中為攻擊目標**
- depth = 1000 + y，每幀更新

## 5. 玩家變更（`src/entities/Player.ts`）

- 新增 `takeDamage(amount: number)`：HP 扣除（最低 0）、emit `PLAYER_EVENT_STATS_CHANGED`
- HP 歸零 → 死亡處理：傳送回出生點（`PLAYER_SPAWN_TILE` 對應世界座標）、HP 回滿、
  再 emit 事件、角色位置顯示「復活 Revived」浮動文字
- `gainKillXp` 改為 `gainKillXp(xpAmount: number)`：假人 +25（沿用 `GAME_CONST.xpPerKill`）、
  史萊姆 +40（`SLIME_CONST.xpReward`）
- 攻擊目標由「假人」擴為「假人 + 史萊姆」，鎖定規則不變（56px 內最近存活者）

## 6. 寵物變更（`src/entities/Pet.ts`）

- 自動攻擊目標同樣擴為「假人 + 史萊姆」；寵物擊殺一律不給 XP（既有規則）

## 7. 共同介面

- 定義 `Attackable` 介面（建議放 `src/entities/Attackable.ts`）：
  `{ x, y, alive, receiveAttack(atk, source, style): number }`
- `TrainingDummy` 與 `Slime` 皆實作；`Player`/`Pet` 的目標清單型別改用 `Attackable`

## 8. 場景整合（`src/scenes/VillageScene.ts`）

- create 時生成 3 隻史萊姆，存於 `this.slimes` 陣列（驗證腳本會讀取，命名必須是 `slimes`）
- update 呼叫每隻 `slime.update(time)`
- `collider(slime, obstacles)`

## 9. 硬性要求

- `npx tsc` 與 `npm run build` 零錯誤
- 禁用 `any`
- 不得修改：`tasks/**`、根目錄 `SPEC.md`、`src/systems/LevelSystem.ts`、`src/systems/CombatSystem.ts`
- 不要啟動 dev server、不要安裝新依賴
- README.md 的「規格未明處的實作決策」段落補上你做的新決策（若有）
