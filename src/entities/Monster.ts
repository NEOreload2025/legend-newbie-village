import Phaser from 'phaser';
import {
  MONSTER_WANDER,
  MONSTER_HIT_FLASH_MS,
  MONSTER_FLEE_DURATION_MS,
  MONSTER_FLEE_SPEED_FACTOR,
  MONSTER_RETALIATE_DEAGGRO,
  type MonsterDef,
  type MonsterId,
} from '../data/MonsterStats';
import { showDamageText } from '../utils/DamageText';
import { playDeathShards } from '../utils/VisualEffects';
import { computeDamage } from '../systems/CombatSystem';
import type { Attackable, KillSource, DamageStyle } from './Attackable';
import type { Player } from './Player';

/** 通用怪物實體（TASK-005）：以 MonsterDef 驅動，取代原 Slime。
 * 支援 aggressive（主動追擊）、retaliate（被打才反擊）、passive（永不攻擊、被打逃跑）。
 * 完整搬遷原 Slime 所有行為：遊蕩半徑、受擊紅閃、傷害數字、死亡粒子+縮扁、原點重生、掉寶、depth、idle squash。
 */
export class Monster extends Phaser.Physics.Arcade.Sprite implements Attackable {
  readonly monsterId: MonsterId;
  hp: number;
  readonly def: number; // 防禦值，Attackable 相容
  alive = true;

  private readonly monsterDef: MonsterDef;
  private readonly targetPlayer: Player;
  private readonly onKilled: (source: KillSource) => void;
  private lastAttackAt = -Infinity;
  private readonly birthX: number;
  private readonly birthY: number;
  private idleTween: Phaser.Tweens.Tween | null = null;

  // 遊蕩狀態（TASK-003 搬遷）
  private nextWanderTime = 0;
  private wanderEndTime = 0;
  private wanderDirX = 0;
  private wanderDirY = 0;

  // retaliate 模式狀態
  private retaliating = false;

