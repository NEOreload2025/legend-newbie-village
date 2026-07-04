import Phaser from 'phaser';
import { LOOT_CONST } from '../data/LootStats';

/** 掉落物（金幣 / 紅藥水） */
export class LootDrop extends Phaser.GameObjects.Sprite {
  readonly lootType: 'gold' | 'potion';
  readonly value?: number; // 金幣價值，僅 gold 有

  constructor(
    scene: Phaser.Scene,
    baseX: number,
    baseY: number,
    type: 'gold' | 'potion',
    value?: number,
  ) {
    const key = type === 'gold' ? 'loot-gold' : 'loot-potion';
    // 死亡點為中心、scatterRadius 內隨機散落
    const r = LOOT_CONST.scatterRadius;
    const dx = (Math.random() - 0.5) * 2 * r;
    const dy = (Math.random() - 0.5) * 2 * r;
    const landX = baseX + dx;
    const landY = baseY + dy;

    super(scene, landX, landY, key);

    this.lootType = type;
    if (type === 'gold' && typeof value === 'number') {
      this.value = value;
    }

    this.setOrigin(0.5, 1);
    scene.add.existing(this);

    this.setDepth(1000 + landY);

    // 出現動畫：從死亡點稍上彈跳落地（小 tween）
    const popY = landY - 10;
    this.setPosition(landX, popY);
    this.setScale(0.4, 0.4);
    this.scene.tweens.add({
      targets: this,
      y: landY,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });

    // despawnMs 後淡出消失（若未拾取）
    this.scene.time.delayedCall(LOOT_CONST.despawnMs, () => {
      if (this.active && this.scene) {
        this.despawn();
      }
    });
  }

  /** 拾取動畫：上飄淡出後銷毀 */
  pickup(): void {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 18,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  private despawn(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
