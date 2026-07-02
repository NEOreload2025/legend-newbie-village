/** 戰鬥系統：純函式，與場景解耦（§5） */

/** 傷害公式：damage = max(1, round(atk − def × 0.5)) */
export function computeDamage(atk: number, def: number): number {
  return Math.max(1, Math.round(atk - def * 0.5));
}

export interface Positioned {
  x: number;
  y: number;
}

/**
 * 從候選目標中找出 range 內最近的一個；找不到回傳 null。
 * alive 判定由呼叫端以 filter 先行處理或傳入 isValid。
 */
export function findNearestTarget<T extends Positioned>(
  from: Positioned,
  candidates: readonly T[],
  range: number,
  isValid: (t: T) => boolean,
): T | null {
  let best: T | null = null;
  let bestDistSq = range * range;
  for (const c of candidates) {
    if (!isValid(c)) continue;
    const dx = c.x - from.x;
    const dy = c.y - from.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = c;
    }
  }
  return best;
}
