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

## TASK-002 掉寶與拾取的規格未明處決策

- `Player` 新增公開欄位 `gold: number = 0` 與 `addGold(value)` / `heal(amount)` 輔助方法：集中 emit `PLAYER_EVENT_STATS_CHANGED` 與 HP 計算；雖然 SPEC 描述使用 `player.gold +=`，但封裝可避免重複 emit 邏輯並與既有 `takeDamage`/`gainKillXp` 模式一致。
- 掉落生成位置散落使用極座標等效的 `[-r,r]` 軸向偏移（非嚴格圓形均勻），簡單且符合「散落」直覺。
- 拾取浮動文字新增 `showPickupText` 於 `utils/DamageText.ts`（重用既有跳字 tween 模式），金幣用 `#ffd766`、藥水用 `#33ff66`（綠）；即使藥水回血 0（HP 滿）仍顯示 `+0 HP` 並消耗。
- `LootDrop` 不使用 Arcade Physics（純視覺 Sprite + 每幀手動距離檢查），符合「自動拾取」不需碰撞需求，也避免不必要 body。
- 掉落物出現彈跳使用 `Back.easeOut` 小縮放+y 補間；拾取/消失使用上飄 alpha fade 200~280ms，無額外音效（與專案無音效慣例一致）。
- `VillageScene` 的 `loots` 陣列於 `create()` 重置，並在 `updateLoots()` 使用 filter 同時清理無效與執行拾取；despawn 由 `LootDrop` 內部 `delayedCall` + tween destroy 負責，filter 自然移除。
- 史萊姆 onKilled callback 內同時處理 XP（條件）與 `spawnLoot`（無條件），位置取死亡時 `slime.x/y`（閉包於執行時已初始化）。
- HUD 金幣文字置於 XP bar 下方 y=90，與既有 bar 座標不重疊；使用與 XP/HP 相同事件驅動 refresh。
- 所有常數置於新增 `src/data/LootStats.ts`，Boot 貼圖生成集中 `makeLoot()`；未碰 `src/systems/`、未改 tasks/、零 any、build 通過。

## TASK-003 遊蕩怪物與刷怪區的規格未明處決策

- 遊蕩邏輯完全實作於 `Slime` 內（update 內以時間戳 `nextWanderTime`/`wanderEndTime` + 單位方向向量控制），未動 `src/systems/` 且與 chase/attack 優先序在同一 update 分支處理。
- 方向選擇採「隨機嘗試 12 次 → 預測 stepDist 後是否超出 radius → fallback 朝 birth 方向」；使用 `setVelocity(unit * speedFactor)` 而非 moveTo（便於定時中斷與碰撞相容）。
- 進入 aggro/attack 範圍時立即清 `wanderEndTime` 並重設 `nextWanderTime = now + random interval`，符合「進入追擊立即中斷遊走」；離開後需等完整間隔才再遊走。
- 首次遊走與重生後皆延後一個隨機 interval 才開始（nextWanderTime 初始/重設為 0 時由 update 觸發延後），避免出生即移動。
- 死亡時清遊蕩狀態（die 內），重生時重設（respawn 內），讓重生後的史萊姆恢復閒置遊蕩行為。
- squash idleTween 於遊走期間持續運作（僅視覺）；遊走不影響深度、碰撞、onKilled 回呼、掉寶等既有行為。
- 追加 SLIME_TILES 後總數 6 隻，新 3 隻出生點使用既有 `tileToWorld + TILE_H/2 + 6` 公式，spawn 與 radius 檢查皆以 birth 座標為準。
- 所有數值嚴格置 `src/data/MonsterStats.ts` 的 SLIME_WANDER；無 hardcode、無 any、零改 tasks/ 與 systems/。

## TASK-004 存檔系統的規格未明處決策

- Continue 提示區塊置於畫面下方（約 y = height-95），採用金色邊框 `#ffd766` 的半透明矩形 + 兩行文字（粗體「繼續遊戲 Continue」＋職業中文名 `Lv.X` + `Gold N` 摘要），風格與職業面板一致；無存檔時完全不渲染該區塊。
- `GameState` 直接在 singleton class 新增公開 `continueRun: boolean = false`（與 selectedClass 同層級），作為 ClassSelect 設定與 Village 消費的跨場景旗標。
- `loadGame` 除 try/catch 外，嚴格驗證 classId 為 'warrior'|'mage'|'taoist' 其一，以及七個數值欄位均為 number；缺漏或型別錯誤一律回 null。
- 存檔 listener 於 Player 建立後立即訂閱（使用閉包 saveHandler），continue 套用時的 emit 會一併觸發 save（確保載入後 localStorage 與狀態一致）；新局則於首次觸發 stats-changed（拾取/擊殺等）才寫入。
- 繼續套用直接替換 `this.player.stats = { level, xp, ... }`（類似 gainXp 模式）與 `this.player.gold = `，再 emit 讓 HUD 即時顯示正確數值；套用完成後無條件將 continueRun 重置為 false。
- 鍵盤 Continue 使用 'keydown-C'（與 SPACE/J/ONE 事件風格一致），相容 playwright 的 page.keyboard.press('c')。
- 除新增 `src/systems/SaveSystem.ts` 外，未修改 `src/systems/` 任何既有檔案；VillageScene 內的存檔訂閱與 ClassSelect 的 UI/流程決策均符合「純函式 + 場景解耦」原則；未改 tasks/、零 any、所有數值仍來自既有 data/。
