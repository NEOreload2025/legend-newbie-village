請完整實作 `tasks/007-map-expansion/SPEC.md` 描述的地圖擴展（東側荒野狩獵場）。

工作要求：
1. 先閱讀 `AGENTS.md`、`tasks/007-map-expansion/SPEC.md`，再閱讀 `src/utils/IsoMap.ts`、`src/scenes/BootScene.ts`、`src/scenes/VillageScene.ts`、`src/data/MonsterStats.ts`
2. 這是擴充任務：地圖尺寸、地形、障礙物、怪物出生點皆使用 SPEC 指定的精確數值/座標，不可自行更動、合併或省略；既有座標/常數不可刪改
3. 最後在專案根目錄執行 `npx tsc` 與 `npm run build`（不要對單一檔案跑 tsc），必須零錯誤
4. 禁止：修改 `tasks/`、修改 `src/systems/` 既有檔案、修改 `VillageScene.ts` 的 `setBounds` 兩行、啟動 dev server、安裝新依賴
5. 完成後條列摘要：改了哪些檔案、做了哪些 SPEC 未明說的決策
