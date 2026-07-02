import { GAME_CONST } from '../data/ClassStats';

/** 升級系統：純函式，與場景解耦（§8） */

export interface LevelState {
  level: number;
  xp: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
}

/** 升級門檻：需求 XP = 當前等級 × 50 */
export function xpNeeded(level: number): number {
  return level * GAME_CONST.xpPerLevel;
}

export interface GainXpResult {
  state: LevelState;
  /** 本次共升了幾級（0 = 未升級） */
  levelsGained: number;
}

/**
 * 發放經驗值；溢出 XP 保留並可連升。
 * 每升 1 級：maxHP +10 且回滿、ATK +1、DEF +1。
 */
export function gainXp(state: LevelState, amount: number): GainXpResult {
  const next: LevelState = { ...state, xp: state.xp + amount };
  let levelsGained = 0;
  while (next.xp >= xpNeeded(next.level)) {
    next.xp -= xpNeeded(next.level);
    next.level += 1;
    next.maxHp += GAME_CONST.levelUpGain.maxHp;
    next.hp = next.maxHp;
    next.atk += GAME_CONST.levelUpGain.atk;
    next.def += GAME_CONST.levelUpGain.def;
    levelsGained += 1;
  }
  return { state: next, levelsGained };
}
