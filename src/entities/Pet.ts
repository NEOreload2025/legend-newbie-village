import Phaser from 'phaser';
import { PET_CONST } from '../data/ClassStats';
import { findNearestTarget } from '../systems/CombatSystem';
import { playAttackBounce, playAttackEffect } from '../utils/VisualEffects';
import type { TrainingDummy } from './TrainingDummy';

/** 道士跟寵（§7）：跟隨主人左後方、每 2 秒自動攻擊 60px 內假人 */
export class Pet extends Phaser.GameObjects.Sprite {
  readonly atk: number = PET_CONST.atk;

  private owner: Phaser.GameObjects.Sprite;
  private dummies: readonly TrainingDummy[];
  private floatPhase = Math.random() * Math.PI * 2;
  /** 未加漂浮位移前的平滑 y（漂浮僅作用於顯示） */
  private smoothY: number;

  constructor(
    scene: Phaser.Scene,
    owner: Phaser.GameObjects.Sprite,
    dummies: readonly TrainingDummy[],
  ) {
    super(
      scene,
      owner.x + PET_CONST.followOffset.x,
      owner.y + PET_CONST.followOffset.y,
      'pet',
    );
    this.owner = owner;
    this.dummies = dummies;
    this.smoothY = this.y;
    this.setOrigin(0.5, 1);
    scene.add.existing(this);

    // 每 2000ms 自動攻擊
    scene.time.addEvent({
      delay: PET_CONST.attackIntervalMs,
      loop: true,
      callback: () => this.tryAttack(),
    });
  }

  override update(time: number): void {
    // lerp 0.08 平滑跟隨主人左後方
    const targetX = this.owner.x + PET_CONST.followOffset.x;
    const targetY = this.owner.y + PET_CONST.followOffset.y;
    this.x = Phaser.Math.Linear(this.x, targetX, PET_CONST.followLerp);
    this.smoothY = Phaser.Math.Linear(this.smoothY, targetY, PET_CONST.followLerp);
    // 輕微上下漂浮（僅顯示位移，不影響跟隨插值）
    this.y = this.smoothY + Math.sin(time / 350 + this.floatPhase) * 2.5;
    this.setDepth(1000 + this.smoothY);
  }

  private tryAttack(): void {
    const target = findNearestTarget(
      this,
      this.dummies,
      PET_CONST.attackRange,
      (d) => d.alive,
    );
    if (!target) return;

    playAttackBounce(this.scene, this);
    // 寵物攻擊沿用道士系綠色符彈特效與共用傷害公式
    playAttackEffect(this.scene, 'taoist', this.x, this.y - 8, target.x, target.y);
    target.receiveAttack(this.atk, 'pet', 'normal');
  }
}
