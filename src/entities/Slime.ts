import Phaser from 'phaser';
import { SLIME_CONST } from '../data/MonsterStats';
import { showDamageText } from '../utils/DamageText';
import { playDeathShards } from '../utils/VisualEffects';
import { computeDamage } from '../systems/CombatSystem';
import type { Attackable, KillSource, DamageStyle } from './Attackable';
import type { Player } from './Player';

/** 史萊姆怪物（§4）：追擊、近身攻擊、5秒重生、玩家/寵物可擊殺 */
export class Slime extends Phaser.Physics.Arcade.Sprite implements Attackable {
  hp: number = SLIME_CONST.hp;
  readonly def: number = SLIME_CONST.def;
  alive = true;

  private targetPlayer: Player;
  private onKilled: (source: KillSource) => void;
  private lastAttackAt = -Infinity;
  private birthX: number;
  private birthY: number;
  private idleTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetPlayer: Player,
    onKilled: (source: KillSource) => void,
  ) {
    super(scene, x, y, 'slime');
    this.targetPlayer = targetPlayer;
    this.onKilled = onKilled;
    this.birthX = x;
    this.birthY = y;

    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // body 約 18×12 貼齊腳底
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 12);
    body.setOffset((this.width - 18) / 2, this.height - 12);
    body.setCollideWorldBounds(true);

    this.setDepth(1000 + y);
    this.startIdleTween();
  }

  private startIdleTween(): void {
    // 待機輕微 squash & stretch
    this.idleTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 0.82,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  override update(time: number): void {
    if (!this.alive) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.setDepth(1000 + this.y);
      return;
    }

    const px = this.targetPlayer.x;
    const py = this.targetPlayer.y;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (dist <= SLIME_CONST.attackRange) {
      body.setVelocity(0, 0);
      if (time - this.lastAttackAt >= SLIME_CONST.attackIntervalMs) {
        this.lastAttackAt = time;
        this.doAttack();
      }
    } else if (dist <= SLIME_CONST.aggroRange) {
      // 以 moveSpeed 追向玩家
      this.scene.physics.moveTo(this, px, py, SLIME_CONST.moveSpeed);
    } else {
      body.setVelocity(0, 0);
    }

    this.setDepth(1000 + this.y);
  }

  private doAttack(): void {
    const dmg = computeDamage(SLIME_CONST.atk, this.targetPlayer.stats.def);
    this.targetPlayer.takeDamage(dmg);
    // 玩家頭上傷害數字（normal）+ 紅閃由 takeDamage 處理
    showDamageText(this.scene, this.targetPlayer.x, this.targetPlayer.y - this.targetPlayer.displayHeight * 0.6, dmg, 'normal');
  }

  receiveAttack(atk: number, source: KillSource, damageStyle: DamageStyle): number {
    if (!this.alive) return 0;
    const damage = computeDamage(atk, this.def);
    this.hp -= damage;

    showDamageText(this.scene, this.x, this.y - this.displayHeight * 0.6, damage, damageStyle);

    // 受擊紅閃
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(SLIME_CONST.hitFlashMs, () => {
      if (this.alive) this.clearTint();
    });

    if (this.hp <= 0) this.die(source);
    return damage;
  }

  private die(source: KillSource): void {
    this.alive = false;
    this.hp = 0;

    if (this.idleTween) {
      this.idleTween.pause();
    }

    // 粒子飛散 + 縮扁淡出
    playDeathShards(this.scene, this.x, this.y - 6);
    this.setTint(0x448833);
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.1,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
    });

    this.onKilled(source);

    // 原出生點 5s 重生
    this.scene.time.delayedCall(SLIME_CONST.respawnMs, () => this.respawn());
  }

  private respawn(): void {
    this.setPosition(this.birthX, this.birthY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.hp = SLIME_CONST.hp;
    this.alive = true;
    this.clearTint();
    this.setAlpha(1);
    this.setScale(1, 1);

    if (this.idleTween) {
      this.idleTween.resume();
    } else {
      this.startIdleTween();
    }

    // 重生小彈跳
    this.setScale(0.6, 0.3);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }
}
