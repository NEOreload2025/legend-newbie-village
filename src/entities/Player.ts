import Phaser from 'phaser';
import { CLASS_STATS, GAME_CONST } from '../data/ClassStats';
import type { ClassId, ClassStats } from '../data/ClassStats';
import { gainXp } from '../systems/LevelSystem';
import type { LevelState } from '../systems/LevelSystem';
import { findNearestTarget } from '../systems/CombatSystem';
import { playAttackBounce, playAttackEffect, playLevelUpEffect } from '../utils/VisualEffects';
import { tileToWorld, PLAYER_SPAWN_TILE, TILE_H } from '../utils/IsoMap';
import type { Attackable } from './Attackable';

/** 玩家事件：HUD 訂閱以即時更新 */
export const PLAYER_EVENT_STATS_CHANGED = 'stats-changed';

/** 玩家角色（§3、§4、§5、§8） */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly classId: ClassId;
  readonly classStats: ClassStats;
  stats: LevelState;

  /** 金幣數量（TASK-002 掉寶拾取） */
  gold: number = 0;

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

  override update(time: number, targets: readonly Attackable[]): void {
    this.updateMovement();
    this.updateAttack(time, targets);
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

  private updateAttack(time: number, targets: readonly Attackable[]): void {
    if (!this.attackQueued) return;
    this.attackQueued = false;
    if (time - this.lastAttackAt < this.classStats.attackCooldownMs) return;

    // 鎖定半徑 56px 內最近的存活目標（假人 + 史萊姆）
    const target = findNearestTarget(this, targets, GAME_CONST.attackRange, (d) => d.alive);
    if (!target) return;

    this.lastAttackAt = time;
    playAttackBounce(this.scene, this);
    playAttackEffect(this.scene, this.classId, this.x, this.y - 14, target.x, target.y);
    target.receiveAttack(this.stats.atk, 'player', this.classId === 'mage' ? 'mage' : 'normal');
  }

  /** 親自擊殺 → 發放經驗值（假人 25 / 史萊姆 40），可連升（§8、slime §5） */
  gainKillXp(xpAmount: number): void {
    const result = gainXp(this.stats, xpAmount);
    this.stats = result.state;
    if (result.levelsGained > 0) {
      playLevelUpEffect(this.scene, this.x, this.y, this.stats.level);
    }
    this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);
  }

  /** 增加金幣並 emit 更新（拾取用） */
  addGold(value: number): void {
    if (value > 0) {
      this.gold += value;
      this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);
    }
  }

  /** 立即回血（藥水），回傳實際回復量；即使滿血仍消耗並拾取 */
  heal(amount: number): number {
    const prev = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    const actual = this.stats.hp - prev;
    this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);
    return actual;
  }

  /** 承受傷害（史萊姆反擊用）：扣 HP（最低 0）、emit、紅閃；歸零則復活 */
  takeDamage(amount: number): void {
    const prevHp = this.stats.hp;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);

    // 受擊紅 tint 閃 100ms（史萊姆攻擊）
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(100, () => {
      if (this.stats.hp > 0) this.clearTint();
    });

    if (this.stats.hp <= 0 && prevHp > 0) {
      this.handleDeathAndRevive();
    }
  }

  private handleDeathAndRevive(): void {
    // 傳送回出生點（tile 中心 +6，與建置一致）
    const { x, y } = tileToWorld(PLAYER_SPAWN_TILE.col, PLAYER_SPAWN_TILE.row);
    const groundY = y + TILE_H / 2;
    const spawnX = x;
    const spawnY = groundY + 6;

    this.setPosition(spawnX, spawnY);
    this.moveTarget = null;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.stats.hp = this.stats.maxHp;
    this.clearTint();
    this.emit(PLAYER_EVENT_STATS_CHANGED, this.stats);

    // 角色位置顯示「復活 Revived」浮動文字
    const text = this.scene.add
      .text(this.x, this.y - 40, '復活 Revived', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#aaffaa',
        stroke: '#003300',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(5000);
    this.scene.tweens.add({
      targets: text,
      y: this.y - 70,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
