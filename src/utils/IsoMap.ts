/** 等角地圖工具（§10）：30×16 格（TASK-007 東側荒野擴展）、菱形 tile 64×32 */
import type { MonsterId } from '../data/MonsterStats';

export const MAP_COLS = 30;
export const MAP_ROWS = 16;
export const TILE_W = 64;
export const TILE_H = 32;

/** 世界座標偏移：把等角座標平移到正值範圍 */
export const MAP_OFFSET_X = (MAP_ROWS - 1) * (TILE_W / 2) + TILE_W / 2; // 512
export const MAP_OFFSET_Y = 64; // 上方留空間給樹木/房屋高度

/** 世界（地圖）尺寸 */
export const WORLD_WIDTH = (MAP_COLS + MAP_ROWS) * (TILE_W / 2); // 1152
export const WORLD_HEIGHT = (MAP_COLS + MAP_ROWS - 1) * (TILE_H / 2) + TILE_H + MAP_OFFSET_Y; // 656

export type Terrain = 'grass' | 'dirt' | 'training' | 'wild';

/** 座標轉換：x=(col−row)×32, y=(col+row)×16（再加世界偏移） */
export function tileToWorld(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2) + MAP_OFFSET_X,
    y: (col + row) * (TILE_H / 2) + MAP_OFFSET_Y,
  };
}

/** 泥土路：十字主幹道（橫向 row 7–8、縱向 col 9–10） */
const ROAD_ROWS = [7, 8] as const;
const ROAD_COLS = [9, 10] as const;

/** 訓練區：右下角區塊 */
export const TRAINING_AREA = { colMin: 14, rowMin: 10 } as const;

/** 荒野狩獵場（TASK-007）：地圖東側新增 10 欄 */
export const WILD_AREA = { colMin: 20 } as const;

export function terrainAt(col: number, row: number): Terrain {
  if (col >= TRAINING_AREA.colMin && row >= TRAINING_AREA.rowMin) return 'training';
  if (ROAD_ROWS.includes(row as (typeof ROAD_ROWS)[number])) return 'dirt';
  if (ROAD_COLS.includes(col as (typeof ROAD_COLS)[number])) return 'dirt';
  if (col >= WILD_AREA.colMin) return 'wild';
  return 'grass';
}

export interface MapObjectPlacement {
  kind: 'house' | 'tree' | 'rock';
  col: number;
  row: number;
}

/** 房屋與樹木擺放（皆為靜態障礙物，避開道路與訓練區） */
export const MAP_OBJECTS: readonly MapObjectPlacement[] = [
  { kind: 'house', col: 5, row: 4 },
  { kind: 'house', col: 13, row: 3 },
  { kind: 'house', col: 4, row: 11 },
  { kind: 'tree', col: 2, row: 2 },
  { kind: 'tree', col: 8, row: 2 },
  { kind: 'tree', col: 16, row: 2 },
  { kind: 'tree', col: 18, row: 6 },
  { kind: 'tree', col: 2, row: 6 },
  { kind: 'tree', col: 6, row: 13 },
  { kind: 'tree', col: 1, row: 14 },
  { kind: 'tree', col: 12, row: 12 },
  { kind: 'tree', col: 12, row: 15 },
  // TASK-007 荒野狩獵場（col 20–29）新增岩石與樹木
  { kind: 'rock', col: 21, row: 2 },
  { kind: 'rock', col: 24, row: 1 },
  { kind: 'rock', col: 27, row: 4 },
  { kind: 'rock', col: 23, row: 7 },
  { kind: 'rock', col: 26, row: 9 },
  { kind: 'rock', col: 29, row: 5 },
  { kind: 'tree', col: 20, row: 4 },
  { kind: 'tree', col: 25, row: 2 },
  { kind: 'tree', col: 28, row: 8 },
  { kind: 'tree', col: 22, row: 9 },
];

/** 訓練假人位置（訓練區內） */
export const DUMMY_TILES: readonly { col: number; row: number }[] = [
  { col: 15, row: 11 },
  { col: 17, row: 11 },
  { col: 15, row: 13 },
  { col: 17, row: 13 },
  { col: 19, row: 15 },
];

/** 玩家出生點：村莊中心附近（十字路口旁） */
export const PLAYER_SPAWN_TILE = { col: 8, row: 6 } as const;

/** 怪物出生點（TASK-005）：以 MONSTER_DEFS 差異化，含 slime×6、chicken×3、deer×2、skeleton×2。
 * 位置避開房屋/樹木碰撞區。
 */
export const MONSTER_SPAWNS: readonly { id: MonsterId; col: number; row: number }[] = [
  // slime ×6（原 SLIME_TILES 沿用）
  { id: 'slime', col: 3, row: 9 },
  { id: 'slime', col: 6, row: 10 },
  { id: 'slime', col: 3, row: 13 },
  { id: 'slime', col: 15, row: 2 },
  { id: 'slime', col: 17, row: 3 },
  { id: 'slime', col: 15, row: 5 },
  // chicken ×3（村莊附近）
  { id: 'chicken', col: 7, row: 4 },
  { id: 'chicken', col: 12, row: 5 },
  { id: 'chicken', col: 6, row: 9 },
  // deer ×2
  { id: 'deer', col: 3, row: 5 },
  { id: 'deer', col: 18, row: 9 },
  // skeleton ×2（地圖東西兩側）
  { id: 'skeleton', col: 1, row: 9 },
  { id: 'skeleton', col: 19, row: 9 },
  // TASK-007 荒野狩獵場（col 20–29）新增出生點：沿用既有 MonsterId，不新增怪物種類
  { id: 'skeleton', col: 23, row: 3 },
  { id: 'skeleton', col: 26, row: 6 },
  { id: 'skeleton', col: 29, row: 8 },
  { id: 'deer', col: 21, row: 5 },
  { id: 'deer', col: 24, row: 8 },
  { id: 'deer', col: 27, row: 2 },
  { id: 'slime', col: 22, row: 1 },
  { id: 'slime', col: 28, row: 4 },
];
