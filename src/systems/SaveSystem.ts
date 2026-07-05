import type { ClassId } from '../data/ClassStats';

export const SAVE_KEY = 'legend-newbie-save-v1';

export interface SaveData {
  classId: ClassId;
  level: number;
  xp: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  gold: number;
}

/** 將存檔資料 JSON 寫入 localStorage（try 保護） */
export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // 忽略 localStorage 不可用或 quota 錯誤
  }
}

/** 讀取並驗證存檔；任何解析失敗或欄位缺漏/型別錯誤皆回傳 null */
export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      data &&
      typeof data === 'object' &&
      'classId' in data &&
      'level' in data &&
      'xp' in data &&
      'maxHp' in data &&
      'hp' in data &&
      'atk' in data &&
      'def' in data &&
      'gold' in data
    ) {
      const d = data as Record<string, unknown>;
      const validClass = d.classId === 'warrior' || d.classId === 'mage' || d.classId === 'taoist';
      const allNum =
        typeof d.level === 'number' &&
        typeof d.xp === 'number' &&
        typeof d.maxHp === 'number' &&
        typeof d.hp === 'number' &&
        typeof d.atk === 'number' &&
        typeof d.def === 'number' &&
        typeof d.gold === 'number';
      if (validClass && allNum) {
        return {
          classId: d.classId as ClassId,
          level: d.level as number,
          xp: d.xp as number,
          maxHp: d.maxHp as number,
          hp: d.hp as number,
          atk: d.atk as number,
          def: d.def as number,
          gold: d.gold as number,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 忽略
  }
}
