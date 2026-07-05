請完整實作 `tasks/006-combat-formula/SPEC.md` 描述的三擲骰戰鬥公式改制。

工作要求：
1. 先閱讀 `AGENTS.md`、`tasks/006-combat-formula/SPEC.md`，再閱讀 `src/systems/CombatSystem.ts`、`src/systems/LevelSystem.ts`、`src/systems/SaveSystem.ts`、`src/data/ClassStats.ts`、`src/data/MonsterStats.ts`、`src/entities/`（Player/Pet/Monster/TrainingDummy）
2. 這是核心改制：所有攻擊路徑（玩家/寵物/怪物攻擊玩家）都必須改走 `resolveAttack`，RNG 呼叫順序與次數嚴格照 SPEC（驗證腳本會 stub Math.random 做確定性斷言）
3. 最後在專案根目錄執行 `npx tsc` 與 `npm run build`（不要對單一檔案跑 tsc），必須零錯誤
4. 禁止：修改 `tasks/`；systems 目錄只能改 SPEC 指名的三檔；不啟動 dev server、不裝新依賴
5. 完成後條列摘要：改了哪些檔案、做了哪些 SPEC 未明說的決策
