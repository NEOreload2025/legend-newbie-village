/** 怪物數值常數（§1 of slime task） */
export const SLIME_CONST = {
  hp: 20,
  atk: 5,
  def: 1,
  moveSpeed: 40, // px/s
  aggroRange: 90, // px，開始追擊
  attackRange: 22, // px，停下攻擊
  attackIntervalMs: 1500,
  xpReward: 40, // 玩家親自擊殺才給
  respawnMs: 5000,
  hitFlashMs: 100,
} as const;
