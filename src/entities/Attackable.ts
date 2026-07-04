/** 共同可攻擊目標介面（§7） */
export type KillSource = 'player' | 'pet';
export type DamageStyle = 'normal' | 'mage';

export interface Attackable {
  x: number;
  y: number;
  alive: boolean;
  receiveAttack(atk: number, source: KillSource, damageStyle: DamageStyle): number;
}
