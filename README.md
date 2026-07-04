# 熱血傳奇新手村 MVP — Legend Newbie Village

依 [SPEC.md](./SPEC.md) 實作的瀏覽器單機 2D 等角 ARPG 原型。
Phaser 3（Arcade Physics）+ TypeScript（strict）+ Vite，**所有圖形皆程式生成，零外部素材**。

## 快速開始

```bash
npm install
npm run dev     # 開發伺服器（預設 http://localhost:5173）
npm run build   # tsc + vite build，零錯誤
```

## 玩法

1. 職業選擇：點擊面板或按 `1`（戰士）/ `2`（法師）/ `3`(道士)
2. `WASD` / 方向鍵移動；滑鼠左鍵點地面 click-to-move（鍵盤輸入會立即打斷）
3. 沿「訓練場 →」指示往右下走，`SPACE` / `J` 攻擊訓練假人
4. 每親自擊殺假人 +25 XP，升級門檻 = 當前等級 × 50 XP；道士附帶自動助戰跟寵

## 程式結構

```
src/
  main.ts            # Phaser 遊戲設定與場景註冊
  scenes/            # BootScene / ClassSelectScene / VillageScene
  entities/          # Player / Pet / TrainingDummy
  systems/           # CombatSystem / LevelSystem（純函式，與場景解耦）
  data/              # ClassStats（職業數值表）/ GameState（全域狀態單例）
  ui/                # Hud
  utils/             # IsoMap / DamageText / VisualEffects
```

## 規格未明處的實作決策

- **HUD 實作為平行 overlay 場景**（`ui/Hud.ts`，由 VillageScene 啟動）：主相機 zoom 1.1
  會連帶縮放 scrollFactor(0) 的物件，改用獨立場景可保證 HUD 完全固定於螢幕、不受縮放影響。
  場景流程仍為 Boot → ClassSelect → Village，HUD 僅是疊加層。
- **攻擊傷害即時結算**，法師火球／道士符彈的彈道為純視覺特效（避免「彈道飛行中假人已死」的
  邊界情況）；戰士為目標位置的弧形斬擊特效。
- **攻擊特效樣式**：戰士＝白色斬擊弧、法師＝火球彈道＋橘色爆散、道士與跟寵＝青綠符彈。
  法師傷害數字為藍色大字附 `✦` 前綴（§3「專屬樣式」）。
- **障礙物碰撞**：房屋／樹木以「視覺圖 + 底部矩形靜態碰撞區」實作（等角物件僅底座擋路，
  貼近原版傳奇的遮擋走位手感）。
- **地圖佈局**：十字主幹道取 row 7–8 / col 9–10；訓練區為 col ≥ 14 且 row ≥ 10 的右下區塊，
  內置 5 座訓練假人；房屋 3 棟、樹木 9 棵散佈於草地。
- **假人不阻擋移動**（規格僅要求房屋與樹木為障礙物）。
- **寵物攻擊節奏**：以固定 2000ms 計時器觸發，範圍內無存活假人則該次跳過。
- **深度排序**：地面 tile 深度 = 其 y；所有物件深度 = 1000 + y，確保 tile 永遠在物件之下，
  物件間依 y 正確前後遮擋。

## TASK-001 史萊姆實作的規格未明處決策

- 引入 `src/entities/Attackable.ts` 定義 `Attackable` 介面與共用 `KillSource` / `DamageStyle` 型別，供 `TrainingDummy`、`Slime` 實作；`Player`/`Pet` 目標清單型別改為 `readonly Attackable[]`（避免重複定義並符合 §7 建議）。
- `Player.gainKillXp` 改為接受 `xpAmount` 參數，由 VillageScene 建置時的 callback 分別傳 `GAME_CONST.xpPerKill`（假人）與 `SLIME_CONST.xpReward`（史萊姆）。
- `Player.takeDamage` 內部處理 HP 扣除、emit、100ms 紅 tint 閃爍，以及 HP 歸零時的出生點復活 + 「復活 Revived」浮動文字；復活時一併清除 moveTarget 與 velocity。
- 史萊姆死亡視覺重用 `playDeathShards`（加綠 tint）+ 自訂 squash+alpha fade tween；待機 squash&stretch tween 於死亡時 pause、重生時 resume。
- `VillageScene` 內 `buildPlayer` 先於 `buildDummies`/`buildSlimes`，以便將 player 參考傳給 Slime（追擊與反擊需要）；pet 建立時組合 targets 陣列。
- 史萊姆出生/重生座標使用與假人相同的 `tileToWorld(...) + TILE_H/2 + 6`；重生強制 setPosition 回 birth 座標。
- 史萊姆貼圖生成細節（橢圓主體 + 高光 + 黑眼）依「約 22×16 綠色果凍」描述程式實作，無外部素材。
- 史萊姆僅與 obstacles collider（不與玩家/其他史萊姆），死亡期間 alive=false 不可被鎖定；脫離 aggro 範圍僅停止不回點。
- 所有新增數值嚴格放 `src/data/MonsterStats.ts`；未修改 `tasks/**`、未改 `src/systems/*`、無 `any`、無新 runtime dep。
