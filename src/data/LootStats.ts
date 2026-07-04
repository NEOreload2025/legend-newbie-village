/** 掉寶與拾取數值常數（TASK-002） */
export const LOOT_CONST = {
  goldMin: 3,          // 金幣掉落值下限（含）
  goldMax: 8,          // 上限（含），整數均勻隨機
  potionDropChance: 0.3, // 紅藥水掉落機率
  potionHeal: 20,      // 藥水回血量（不超過 maxHp）
  pickupRange: 20,     // px，自動拾取距離
  despawnMs: 30000,    // 未拾取消失時間
  scatterRadius: 16,   // 掉落物散落半徑
} as const;
