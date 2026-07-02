# SPEC — 熱血傳奇新手村 MVP（Legend Newbie Village）

> 本規格由現有成品逆向工程產出，作為「同一份 spec 給不同 AI 執行」的固定考題。
> 實作者請完全依照本文件，不足之處自行做合理決策並在 README 註明。

## 0. 總覽

瀏覽器單機 2D 等角（isometric）ARPG 原型：玩家選擇職業後進入新手村，
以鍵盤或滑鼠操作角色，攻擊訓練假人獲得經驗值並升級。
視覺風格致敬早期熱血傳奇（Legend of Mir 2），**所有圖形以程式生成，禁用外部素材檔**。

## 1. 技術棧（固定，不可替換）

- Phaser 3（Arcade Physics）
- TypeScript（strict）+ Vite
- 唯一 runtime dependency：phaser；devDependencies：typescript、vite
- `npm run dev` 一鍵啟動；`npm run build` = `tsc && vite build` 必須零錯誤通過

## 2. 畫面與場景流程

- 遊戲畫布 800×600，嵌入 `index.html` 的 `#game-container`
- 場景流程：**BootScene**（程式生成全部貼圖）→ **ClassSelectScene**（職業選擇）→ **VillageScene**（主玩法）
- VillageScene 相機：跟隨玩家（lerp 0.1）、zoom 1.1、限制在地圖邊界內

## 3. 職業系統

| 職業 | HP | ATK | DEF | 攻速(ms/次) | 主色 | 特性 |
|------|----|-----|-----|------------|------|------|
| 戰士 Warrior | 120 | 10 | 12 | 1000 | 紅 0xcc3333 | 高防高血 |
| 法師 Mage | 70 | 18 | 4 | 1200 | 藍 0x3366cc | 高傷低防，攻擊特效與傷害文字有專屬樣式 |
| 道士 Taoist | 90 | 11 | 7 | 1000 | 綠 0x33aa88 | 進場附帶一隻跟寵（見 §7） |

- 選擇方式：點擊職業面板 或 鍵盤 1 / 2 / 3
- 職業選擇以全域單例 GameState 保存；未選擇時 fallback 為戰士

## 4. 操作

- **WASD / 方向鍵**：八方向移動（斜向速度以 1/√2 正規化），移動速度 120 px/s
- **滑鼠左鍵點地面**：click-to-move，持續走向目標點，距離 < 6px 視為抵達；鍵盤輸入立即打斷並清除目標
- **空白鍵 / J**：攻擊——鎖定半徑 56px 內最近的存活假人；受職業攻速冷卻限制
- 玩家有 Arcade body（約 18×22、含 offset），與地圖障礙物碰撞、不可離開世界邊界

## 5. 戰鬥系統

- 傷害公式：`damage = max(1, round(atk − def × 0.5))`
- 命中時：目標頭上跳傷害數字（法師攻擊有差異化樣式）、攻擊者 sprite 縮放 1.2 彈跳 80ms、依職業播放攻擊視覺特效（彈道/斬擊等由實作者發揮）
- 擊殺回呼觸發經驗值發放

## 6. 訓練假人（Training Dummy）

- HP 30、DEF 2
- 受擊：紅色 tint 閃 100ms
- 死亡：碎片飛散特效、屍體半透明（alpha 0.25）變灰，**3 秒後原地重生**（滿血、外觀復原）
- 死亡狀態不可被選中為攻擊目標

## 7. 跟寵（僅道士）

- ATK 3、無 HP（不可被攻擊）
- 跟隨主人左後方（offset 約 −24, +16），以 lerp 0.08 平滑移動，附輕微上下漂浮動畫
- 每 2000ms 自動攻擊 60px 範圍內最近存活假人，共用 §5 傷害公式與特效
- 寵物擊殺**不**給玩家經驗值

## 8. 升級系統

- 每次擊殺假人：+25 XP（僅玩家親自擊殺）
- 升級門檻：`需求 XP = 當前等級 × 50`，溢出 XP 保留並可連升
- 每升 1 級：maxHP +10 且回滿、ATK +1、DEF +1
- 升級時角色位置播放升級特效與提示文字

## 9. HUD（固定於螢幕、不隨相機捲動）

- 左上：職業名（中英）、`Lv.X  HP cur/max  XP cur/need`
- HP 條（綠 140×10）與 XP 條（藍 140×10），即時反映比例
- 底部中央操作提示：`WASD / Arrows: Move  |  SPACE / J: Attack`

## 10. 等角地圖

- 20×16 格、菱形 tile 64×32，座標轉換 `x=(col−row)×32, y=(col+row)×16`
- 三種地形：草地、泥土路（十字主幹道）、訓練區（右下角區塊）
- 地圖元素：房屋與樹木（皆為靜態障礙物，玩家不可穿越）、訓練區放置複數訓練假人
- 玩家出生於村莊中心附近，出生點旁顯示「訓練場 →」指路文字
- 所有物件依 y 座標做 depth sort，維持正確前後遮擋

## 11. 程式結構要求

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

- 職業數值、XP 常數等 magic numbers 必須集中於 data/ 或常數宣告，禁止散落在場景邏輯裡
- 禁用 `any`；TypeScript strict 模式須通過

## 12. 驗收清單

- [ ] `npm install && npm run dev` 一次啟動成功
- [ ] `npm run build` 零錯誤
- [ ] 三職業可選、數值符合 §3 表格
- [ ] 鍵盤 + click-to-move 皆可移動，鍵盤可打斷滑鼠移動
- [ ] 攻擊假人有傷害數字/特效，假人 3 秒重生
- [ ] 道士有跟寵且自動助戰、寵擊殺不給 XP
- [ ] 升 1 級門檻 50 XP（= 2 次擊殺），屬性成長正確
- [ ] HUD 即時更新、固定於螢幕
- [ ] 無外部圖片/音效素材，全程式生成