  // passive 逃跑狀態
  private fleeUntil = 0;
  private fleeDirX = 0;
  private fleeDirY = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: MonsterDef,
    targetPlayer: Player,
    onKilled: (source: KillSource) => void,
  ) {
    super(scene, x, y, def.textureKey);
    this.monsterDef = def;
    this.monsterId = def.id;
    this.hp = def.hp;
    this.def = def.def;
    this.targetPlayer = targetPlayer;
    this.onKilled = onKilled;
    this.birthX = x;
    this.birthY = y;

    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(def.bodyW, def.bodyH);
    body.setOffset((this.width - def.bodyW) / 2, this.height - def.bodyH);
    body.setCollideWorldBounds(true);

    this.setDepth(1000 + y);
    this.startIdleTween();
  }

  private startIdleTween(): void {
    // 待機輕微 squash & stretch（沿用）
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

  /** 選擇遊蕩方向：優先隨機方向，若預測會超出 radius 則朝出生點方向（搬遷自 Slime） */
  private chooseWanderDirection(): { dx: number; dy: number } {
    const speed = this.monsterDef.moveSpeed * MONSTER_WANDER.speedFactor;
    const stepDist = speed * (MONSTER_WANDER.durationMs / 1000);

    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const ex = this.x + dx * stepDist;
      const ey = this.y + dy * stepDist;
      if (Phaser.Math.Distance.Between(this.birthX, this.birthY, ex, ey) <= MONSTER_WANDER.radius) {
        return { dx, dy };
      }
    }

    let dx = this.birthX - this.x;
    let dy = this.birthY - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      const angle = Math.random() * Math.PI * 2;
      return { dx: Math.cos(angle), dy: Math.sin(angle) };
    }
    return { dx: dx / len, dy: dy / len };
  }

  /** 開始一次遊走 */
  private startWander(now: number): void {
    const dir = this.chooseWanderDirection();
    this.wanderDirX = dir.dx;
    this.wanderDirY = dir.dy;
    this.wanderEndTime = now + MONSTER_WANDER.durationMs;
    this.nextWanderTime =
      this.wanderEndTime +
      Phaser.Math.Between(MONSTER_WANDER.intervalMinMs, MONSTER_WANDER.intervalMaxMs);
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
    const def = this.monsterDef;
    const now = time;

    // 依模式計算當前意圖
    let isAttackingRange = false;
    let isChasing = false;

    if (def.aggroMode === 'aggressive') {
      isAttackingRange = dist <= def.attackRange;
      isChasing = dist <= def.aggroRange && !isAttackingRange;
    } else if (def.aggroMode === 'retaliate') {
      if (this.retaliating) {
        if (dist > MONSTER_RETALIATE_DEAGGRO) {
          this.retaliating = false;
        } else {
          isAttackingRange = dist <= def.attackRange;
          isChasing = !isAttackingRange;
        }
      }
    } else {
      // passive：永不主動
    }

    if (isAttackingRange && def.atk > 0) {
      body.setVelocity(0, 0);
      // 進入攻擊範圍立即中斷遊走
      this.wanderEndTime = 0;
      this.nextWanderTime = now + Phaser.Math.Between(MONSTER_WANDER.intervalMinMs, MONSTER_WANDER.intervalMaxMs);
      if (now - this.lastAttackAt >= def.attackIntervalMs) {
        this.lastAttackAt = now;
        this.doAttack();
      }
    } else if (isChasing) {
      // 以 moveSpeed 追向玩家
      this.scene.physics.moveTo(this, px, py, def.moveSpeed);
      this.wanderEndTime = 0;
      this.nextWanderTime = now + Phaser.Math.Between(MONSTER_WANDER.intervalMinMs, MONSTER_WANDER.intervalMaxMs);
    } else if (this.fleeUntil > now) {
      // 被動逃跑（速度 x2，1 秒）
      const speed = def.moveSpeed * MONSTER_FLEE_SPEED_FACTOR;
      body.setVelocity(this.fleeDirX * speed, this.fleeDirY * speed);
      this.wanderEndTime = 0;
      this.nextWanderTime = now + Phaser.Math.Between(MONSTER_WANDER.intervalMinMs, MONSTER_WANDER.intervalMaxMs);
    } else {
      // 閒置：遊蕩邏輯（完全沿用原實作）
      if (this.nextWanderTime <= 0) {
        this.nextWanderTime = now + Phaser.Math.Between(MONSTER_WANDER.intervalMinMs, MONSTER_WANDER.intervalMaxMs);
      }
      if (this.wanderEndTime > now) {
        const speed = def.moveSpeed * MONSTER_WANDER.speedFactor;
        body.setVelocity(this.wanderDirX * speed, this.wanderDirY * speed);
      } else if (now >= this.nextWanderTime) {
        this.startWander(now);
        const speed = def.moveSpeed * MONSTER_WANDER.speedFactor;
        body.setVelocity(this.wanderDirX * speed, this.wanderDirY * speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    this.setDepth(1000 + this.y);
  }

  private doAttack(): void {
    const def = this.monsterDef;
    if (def.atk <= 0) return;
    const dmg = computeDamage(def.atk, this.targetPlayer.stats.def);
    this.targetPlayer.takeDamage(dmg);
    showDamageText(this.scene, this.targetPlayer.x, this.targetPlayer.y - this.targetPlayer.displayHeight * 0.6, dmg, 'normal');
  }

  receiveAttack(atk: number, source: KillSource, damageStyle: DamageStyle): number {
    if (!this.alive) return 0;
    const damage = computeDamage(atk, this.def);
    this.hp -= damage;

    showDamageText(this.scene, this.x, this.y - this.displayHeight * 0.6, damage, damageStyle);

    // 受擊紅閃
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(MONSTER_HIT_FLASH_MS, () => {
      if (this.alive) this.clearTint();
    });

    const def = this.monsterDef;
    if (def.aggroMode === 'retaliate') {
      this.retaliating = true;
    } else if (def.aggroMode === 'passive') {
      this.startFlee();
    }

    if (this.hp <= 0) this.die(source);
    return damage;
  }

  private startFlee(): void {
    // 朝攻擊來向（玩家位置）的反方向逃
    let dx = this.x - this.targetPlayer.x;
    let dy = this.y - this.targetPlayer.y;
    const len = Math.hypot(dx, dy) || 0.001;
    this.fleeDirX = dx / len;
    this.fleeDirY = dy / len;
    this.fleeUntil = this.scene.time.now + MONSTER_FLEE_DURATION_MS;
  }

  private die(source: KillSource): void {
    this.alive = false;
    this.hp = 0;

    if (this.idleTween) {
      this.idleTween.pause();
    }

    // 重置狀態
    this.wanderEndTime = 0;
    this.nextWanderTime = 0;
    this.wanderDirX = 0;
    this.wanderDirY = 0;
    this.retaliating = false;
    this.fleeUntil = 0;

    // 粒子飛散 + 縮扁淡出（沿用）
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

    // 依 def 重生時間
    this.scene.time.delayedCall(this.monsterDef.respawnMs, () => this.respawn());
  }

  private respawn(): void {
    this.setPosition(this.birthX, this.birthY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.hp = this.monsterDef.hp;
    this.alive = true;
    this.clearTint();
    this.setAlpha(1);
    this.setScale(1, 1);

    // 重置計時與狀態
    this.wanderEndTime = 0;
    this.nextWanderTime = 0;
    this.wanderDirX = 0;
    this.wanderDirY = 0;
    this.retaliating = false;
    this.fleeUntil = 0;

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
