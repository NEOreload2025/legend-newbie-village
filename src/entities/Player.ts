import Phaser from 'phaser';
import { CLASS_STATS, GAME_CONST } from '../data/ClassStats';
import type { ClassId, ClassStats } from '../data/ClassStats';
import { gainXp } from '../systems/LevelSystem';
import type { LevelState } from '../systems/LevelSystem';
import { findNearestTarget } from '../systems/CombatSystem';
import { playAttackBounce, playAttackEffect, playLevelUpEffect } from '../utils/VisualEffects';
import type { TrainingDummy } from './TrainingDummy';

/** 玩家事件：HUD 訂閱以即時更新 */
export const PLAYER_EVENT_STATS_CHANGED = 'stats-changed';

/** 玩家角色（§3、§4、§5、§8） */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly classId: ClassId;
  readonly classStats: ClassStats;
  stats: LevelState;

  private lastAttackAt = -Infinity;
  /** click-to-move 目標點；null = 無 */
  private moveTarget: Phaser.Math.Vector2 | null = null;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  /**
   * 攻擊輸入以 keydown 事件旗標記錄，於 update 消化。
   * 不用 JustDown 輪詢：keydown+keyup 落在同一幀時（快速輕點）_justDown 會被 onUp 清掉而漏拍。
   */
  private attackQueued = false;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: ClassId) {
    super(scene, x, y, `player-${classId}`);
    this.classId = classId;
    this.classStats = CLASS_STATS[classId];
    this.stats = {
      level: 1,
      xp: 0,
      maxHp: this.classStats.hp,
      hp: this.classStats.hp,
      atk: this.classStats.atk,
      def: this.classStats.def,
    };

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);

    // Arcade body 約 18×22（含 offset），貼齊腳底
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 22);
    body.setOffset((this.width - 18) / 2, this.height - 22);
    this.setCollideWorldBounds(true);

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input plugin unavailable');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    keyboard.on('keydown-SPACE', () => {
      this.attackQueued = true;
    });
    keyboard.on('keydown-J', () => {
      this.attackQueued = true;
    });
  }

  /** 設定 click-to-move 目標點 */
  setMoveTarget(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);
  }

  override update(time: number, dummies: readonly TrainingDummy[]): void {
    this.updateMovement();
    this.updateAttack(time, dummies);
    this.setDepth(1000 + this.y);
  }

  private updateMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 八方向鍵盤輸入
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      // 鍵盤輸入立即打斷並清除 click-to-move 目標
      this.moveTarget = null;
      // 斜向以 1/√2 正規化
      const norm = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
      body.setVelocity(dx * GAME_CONST.moveSpeed * norm, dy * GAME_CONST.moveSpeed * norm);
      return;
    }

    if (this.moveTarget) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      if (dist < GAME_CONST.arriveDistance) {
        this.moveTarget = null;
        body.setVelocity(0, 0);
      } else {
        this.scene.physics.moveTo(this, this.moveTarget.x, this.moveTarget.y, GAME_CONST.moveSpeed);
      }
      return;
    }

    body.setVelocity(0, 0);
  }

  private updateAttack(time: number, dummies: readonly TrainingDummy[]): void {
    if (!this.attackQueued) return;
    this.attackQueued = false;
    if (time - this.lastAttackAt < this.classStats.attackCooldownMs) return;

    // 鎖定半徑 56px 內最近的存活假人
    const target = findNearestTarget(this, dummies, GAME_CONST.attackRange, (d) => d.alive);
    if (!target) return;

    this.lastAttackAt = time;
    playAttackBounce(this.scene, this);
    playAttackEffect(this.scene, this.classId, this.x, this.y - 14, target.x, target.y);
    target.receiveAttack(this.stats.atk, 'player', this.classId === 'mage' ? 'mage' : 'normal');
  }

  /** 親自擊殺假人 → 發放經驗值，可連升（§8） */
  gainKillXp(): void {
    const result = gainXp(this.stats, GAME_CONST.xpPerKill);
    this.stats = result.state;
    if (result.levelsGained > 0) {
      playLevelUpEffect(this.scene, this.x, this.y, this.stats.level);
    }
    this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);
  }
}
