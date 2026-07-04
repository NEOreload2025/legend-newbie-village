import Phaser from 'phaser';
import { DUMMY_CONST } from '../data/ClassStats';
import { showDamageText } from '../utils/DamageText';
import type { DamageStyle, KillSource } from './Attackable';
import { playDeathShards } from '../utils/VisualEffects';
import { computeDamage } from '../systems/CombatSystem';
import type { Attackable } from './Attackable';

/** 訓練假人（§6）：HP 30、DEF 2、死亡 3 秒後原地重生 */
export class TrainingDummy extends Phaser.GameObjects.Sprite implements Attackable {
  hp: number = DUMMY_CONST.hp;
  readonly def: number = DUMMY_CONST.def;
  alive = true;

  /** 擊殺回呼：觸發經驗值發放（來源區分玩家/寵物） */
  private onKilled: (source: KillSource) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onKilled: (source: KillSource) => void,
  ) {
    super(scene, x, y, 'dummy');
    this.onKilled = onKilled;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  /** 承受一次攻擊；回傳實際造成的傷害 */
  receiveAttack(atk: number, source: KillSource, damageStyle: DamageStyle): number {
    if (!this.alive) return 0;
    const damage = computeDamage(atk, this.def);
    this.hp -= damage;

    showDamageText(this.scene, this.x, this.y - this.displayHeight * 0.6, damage, damageStyle);

    // 受擊：紅色 tint 閃 100ms
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(DUMMY_CONST.hitFlashMs, () => {
      if (this.alive) this.clearTint();
    });

    if (this.hp <= 0) this.die(source);
    return damage;
  }

  private die(source: KillSource): void {
    this.alive = false;
    this.hp = 0;

    // 碎片飛散、屍體半透明變灰
    playDeathShards(this.scene, this.x, this.y);
    this.setTint(0x777777);
    this.setAlpha(DUMMY_CONST.corpseAlpha);

    this.onKilled(source);

    // 3 秒後原地重生（滿血、外觀復原）
    this.scene.time.delayedCall(DUMMY_CONST.respawnMs, () => this.respawn());
  }

  private respawn(): void {
    this.hp = DUMMY_CONST.hp;
    this.alive = true;
    this.clearTint();
    this.setAlpha(1);
    // 重生小提示：短暫放大回彈
    this.setScale(0.7);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }
}
