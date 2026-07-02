/** 職業識別 */
export type ClassId = 'warrior' | 'mage' | 'taoist';

/** 職業數值定義（§3） */
export interface ClassStats {
  id: ClassId;
  /** 中文名 */
  nameZh: string;
  /** 英文名 */
  nameEn: string;
  hp: number;
  atk: number;
  def: number;
  /** 攻擊冷卻（ms/次） */
  attackCooldownMs: number;
  /** 主色 */
  color: number;
  /** 特性描述（職業選擇畫面用） */
  traitZh: string;
}

export const CLASS_STATS: Record<ClassId, ClassStats> = {
  warrior: {
    id: 'warrior',
    nameZh: '戰士',
    nameEn: 'Warrior',
    hp: 120,
    atk: 10,
    def: 12,
    attackCooldownMs: 1000,
    color: 0xcc3333,
    traitZh: '高防高血，近戰肉盾',
  },
  mage: {
    id: 'mage',
    nameZh: '法師',
    nameEn: 'Mage',
    hp: 70,
    atk: 18,
    def: 4,
    attackCooldownMs: 1200,
    color: 0x3366cc,
    traitZh: '高傷低防，火球攻擊',
  },
  taoist: {
    id: 'taoist',
    nameZh: '道士',
    nameEn: 'Taoist',
    hp: 90,
    atk: 11,
    def: 7,
    attackCooldownMs: 1000,
    color: 0x33aa88,
    traitZh: '召喚跟寵協同作戰',
  },
};

export const CLASS_ORDER: readonly ClassId[] = ['warrior', 'mage', 'taoist'];

/** 玩家與戰鬥相關常數（§4、§5、§8） */
export const GAME_CONST = {
  /** 移動速度 px/s */
  moveSpeed: 120,
  /** click-to-move 抵達判定距離 px */
  arriveDistance: 6,
  /** 玩家攻擊鎖定半徑 px */
  attackRange: 56,
  /** 每次親自擊殺假人的經驗值 */
  xpPerKill: 25,
  /** 升級門檻：需求 XP = 當前等級 × 此值 */
  xpPerLevel: 50,
  /** 每級成長 */
  levelUpGain: { maxHp: 10, atk: 1, def: 1 },
} as const;

/** 訓練假人常數（§6） */
export const DUMMY_CONST = {
  hp: 30,
  def: 2,
  /** 死亡後重生時間 ms */
  respawnMs: 3000,
  /** 受擊紅閃時間 ms */
  hitFlashMs: 100,
  /** 屍體透明度 */
  corpseAlpha: 0.25,
} as const;

/** 跟寵常數（§7） */
export const PET_CONST = {
  atk: 3,
  /** 自動攻擊間隔 ms */
  attackIntervalMs: 2000,
  /** 自動攻擊範圍 px */
  attackRange: 60,
  /** 跟隨主人左後方偏移 */
  followOffset: { x: -24, y: 16 },
  /** 跟隨 lerp 係數 */
  followLerp: 0.08,
} as const;
