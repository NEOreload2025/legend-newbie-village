export type MonsterId = 'slime' | 'chicken' | 'deer' | 'skeleton';
export type AggroMode = 'aggressive' | 'retaliate' | 'passive';

export interface MonsterDef {
  id: MonsterId;
  nameZh: string;
  textureKey: string; // 同 id
  hp: number;
  atk: number; // passive 怪填 0
  def: number;
  moveSpeed: number; // px/s
  aggroMode: AggroMode;
  aggroRange: number; // aggressive 用；retaliate 的脫戰距離固定 150
  attackRange: number;
  attackIntervalMs: number;
  xpReward: number;
  respawnMs: number;
  goldMin: number;
  goldMax: number;
  potionDropChance: number;
  /** Arcade 身體尺寸（寬高），用於 setSize/offset 貼齊腳底 */
  bodyW: number;
  bodyH: number;
}

export const MONSTER_DEFS: Record<MonsterId, MonsterDef> = {
  slime:    { id: 'slime',    nameZh: '史萊姆', textureKey: 'slime',    hp: 20, atk: 5, def: 1, moveSpeed: 40, aggroMode: 'aggressive', aggroRange: 90,  attackRange: 22, attackIntervalMs: 1500, xpReward: 40, respawnMs: 5000, goldMin: 3, goldMax: 8,  potionDropChance: 0.3, bodyW: 18, bodyH: 12 },
  chicken:  { id: 'chicken',  nameZh: '雞',     textureKey: 'chicken',  hp: 5,  atk: 0, def: 0, moveSpeed: 50, aggroMode: 'passive',    aggroRange: 0,   attackRange: 0,  attackIntervalMs: 0,    xpReward: 5,  respawnMs: 4000, goldMin: 1, goldMax: 2,  potionDropChance: 0,   bodyW: 12, bodyH: 8 },
  deer:     { id: 'deer',     nameZh: '鹿',     textureKey: 'deer',     hp: 25, atk: 3, def: 0, moveSpeed: 55, aggroMode: 'retaliate',  aggroRange: 0,   attackRange: 24, attackIntervalMs: 1500, xpReward: 15, respawnMs: 6000, goldMin: 2, goldMax: 4,  potionDropChance: 0.1, bodyW: 16, bodyH: 12 },
  skeleton: { id: 'skeleton', nameZh: '骷髏',   textureKey: 'skeleton', hp: 90, atk: 8, def: 2, moveSpeed: 55, aggroMode: 'aggressive', aggroRange: 100, attackRange: 24, attackIntervalMs: 1400, xpReward: 75, respawnMs: 8000, goldMin: 8, goldMax: 15, potionDropChance: 0.4, bodyW: 14, bodyH: 20 },
};

/** 通用怪物遊蕩行為常數（由原 SLIME_WANDER 併入） */
export const MONSTER_WANDER = {
  intervalMinMs: 2000,
  intervalMaxMs: 4000,
  durationMs: 1000,
  speedFactor: 0.5,
  radius: 80,
} as const;

/** 怪物受擊紅閃時間（ms） */
export const MONSTER_HIT_FLASH_MS = 100;

/** 被動怪被打後逃跑時間（ms）與速度倍率 */
export const MONSTER_FLEE_DURATION_MS = 1000;
export const MONSTER_FLEE_SPEED_FACTOR = 2;

/** retaliate 脫戰距離（px） */
export const MONSTER_RETALIATE_DEAGGRO = 150;
