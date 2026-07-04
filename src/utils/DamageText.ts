import Phaser from 'phaser';

import type { DamageStyle } from '../entities/Attackable';
export type { DamageStyle };

/** 傷害跳字（§5）：目標頭上跳出、上飄後淡出；法師有專屬樣式 */
export function showDamageText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  style: DamageStyle = 'normal',
): void {
  const isMage = style === 'mage';
  const text = scene.add
    .text(x, y - 28, `${isMage ? '✦' : ''}${amount}`, {
      fontFamily: 'monospace',
      fontSize: isMage ? '20px' : '16px',
      fontStyle: 'bold',
      color: isMage ? '#66ccff' : '#ffdd44',
      stroke: isMage ? '#223388' : '#663300',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(5000);

  scene.tweens.add({
    targets: text,
    y: y - (isMage ? 64 : 52),
    alpha: 0,
    scale: isMage ? 1.35 : 1,
    duration: isMage ? 750 : 600,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** 拾取浮動文字（金幣綠字 / 藥水綠字）：上飄淡出 */
export function showPickupText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: string,
): void {
  const text = scene.add
    .text(x, y - 20, label, {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(5000);

  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}
