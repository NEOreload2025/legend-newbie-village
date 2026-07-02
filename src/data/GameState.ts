import type { ClassId } from './ClassStats';

/** 全域狀態單例：跨場景保存玩家選擇的職業（§3） */
class GameStateSingleton {
  private static instance: GameStateSingleton | null = null;

  /** 未選擇時 fallback 為戰士 */
  selectedClass: ClassId = 'warrior';

  static get(): GameStateSingleton {
    if (!GameStateSingleton.instance) {
      GameStateSingleton.instance = new GameStateSingleton();
    }
    return GameStateSingleton.instance;
  }
}

export const GameState = GameStateSingleton.get();
