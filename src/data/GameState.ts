import type { ClassId } from './ClassStats';

/** 全域狀態單例：跨場景保存玩家選擇的職業（§3）與繼續遊戲旗標 */
class GameStateSingleton {
  private static instance: GameStateSingleton | null = null;

  /** 未選擇時 fallback 為戰士 */
  selectedClass: ClassId = 'warrior';

  /** 是否繼續上一局存檔（ClassSelect 設定 → Village 消費後重置） */
  continueRun: boolean = false;

  static get(): GameStateSingleton {
    if (!GameStateSingleton.instance) {
      GameStateSingleton.instance = new GameStateSingleton();
    }
    return GameStateSingleton.instance;
  }
}

export const GameState = GameStateSingleton.get();
