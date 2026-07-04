# TASK-002 — 掉寶與拾取（Loot & Pickup）

> 遵循 `AGENTS.md` 與根目錄 `SPEC.md` 慣例。驗收：`tasks/002-loot-pickup/verify.mjs`（不可修改）。

## 0. 目標

史萊姆死亡掉落金幣（必掉）與紅藥水（機率掉）；玩家走近自動拾取；
金幣累積顯示於 HUD，藥水立即回血。假人不掉落。

## 1. 數值（新檔 `src/data/LootStats.ts`）

```ts
export const LOOT_CONST = {
  goldMin: 3,          // 金幣掉落值下限（含）
  goldMax: 8,          // 上限（含），整數均勻隨機
  potionDropChance: 0.3, // 紅藥水掉落機率
  potionHeal: 20,      // 藥水回血量（不超過 maxHp）
  pickupRange: 20,     // px，自動拾取距離
  despawnMs: 30000,    // 未拾取消失時間
  scatterRadius: 16,   // 掉落物散落半徑
} as const;
```

## 2. 掉落規則

- **史萊姆死亡**（不論被玩家或寵物擊殺）：
  - 必掉 1 枚金幣，價值 `goldMin..goldMax` 整數均勻隨機
  - `potionDropChance` 機率額外掉 1 瓶紅藥水
- 掉落位置：死亡點為中心、`scatterRadius` 內隨機散落
- 假人死亡不掉落
- **隨機數一律使用 `Math.random()`**（驗收腳本會 stub 它做確定性測試）

## 3. 掉落物實體（新檔 `src/entities/LootDrop.ts`）

- `Phaser.GameObjects.Sprite`，type `'gold' | 'potion'`，gold 帶 `value: number`
- 出現動畫：從死亡點彈跳落地（小 tween）；depth = 1000 + y
- `despawnMs` 後淡出消失（未拾取）
- 被拾取：播放上飄淡出的小動畫後銷毀

## 4. 拾取（VillageScene / Player）

- 每幀檢查：玩家與掉落物距離 ≤ `pickupRange` → 自動拾取
- 金幣：`player.gold += value`，玩家頭上浮動文字 `+N G`（金色）
- 藥水：立即使用，`hp = min(maxHp, hp + potionHeal)`，浮動文字 `+N HP`（綠色，N 為實際回復量）；HP 全滿仍會拾取消耗
- 拾取後 emit `PLAYER_EVENT_STATS_CHANGED`

## 5. 玩家與 HUD

- `Player` 新增 `gold: number` 欄位（初始 0）
- HUD 左上新增金幣顯示：文字 `Gold: N`（金色 #ffd766），位於 XP 條下方，即時更新

## 6. 貼圖（BootScene 程式生成）

- `'loot-gold'`：約 10×10 金幣（金色圓餅 + 高光 + 深色邊）
- `'loot-potion'`：約 10×14 紅藥水瓶（紅色瓶身 + 瓶頸 + 高光）

## 7. 場景整合（VillageScene）

- 掉落物存於 `this.loots` 陣列（**命名必須是 `loots`**，驗證腳本讀取），拾取/消失時移除
- Slime 的擊殺回呼中觸發掉落生成

## 8. 硬性要求

- `npx tsc` 與 `npm run build` 零錯誤；禁用 `any`
- 不得修改：`tasks/**`、`src/systems/**`
- 不啟動 dev server、不裝新依賴
- README「規格未明處決策」段落補上新決策（若有）
