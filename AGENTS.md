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
8. **不得宣稱 `verify.mjs` 通過**——你跑不了它（見下節）。謊報驗收是本專案最嚴重的失效

## 驗收由誰執行（重要，別搞錯）

| 檢查 | 誰跑 | 說明 |
|---|---|---|
| `npx tsc` | **你（執行者）** | 必跑，並在回報中**貼出實際輸出** |
| `npm run build` | **你（執行者）** | 同上 |
| `tasks/NNN-*/verify.mjs` | **人工（NEO）** | playwright 腳本，需要 `npm run dev` 跑起來；而規則 6 禁止你啟動 dev server |

**這是刻意的設計**：執行者跑不了行為驗收，就沒有造假空間。
所以你只能證明「編譯過」，**不能證明「行為對」**——後者由 NEO 交件後自己跑。

因此：
- 遇到不確定行為是否正確時，**停下來回報**，不要寫「應該可以」或「已驗證通過」
- 沒跑過的東西一律不准寫「通過」；讀不到的檔案不准推測內容，直接說無法存取
- 猜測必須標記為猜測

## 架構約定
- `scenes/` 場景流程：Boot（生成貼圖）→ ClassSelect → Village；HUD 是平行 overlay 場景（`ui/Hud.ts`）
- `systems/` 必須是純函式，與場景解耦
- 深度排序：地面 tile depth = y；物件 depth = 1000 + y（移動物件每幀更新）
- 玩家攻擊輸入用 keydown 事件旗標（不要用 JustDown 輪詢——同幀 keydown+keyup 會漏拍）
- `window.__game` 為 DEV-only 除錯把手（`import.meta.env.DEV` 保護），驗證腳本依賴它讀取場景狀態，不可移除

## 派工路由（給 NEO，非執行者）

從 Claude Code 直接派工（WSL 為主，timeout 至少 300 秒——NIM 冷啟動可能 >3 分鐘無輸出）：

```bash
opencode run --dir /home/hinet/projects/legend-fable5-test \
  --auto -m nvidia/z-ai/glm-5.2 \
  "讀 AGENTS.md 與 tasks/NNN-xxx/PROMPT.md，照 SPEC 實作。
   不得修改 tasks/ 下任何檔案。完成後跑 npx tsc 與 npm run build 並貼出實際輸出。
   verify.mjs 由人工執行，你不需要也不可以跑 dev server。"
```

| 任務性質 | 派給 | 為什麼 |
|---|---|---|
| **照 SPEC 實作**（預設） | `nvidia/z-ai/glm-5.2` | **NIM 免費**；實測紀律最好，明確禁止改動時真的不改——本專案成敗押在「執行者不去動 `tasks/`」上，紀律 > 聰明 |
| **SPEC 可能有洞**（新系統、規則沒想清楚） | `opencode-go/kimi-k2.7-code` | 最會抓出規格沒寫到的真問題。僅 go 有，計費但值得 |
| **UI / 場景這類乾淨活** | `opencode-go/gpt-5.6-luna` | TS 元件品質最好，但只做規格寫的、不多做一分 |

原則：**能走 NIM 就走 NIM**（免費，40 RPM），撞到限速或需要平行跑才用 `opencode-go`（美元計費）。

> **這個專案適合用便宜模型，是因為 `tasks/*/verify.mjs` 提供了可獨立重跑的驗收。**
> 沒有這層保護時，便宜執行者省下的額度會被除錯時間吃掉還倒賠。
