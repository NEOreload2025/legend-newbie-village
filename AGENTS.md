# Agent 工作規範（本專案所有 coding agent 必讀）

## 專案概觀
Phaser 3 + TypeScript (strict) + Vite 的等角 ARPG 原型。規格見 `SPEC.md`，實作決策見 `README.md`。

## 硬性規則
1. `npx tsc` 與 `npm run build` 必須零錯誤通過後才算完成
2. 禁用 `any`；TypeScript strict 模式
3. 所有數值常數（HP/ATK/範圍/時間…）集中於 `src/data/`，禁止散落在場景或實體邏輯裡
4. 所有圖形以程式生成（BootScene 的 Graphics → generateTexture），禁用外部素材檔
5. **禁止修改 `tasks/` 目錄下的任何檔案**（SPEC 與驗證腳本是驗收基準）
6. 禁止新增 runtime dependency（唯一 runtime dep 是 phaser）；禁止啟動 dev server
7. 註解與 commit 訊息風格比照既有程式碼（繁中註解、英文 commit）

## 架構約定
- `scenes/` 場景流程：Boot（生成貼圖）→ ClassSelect → Village；HUD 是平行 overlay 場景（`ui/Hud.ts`）
- `systems/` 必須是純函式，與場景解耦
- 深度排序：地面 tile depth = y；物件 depth = 1000 + y（移動物件每幀更新）
- 玩家攻擊輸入用 keydown 事件旗標（不要用 JustDown 輪詢——同幀 keydown+keyup 會漏拍）
- `window.__game` 為 DEV-only 除錯把手（`import.meta.env.DEV` 保護），驗證腳本依賴它讀取場景狀態，不可移除
