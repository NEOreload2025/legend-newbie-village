/** 等角地圖工具（§10）：20×16 格、菱形 tile 64×32 */

export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const TILE_W = 64;
export const TILE_H = 32;

/** 世界座標偏移：把等角座標平移到正值範圍 */
export const MAP_OFFSET_X = (MAP_ROWS - 1) * (TILE_W / 2) + TILE_W / 2; // 512
export const MAP_OFFSET_Y = 64; // 上方留空間給樹木/房屋高度

/** 世界（地圖）尺寸 */
export const WORLD_WIDTH = (MAP_COLS + MAP_ROWS) * (TILE_W / 2); // 1152
export const WORLD_HEIGHT = (MAP_COLS + MAP_ROWS - 1) * (TILE_H / 2) + TILE_H + MAP_OFFSET_Y; // 656

export type Terrain = 'grass' | 'dirt' | 'training';

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

export function terrainAt(col: number, row: number): Terrain {
  if (col >= TRAINING_AREA.colMin && row >= TRAINING_AREA.rowMin) return 'training';
  if (ROAD_ROWS.includes(row as (typeof ROAD_ROWS)[number])) return 'dirt';
  if (ROAD_COLS.includes(col as (typeof ROAD_COLS)[number])) return 'dirt';
  return 'grass';
}

export interface MapObjectPlacement {
  kind: 'house' | 'tree';
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
