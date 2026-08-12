# TASK-007 — 地圖擴展（東側荒野狩獵場）

> 遵循 `AGENTS.md` 慣例。驗收：`tasks/007-map-expansion/verify.mjs`（不可修改）。
> 座標與數值皆已固定，實作者不可自行更動，僅能決定視覺細節（貼圖畫法、顏色微調）。

## 0. 目標

把地圖從 20×16 擴大到 **30×16**，東側新增 10 欄（col 20–29）「荒野」區域，
新增地形貼圖、新障礙物（岩石）、以及沿用既有四種怪物定義的新出生點聚落。
**不新增任何新怪物種類**，只擴大既有怪物的活動範圍。

## 1. 地圖尺寸（`src/utils/IsoMap.ts`）

- `MAP_COLS`：20 → **30**（`MAP_ROWS` 維持 16 不變）
- `WORLD_WIDTH` / `WORLD_HEIGHT` / `MAP_OFFSET_X` **必須繼續由既有公式衍生**
  （`(MAP_COLS+MAP_ROWS)*(TILE_W/2)` 等），禁止改寫為寫死的像素常數
- `VillageScene` 既有的 `physics.world.setBounds` 與 `cam.setBounds` 已使用這些常數，
  **不需要也不應該修改** `VillageScene.ts` 裡這兩行

## 2. 新地形：荒野（`terrainAt`）

新增 `Terrain` 成員 `'wild'` 與常數：

```ts
export const WILD_AREA = { colMin: 20 } as const;
```

`terrainAt(col, row)` 判斷優先序（由高到低，**不可調換**，避免既有訓練區/道路退化）：

1. `training`（既有規則：`col >= TRAINING_AREA.colMin && row >= TRAINING_AREA.rowMin`）
2. `dirt`（既有道路規則：`ROAD_ROWS` / `ROAD_COLS`）—— 讓十字主幹道自然延伸進荒野
3. `wild`（`col >= WILD_AREA.colMin`）
4. 其餘 `grass`

## 3. 荒野貼圖（`BootScene.makeTiles` 的 `defs` 陣列新增一筆）

- `tile-wild`：乾燥荒地感，例如 `base 0x9c8a4e / edge 0x6f6035 / speckle 0xbcae7a`
  （沿用同一份程式碼路徑生成，不另寫新函式）

## 4. 新障礙物：岩石（`rock`）

- `MapObjectPlacement.kind` 型別新增 `'rock'`
- `BootScene` 新增 `makeRock()`：不規則灰色岩塊，約 30×24，程式繪製（無外部素材），
  命名慣例與 `makeHouse`/`makeTree` 一致，於 `create()` 內呼叫
- `VillageScene.buildObstacles()` 新增 `rock` 分支：
  `this.add.image(x, groundY + 6, 'rock').setOrigin(0.5, 1)`，
  碰撞 zone 呼叫 `addStaticBody(group, x, groundY, 24, 16)`（比照 tree 的做法，底部小範圍碰撞）

### 4.1 新增物件座標（加進 `MAP_OBJECTS`，不可更動既有 12 筆）

```
rock: (21,2) (24,1) (27,4) (23,7) (26,9) (29,5)
tree: (20,4) (25,2) (28,8) (22,9)
```

## 5. 新怪物出生點（沿用 `MonsterId`，加進 `MONSTER_SPAWNS`，不可更動既有 13 筆）

```
skeleton: (23,3) (26,6) (29,8)
deer:     (21,5) (24,8) (27,2)
slime:    (22,1) (28,4)
```

擴充後 `MONSTER_SPAWNS` 總數應為 13 + 8 = **21**
（slime ×8、chicken ×3、deer ×5、skeleton ×5）。
`MonsterDef`（`src/data/MonsterStats.ts`）與怪物行為**完全不變**，僅新增出生座標。

## 6. 硬性要求

- `npx tsc` 與 `npm run build` 零錯誤（根目錄跑整包）；禁用 `any`
- 不得修改：`tasks/**`、`src/systems/` 既有檔案、`VillageScene.ts` 的 `setBounds` 兩行
- 不啟動 dev server、不裝新依賴
- §1 的座標、§4/§5 的新增座標必須逐一對應實作，不可調整、合併或省略
- README「規格未明處決策」補上本次新增決策（若有）
